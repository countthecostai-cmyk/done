import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { transitionTask } from "@/lib/task-transitions";
import { notify } from "@/lib/notify";
import { totalDoerPayoutCents } from "@/lib/pricing";

export const dynamic = "force-dynamic";

/**
 * Finalizes the pay -> payout leg of the loop. Nothing here trusts the
 * client: this only reacts to Stripe-signed events. A Doer marking a task
 * complete never reaches this file directly — only a Requester's confirmed,
 * successfully-charged payment does.
 */
export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotency: Stripe can and will redeliver events.
  const { error: dedupeError } = await supabase
    .from("processed_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (dedupeError) {
    // unique violation => already processed
    return NextResponse.json({ received: true, deduped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const taskId = session.metadata?.task_id;
        if (!taskId) break;

        await supabase
          .from("payments")
          .update({
            status: "succeeded",
            stripe_payment_intent_id: (session.payment_intent as string) ?? null,
          })
          .eq("task_id", taskId);

        const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).maybeSingle();
        if (!task || !task.doer_id) break;

        const { data: doerAccount } = await supabase
          .from("doer_stripe_accounts")
          .select("*")
          .eq("user_id", task.doer_id)
          .maybeSingle();

        // 100% of the tip is Doer-owned, on top of their fee-split payout —
        // see tasks.tip_cents (0006) and the comment on payouts.amount_cents.
        const payoutAmountCents = totalDoerPayoutCents(task.doer_payout_cents, task.tip_cents ?? 0);

        await supabase.from("payouts").upsert(
          {
            task_id: taskId,
            doer_id: task.doer_id,
            amount_cents: payoutAmountCents,
            currency: task.currency,
            status: "pending",
          },
          { onConflict: "task_id" }
        );

        if (doerAccount?.payouts_enabled) {
          try {
            const transfer = await stripe.transfers.create({
              amount: payoutAmountCents,
              currency: task.currency,
              destination: doerAccount.stripe_account_id,
              transfer_group: taskId,
              metadata: { task_id: taskId },
            });
            await supabase
              .from("payouts")
              .update({ status: "paid", stripe_transfer_id: transfer.id })
              .eq("task_id", taskId);

            await transitionTask(supabase, {
              taskId,
              from: "payout_pending",
              to: "payout_completed",
              actor: "system",
              changedByUser: null,
            });
            await notify(
              task.doer_id,
              "payout_sent",
              "You've been paid",
              `Your payout for "${task.title}" is on its way.`
            );
            await notify(
              task.requester_id,
              "task_paid",
              "Payment complete",
              `Your task "${task.title}" is done.`
            );
          } catch (transferErr) {
            console.error("Stripe transfer failed:", transferErr);
            await supabase
              .from("payouts")
              .update({
                status: "failed",
                failure_message:
                  transferErr instanceof Error ? transferErr.message : "Transfer failed",
              })
              .eq("task_id", taskId);
            // Task stays in payout_pending — an admin resolves it. Payment
            // already succeeded, so this is never silently lost.
          }
        } else {
          await supabase
            .from("payouts")
            .update({
              failure_message: "Doer has not finished Stripe Connect onboarding yet.",
            })
            .eq("task_id", taskId);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const taskId = pi.metadata?.task_id;
        if (!taskId) break;
        await supabase
          .from("payments")
          .update({
            status: "failed",
            failure_message: pi.last_payment_error?.message ?? "Payment failed",
          })
          .eq("task_id", taskId);
        break;
      }

      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        await supabase
          .from("doer_stripe_accounts")
          .update({
            charges_enabled: !!account.charges_enabled,
            payouts_enabled: !!account.payouts_enabled,
            details_submitted: !!account.details_submitted,
          })
          .eq("stripe_account_id", account.id);
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("Stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
