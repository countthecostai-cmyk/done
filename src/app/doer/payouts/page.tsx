import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { startConnectOnboarding } from "@/app/doer/payouts/actions";
import type { DoerStripeAccount } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/doer/payouts");

  const { data } = await supabase
    .from("doer_stripe_accounts")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const account = data as DoerStripeAccount | null;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Payouts</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Connect a bank account so Done can pay you after a Requester confirms your work.
      </p>

      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        {account?.payouts_enabled ? (
          <p className="text-sm font-medium text-green-700">✅ Payouts are enabled.</p>
        ) : account ? (
          <>
            <p className="mb-4 text-sm text-amber-700">
              Your Stripe account exists but onboarding isn&apos;t finished yet.
            </p>
            <form action={startConnectOnboarding}>
              <button className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
                Finish onboarding
              </button>
            </form>
          </>
        ) : (
          <form action={startConnectOnboarding}>
            <button className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
              Connect payouts with Stripe
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
