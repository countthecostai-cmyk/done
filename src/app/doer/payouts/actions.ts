"use server";

import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { redirect } from "next/navigation";

/**
 * Starts (or resumes) Stripe Connect Express onboarding for a Doer's payout
 * destination. The account row is created via the Doer's own RLS-scoped
 * session (they own the row); charges_enabled/payouts_enabled/
 * details_submitted are locked to webhook-only updates by RLS trigger.
 */
export async function startConnectOnboarding(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("You must be signed in.");

  const { data: existing } = await supabase
    .from("doer_stripe_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const stripe = getStripe();

  let accountId = existing?.stripe_account_id as string | undefined;

  if (!accountId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    const account = await stripe.accounts.create({
      type: "express",
      email: authUser?.email,
      business_type: "individual",
      capabilities: {
        transfers: { requested: true },
      },
      metadata: { done_user_id: user.id, full_name: profile?.full_name ?? "" },
    });
    accountId = account.id;

    const { error: insertError } = await supabase.from("doer_stripe_accounts").insert({
      user_id: user.id,
      stripe_account_id: accountId,
    });
    if (insertError) throw new Error(insertError.message);
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${process.env.NEXT_PUBLIC_SITE_URL}/doer/payouts`,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/doer/payouts?onboarded=1`,
    type: "account_onboarding",
  });

  redirect(accountLink.url);
}
