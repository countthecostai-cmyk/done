"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask } from "@/lib/task-transitions";
import { redirect } from "next/navigation";
import { z } from "zod";

const createTaskSchema = z.object({
  task_type_id: z.string().uuid(),
  address: z.string().min(3, "Enter a valid address"),
  quantity: z.coerce.number().positive().optional(),
  description: z.string().max(2000).optional(),
});

export async function createTask(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const parsed = createTaskSchema.safeParse({
    task_type_id: formData.get("task_type_id"),
    address: formData.get("address"),
    quantity: formData.get("quantity") || undefined,
    description: formData.get("description") || undefined,
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
      quantity: parsed.data.quantity ?? null,
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
