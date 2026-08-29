import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DoerApplyForm } from "@/components/DoerApplyForm";
import type { DoerProfile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function DoerApplyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/doer/apply");

  const { data: doerProfile } = await supabase
    .from("doer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = doerProfile as DoerProfile | null;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Become a Doer</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Approved Doers see every open task in the pool — no toggle required to make jobs visible.
      </p>

      {profile ? (
        <StatusCard status={profile.status} />
      ) : (
        <DoerApplyForm />
      )}
    </div>
  );
}

function StatusCard({ status }: { status: DoerProfile["status"] }) {
  const copy: Record<DoerProfile["status"], { title: string; body: string; tone: string }> = {
    pending: {
      title: "Application pending",
      body: "We're reviewing your application. This is usually quick.",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    },
    approved: {
      title: "You're an approved Doer 🎉",
      body: "Head to your dashboard to see open tasks, and connect payouts.",
      tone: "border-green-200 bg-green-50 text-green-800",
    },
    rejected: {
      title: "Application not approved",
      body: "Reach out to support if you think this was a mistake.",
      tone: "border-red-200 bg-red-50 text-red-800",
    },
    suspended: {
      title: "Account suspended",
      body: "Your Doer account is currently suspended.",
      tone: "border-red-200 bg-red-50 text-red-800",
    },
  };
  const c = copy[status];
  return <div className={`rounded-lg border px-4 py-3 text-sm ${c.tone}`}>
    <p className="font-medium">{c.title}</p>
    <p>{c.body}</p>
  </div>;
}
