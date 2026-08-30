"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask } from "@/lib/task-transitions";
import { isZipInServiceArea } from "@/lib/service-area";
import type { ServiceArea } from "@/lib/database.types";
import { redirect } from "next/navigation";
import { z } from "zod";

const createTaskSchema = z.object({
  task_type_id: z.string().uuid(),
  address: z.string().min(3, "Enter a valid address"),
  zip_code: z.string().regex(/^\d{5}$/, "Enter a valid 5-digit ZIP code"),
  quantity: z.coerce.number().positive().optional(),
  description: z.string().max(2000).optional(),
  selected_addon_ids: z.array(z.string().uuid()).default([]),
});

export async function createTask(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = createTaskSchema.safeParse({
    task_type_id: formData.get("task_type_id"),
    address: formData.get("address"),
    zip_code: formData.get("zip_code"),
    quantity: formData.get("quantity") || undefined,
    description: formData.get("description") || undefined,
    selected_addon_ids: formData.getAll("selected_addon_ids"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: taskType, error: taskTypeError } = await supabase
    .from("task_types")
    .select("id, name, active")
    .eq("id", parsed.data.task_type_id)
    .maybeSingle();
  if (taskTypeError || !taskType || !taskType.active) {
    return { error: "That task type is not available." };
  }

  // Service-area gate: zero active rows means the platform hasn't
  // configured launch markets yet, so every zip is allowed (see
  // service-area.ts for why unconfigured must mean open, not blocked).
  // Read with the requester's own RLS-scoped client — service_areas_select
  // grants "active = true" rows to anyone, so this needs no service role.
  const { data: activeServiceAreas } = await supabase
    .from("service_areas")
    .select("zip_codes")
    .eq("active", true);
  const areas = (activeServiceAreas as Pick<ServiceArea, "zip_codes">[] | null) ?? [];
  if (!isZipInServiceArea(parsed.data.zip_code, areas)) {
    return { error: "Done isn't available in your area yet." };
  }

  // Never trust client-submitted addon ids as-is: keep only ids that are
  // real, active add-ons belonging to *this* task type. This also protects
  // the denormalized selected_addon_ids stored on the task from carrying
  // stale/mismatched ids even though compute_task_pricing() would ignore
  // them anyway (it joins on task_type_id) — data integrity, not just price.
  let selectedAddonIds: string[] = [];
  if (parsed.data.selected_addon_ids.length > 0) {
    const { data: validAddons } = await supabase
      .from("task_type_addons")
      .select("id")
      .eq("task_type_id", taskType.id)
      .eq("active", true)
      .in("id", parsed.data.selected_addon_ids);
    selectedAddonIds = (validAddons ?? []).map((a) => a.id);
  }

  // price_cents / platform_fee_cents / doer_payout_cents are placeholders —
  // the tasks_recompute_pricing trigger overwrites them authoritatively on
  // insert from task_type + quantity + addons. Never trust these values.
  const { data: task, error: insertError } = await supabase
    .from("tasks")
    .insert({
      requester_id: user.id,
      task_type_id: taskType.id,
      title: taskType.name,
      description: parsed.data.description ?? null,
      address: parsed.data.address,
      zip_code: parsed.data.zip_code,
      quantity: parsed.data.quantity ?? null,
      selected_addon_ids: selectedAddonIds,
      price_cents: 0,
      platform_fee_cents: 0,
      doer_payout_cents: 0,
    })
    .select()
    .single();

  if (insertError || !task) {
    return { error: insertError?.message ?? "Could not create task." };
  }

  await supabase.from("task_status_history").insert({
    task_id: task.id,
    status: "requested",
    changed_by_actor: "requester",
    changed_by_user: user.id,
  });

  // No quoting step for flat-priced task types yet — publish immediately.
  // This is a genuine system transition, so it goes through the
  // service-role client rather than the requester's RLS-scoped session.
  const service = createServiceClient();
  try {
    await transitionTask(service, {
      taskId: task.id,
      from: "requested",
      to: "matching",
      actor: "system",
      changedByUser: null,
    });
  } catch (e) {
    console.error("auto-publish to matching failed:", e);
  }

  redirect(`/tasks/${task.id}`);
}
