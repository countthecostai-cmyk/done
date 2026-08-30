import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS, CATEGORY_LABELS } from "@/lib/support-ticket-state-machine";
import type { SupportTicket } from "@/lib/database.types";
import { MySupportTicketsRealtime } from "@/components/SupportRealtime";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<SupportTicket["status"], string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-neutral-100 text-neutral-500",
};

export default async function SupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/support");

  const { data } = await supabase
    .from("support_tickets")
    .select("*")
    .order("updated_at", { ascending: false });

  const tickets = (data as SupportTicket[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      <MySupportTicketsRealtime userId={user.id} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Support</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Account, billing, safety, or app issues — a real person on the Done team replies here.
          </p>
        </div>
        <Link
          href="/support/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New ticket
        </Link>
      </div>

      {tickets.length === 0 ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-6 text-sm text-neutral-500">
          You haven&apos;t contacted support yet. Something wrong with a task, your account, or a charge?{" "}
          <Link href="/support/new" className="font-medium text-neutral-900 underline">
            Open a ticket
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/support/${t.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{t.subject}</p>
                  <p className="text-sm text-neutral-500">
                    {CATEGORY_LABELS[t.category]} · opened {new Date(t.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[t.status]}`}
                >
                  {STATUS_LABELS[t.status]}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
