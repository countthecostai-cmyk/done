"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask, TransitionConflictError, IllegalTransitionError } from "@/lib/task-transitions";
import { notify } from "@/lib/notify";
import { getStripe } from "@/lib/stripe";
import { totalChargeCents } from "@/lib/pricing";
import { computeDiscountCents, normalizePromoCode, promoEligibilityError } from "@/lib/promo";
import { PROMO_LOCKED_STATUSES } from "@/lib/task-state-machine";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Promotion, Task } from "@/lib/database.types";

function friendlyError(e: unknown): string {
  if (e instanceof TransitionConflictError || e instanceof IllegalTransitionError) {
    return e.message;
  }
  console.error(e);
  return "Something went wrong. Please try again.";
}

/**
 * Requester-only actions. This is the Done (customer) app — accepting,
 * starting, and marking a task complete are Doer actions and live in the
 * Doer app instead (both write to the same shared `tasks` table via the
 * same `transitionTask()` state machine, so either app moving a task
 * forward is immediately visible in the other via Realtime).
 */

/**
 * Set (or update) a tip. Only legal while the task is `completed` — after
 * the work is done and proof is in, before Confirm & Pay — and only by the
 * Requester; `tasks_lock_tip_trg` (0006) enforces this again at the DB
 * level, this is just the UX-layer check. 100% of the tip goes to the Doer.
 */
export async function setTip(taskId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const raw = String(formData.get("tip_dollars") ?? "").trim();
  const dollars = Number(raw);
  if (raw === "" || !Number.isFinite(dollars) || dollars < 0) {
    return { error: "Enter a valid tip amount." };
  }
  const tipCents = Math.round(dollars * 100);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, requester_id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };
  if (task.requester_id !== user.id) return { error: "Only the Requester can set a tip." };
  if (task.status !== "completed") {
    return { error: "Tips can only be set after the task is marked complete, before you pay." };
  }

  const { error } = await supabase.from("tasks").update({ tip_cents: tipCents }).eq("id", taskId);
  if (error) return { error: error.message };

  if (tipCents > 0) {
    const { data: fresh } = await supabase.from("tasks").select("doer_id, title").eq("id", taskId).maybeSingle();
    if (fresh?.doer_id) {
      await notify(
        fresh.doer_id,
        "tip_added",
        "You got a tip!",
        `A ${(tipCents / 100).toFixed(2)} tip was added for "${fresh.title}".`
      );
    }
  }

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

/**
 * Apply a promo code to a task before paying. The AUTHORITATIVE checks
 * (redemption caps, per-user limit, expiry, min subtotal) live in the
 * database — enforce_promotion_limits() locks the promotion row so two
 * concurrent redemptions of a nearly-exhausted code can't both slip past
 * the cap (0011_promotions.sql). Everything here is the same read-only
 * pre-check done with the Requester's own RLS-scoped client (no service
 * role — mirrors the service-area gate in request/actions.ts), purely so a
 * predictable, common failure returns a friendly message instead of a raw
 * Postgres exception.
 */
export async function applyPromoCode(taskId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const rawCode = String(formData.get("promo_code") ?? "").trim();
  if (!rawCode) return { error: "Enter a promo code." };
  const code = normalizePromoCode(rawCode);

  const { data: task } = await supabase
    .from("tasks")
    .select("id, requester_id, status, price_cents, promo_code")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };
  if (task.requester_id !== user.id) return { error: "Only the Requester can apply a promo code." };
  if (PROMO_LOCKED_STATUSES.includes(task.status)) {
    return { error: "This task can no longer have a promo code applied." };
  }
  if (task.promo_code) {
    return { error: "Remove the current code before applying a different one." };
  }

  const { data: promo } = await supabase.from("promotions").select("*").eq("code", code).maybeSingle();
  if (!promo) return { error: "That promo code isn't valid." };

  const ineligible = promoEligibilityError(promo as Promotion, task.price_cents);
  if (ineligible) return { error: ineligible };

  const { count: userRedemptions } = await supabase
    .from("promotion_redemptions")
    .select("id", { count: "exact", head: true })
    .eq("promotion_id", promo.id)
    .eq("user_id", user.id);
  if ((userRedemptions ?? 0) >= promo.per_user_limit) {
    return { error: "You've already used this code the maximum number of times." };
  }
  if (promo.max_redemptions != null) {
    const { count: totalRedemptions } = await supabase
      .from("promotion_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("promotion_id", promo.id);
    if ((totalRedemptions ?? 0) >= promo.max_redemptions) {
      return { error: "This code has reached its redemption limit." };
    }
  }

  const discountCents = computeDiscountCents(promo as Promotion, task.price_cents);

  const { error: redeemError } = await supabase.from("promotion_redemptions").insert({
    promotion_id: promo.id,
    task_id: taskId,
    user_id: user.id,
    discount_cents: discountCents,
  });
  if (redeemError) {
    if (redeemError.code === "23505") return { error: "This task already has a promo code applied." };
    return { error: redeemError.message || "Could not apply that code." };
  }

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ promo_code: code, discount_cents: discountCents })
    .eq("id", taskId);
  if (updateError) {
    // Redemption row is in but the task update failed — surface it rather
    // than silently leaving a redeemed-but-unapplied code. Extremely rare
    // (the lock trigger would only fire here if status changed mid-request).
    return { error: updateError.message };
  }

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

export async function removePromoCode(taskId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { data: task } = await supabase
    .from("tasks")
    .select("id, requester_id")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };
  if (task.requester_id !== user.id) return { error: "Only the Requester can remove a promo code." };

  const { error: deleteError } = await supabase.from("promotion_redemptions").delete().eq("task_id", taskId);
  if (deleteError) return { error: deleteError.message };

  const { error: updateError } = await supabase
    .from("tasks")
    .update({ promo_code: null, discount_cents: 0 })
    .eq("id", taskId);
  if (updateError) return { error: updateError.message };

  revalidatePath(`/tasks/${taskId}`);
  return {};
}

/**
 * Requester-initiated confirmation. This is the ONLY thing that moves a
 * completed task toward payout — reaching "completed" never auto-triggers
 * it. Charges the Requester (price + tip) via Stripe Checkout; the webhook
 * (on payment success) initiates the Doer payout (their fee-split cut +
 * 100% of the tip) and completes the loop.
 */
export async function confirmCompletion(taskId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
  if (!task) throw new Error("Task not found.");

  const updated = (await transitionTask<Partial<Task>>(supabase, {
    taskId,
    from: "completed",
    to: "payout_pending",
    actor: "requester",
    changedByUser: user.id,
  })) as Task;

  const chargeCents = totalChargeCents(updated.price_cents, updated.tip_cents, updated.discount_cents);

  let checkoutUrl: string;
  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: updated.currency,
            unit_amount: chargeCents,
            product_data: {
              name: [
                updated.title,
                updated.discount_cents > 0 ? `promo ${updated.promo_code ?? ""} applied` : null,
                updated.tip_cents > 0 ? "incl. tip" : null,
              ]
                .filter(Boolean)
                .join(" — "),
            },
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
        amount_cents: chargeCents,
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
  if (task.requester_id !== user.id) return { error: "Only the Requester can cancel here." };

  try {
    await transitionTask(supabase, {
      taskId,
      from: task.status,
      to: "cancelled",
      actor: "requester",
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

/**
 * Rate & review the Doer once the loop is fully done (payout_completed —
 * money has actually moved, not just "confirmed"). One review per task,
 * enforced by the `reviews` table's unique constraint (0001); a duplicate
 * insert surfaces as a friendly "already reviewed" error, not a crash.
 */
export async function rateDoer(taskId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const rating = Number(formData.get("rating"));
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 2000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Pick a rating from 1 to 5." };
  }

  const { data: task } = await supabase
    .from("tasks")
    .select("id, requester_id, doer_id, status")
    .eq("id", taskId)
    .maybeSingle();
  if (!task) return { error: "Task not found." };
  if (task.requester_id !== user.id) return { error: "Only the Requester can rate this task." };
  if (!task.doer_id) return { error: "This task has no Doer to rate." };
  if (task.status !== "payout_completed") {
    return { error: "You can rate once the task is fully paid out." };
  }

  const { error } = await supabase.from("reviews").insert({
    task_id: taskId,
    rater_id: user.id,
    ratee_id: task.doer_id,
    rating,
    comment: comment || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already reviewed this task." };
    return { error: error.message };
  }

  await notify(task.doer_id, "new_review", "You got a new rating", `${rating}/5 stars.`);

  revalidatePath(`/tasks/${taskId}`);
  return {};
}
