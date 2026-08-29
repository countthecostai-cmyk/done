import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveDispute } from "@/app/admin/disputes/actions";
import type { Dispute, Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Row = Dispute & { tasks: Task | null };

export default async function AdminDisputesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data } = await supabase
    .from("disputes")
    .select("*, tasks(*)")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const rows = (data as Row[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Open disputes</h1>
      <ul className="space-y-4">
        {rows.length === 0 && <p className="text-sm text-neutral-500">No open disputes.</p>}
        {rows.map((row) => (
          <li key={row.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <p className="font-medium">{row.tasks?.title ?? row.task_id}</p>
            <p className="mt-1 text-sm text-neutral-600">{row.reason}</p>
            <form
              action={resolveDispute.bind(null, row.id, row.task_id, "resolved_release", "Released to Doer")}
              className="mt-3 inline"
            >
              <button className="mr-2 rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                Release payout
              </button>
            </form>
            <form
              action={resolveDispute.bind(null, row.id, row.task_id, "resolved_refund", "Refunded Requester")}
              className="inline"
            >
              <button className="mr-2 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700">
                Refund Requester
              </button>
            </form>
            <form
              action={resolveDispute.bind(null, row.id, row.task_id, "resolved_other", "Cancelled")}
              className="inline"
            >
              <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                Cancel task
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
