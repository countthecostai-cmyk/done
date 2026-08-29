"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask } from "@/lib/task-transitions";
import { notify } from "@/lib/notify";
import { revalidatePath } from "next/cache";

export async function resolveDispute(
  disputeId: string,
  taskId: string,
  resolution: "resolved_release" | "resolved_refund" | "resolved_other",
  note: string
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) throw new Error("Task not found.");

  const service = createServiceClient();

  if (resolution === "resolved_release") {
    // Route back into the normal payout path.
    await transitionTask(service, {
      taskId,
      from: "disputed",
      to: "payout_pending",
      actor: "admin",
      changedByUser: user.id,
      note: note || "Dispute resolved: released to Doer",
    });
  } else if (resolution === "resolved_refund") {
    await transitionTask(service, {
      taskId,
      from: "disputed",
      to: "refunded",
      actor: "admin",
      changedByUser: user.id,
      note: note || "Dispute resolved: refunded",
    });
  } else {
    await transitionTask(service, {
      taskId,
      from: "disputed",
      to: "cancelled",
      actor: "admin",
      changedByUser: user.id,
      note: note || "Dispute resolved",
    });
  }

  const { error } = await supabase
    .from("disputes")
    .update({
      status: resolution,
      resolution_note: note || null,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", disputeId);
  if (error) throw new Error(error.message);

  await notify(task.requester_id, "dispute_resolved", "Dispute resolved", note);
  if (task.doer_id) await notify(task.doer_id, "dispute_resolved", "Dispute resolved", note);

  revalidatePath("/admin/disputes");
}
