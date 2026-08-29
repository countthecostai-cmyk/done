"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sendMessage(
  taskId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message can't be empty." };
  if (body.length > 4000) return { error: "Message is too long." };

  const { data: task } = await supabase
    .from("tasks")
    .select("requester_id, doer_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task || !task.doer_id) return { error: "This task has no assigned Doer to message." };

  const recipientId = task.doer_id === user.id ? task.requester_id : task.doer_id;

  const { error } = await supabase.from("messages").insert({
    task_id: taskId,
    sender_id: user.id,
    recipient_id: recipientId,
    body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

export async function markMessageRead(messageId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("id", messageId);
}
