"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask, TransitionConflictError, IllegalTransitionError } from "@/lib/task-transitions";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Task } from "@/lib/database.types";

function friendlyError(e: unknown): string {
  if (e instanceof TransitionConflictError || e instanceof IllegalTransitionError) {
    return e.message;
  }
  console.error(e);
  return "Something went wrong. Please try again.";
}

// acceptTask/startTask are invoked directly as <form action> references (no
// local error UI), so per the Next.js data-security guidance for
// destructive/state-changing actions with no inline error display, failures
// throw (a loud failure) rather than returning a value — a value returned
// from a bare `<form action>` isn't rendered anywhere anyway, and Next's
// `action` prop type requires void | Promise<void>.

export async function acceptTask(taskId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const task = await transitionTask<Partial<Task>>(supabase, {
    taskId,
    from: "matching",
    to: "accepted",
    actor: "doer",
    changedByUser: user.id,
    extraPatch: { doer_id: user.id },
  });
  await notify(
    task.requester_id,
    "task_accepted",
    "A Doer accepted your task",
    "Your task has been claimed and will begin soon."
  );

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  redirect(`/tasks/${taskId}`);
}

export async function startTask(taskId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  await transitionTask(supabase, {
    taskId,
    from: "accepted",
    to: "in_progress",
    actor: "doer",
    changedByUser: user.id,
  });

  revalidatePath(`/tasks/${taskId}`);
}

export async function completeTask(
  taskId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: task } = await supabase
    .from("tasks")
    .select("requires_photo_proof")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };

  const photo = formData.get("photo") as File | null;
  const note = String(formData.get("note") ?? "").slice(0, 2000);

  // The Doer marking a task complete must never be sufficient on its own to
  // trigger payout — proof is required server-side, not just hinted at in
  // the UI (see payout trust gate in the architecture doc).
  if (task.requires_photo_proof && (!photo || photo.size === 0)) {
    return { error: "A completion photo is required for this task type." };
  }

  let completionPhotoUrl: string | null = null;
  if (photo && photo.size > 0) {
    const ext = photo.name.split(".").pop() ?? "jpg";
    const path = `${taskId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("task-photos")
      .upload(path, photo, { contentType: photo.type, upsert: false });
    if (uploadError) return { error: `Photo upload failed: ${uploadError.message}` };
    completionPhotoUrl = path;
  }

  try {
    const updated = await transitionTask<Partial<Task>>(supabase, {
      taskId,
      from: "in_progress",
      to: "completed",
      actor: "doer",
      changedByUser: user.id,
      note: note || undefined,
      extraPatch: {
        completion_photo_url: completionPhotoUrl,
        completion_note: note || null,
      },
    });
    await notify(
      updated.requester_id,
      "task_completed",
      "Your task is marked complete",
      "Review the completion photo and confirm to release payment."
    );
  } catch (e) {
    return { error: friendlyError(e) };
  }

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

/**
 * Requester-initiated confirmation. This is the ONLY thing that moves a
 * completed task toward payout — reaching "completed" never auto-triggers
 * it. Charges the Requester via Stripe Checkout; the webhook (on payment
 * success) initiates the Doer payout and completes the loop.
 */
export async function confirmCompletion(taskId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) throw new Error("Task not found.");

  const updated = (await transitionTask<Partial<Task>>(supabase, {
    taskId,
    from: "completed",
    to: "payout_pending",
    actor: "requester",
    changedByUser: user.id,
  })) as Task;

  let checkoutUrl: string;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: updated.currency,
            unit_amount: updated.price_cents,
            product_data: { name: updated.title },
          },
          quantity: 1,
        },
      ],
      metadata: { task_id: taskId },
      payment_intent_data: { metadata: { task_id: taskId } },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tasks/${taskId}?paid=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/tasks/${taskId}`,
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    checkoutUrl = session.url;

    const service = createServiceClient();
    await service.from("payments").upsert(
      {
        task_id: taskId,
        requester_id: updated.requester_id,
        stripe_payment_intent_id: (session.payment_intent as string) ?? null,
        amount_cents: updated.price_cents,
        currency: updated.currency,
        status: "pending",
      },
      { onConflict: "task_id" }
    );
  } catch (e) {
    console.error("Stripe checkout creation failed:", e);
    // The transition to payout_pending already succeeded — don't throw a
    // hard error over a payments-not-configured-yet condition. Redirect
    // back with a flag the task page turns into a banner explaining an
    // admin needs to resolve it once Stripe is connected.
    redirect(`/tasks/${taskId}?payment_error=1`);
  }

  redirect(checkoutUrl);
}

export async function reportCompletionProblem(
  taskId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) return { error: "Please describe the problem." };

  try {
    await transitionTask(supabase, {
      taskId,
      from: "completed",
      to: "disputed",
      actor: "requester",
      changedByUser: user.id,
      note: reason,
    });
    const { error: disputeError } = await supabase.from("disputes").insert({
      task_id: taskId,
      raised_by: user.id,
      reason,
    });
    if (disputeError) console.error(disputeError.message);
  } catch (e) {
    return { error: friendlyError(e) };
  }

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

export async function cancelTask(taskId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const reason = String(formData.get("reason") ?? "").trim();

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) return { error: "Task not found." };

  const actor = task.requester_id === user.id ? "requester" : "doer";

  try {
    await transitionTask(supabase, {
      taskId,
      from: task.status,
      to: "cancelled",
      actor,
      changedByUser: user.id,
      note: reason || undefined,
      extraPatch: { cancellation_reason: reason || null },
    });
  } catch (e) {
    return { error: friendlyError(e) };
  }

  revalidatePath(`/tasks/${taskId}`);
  revalidatePath("/dashboard");
  return {};
}
