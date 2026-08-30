import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupportTicket, SupportTicketMessage, Task } from "@/lib/database.types";
import { STATUS_LABELS, CATEGORY_LABELS } from "@/lib/support-ticket-state-machine";
import { SupportTicketRealtime } from "@/components/SupportRealtime";
import { TicketReplyForm, TicketResolutionActions } from "@/components/TicketThread";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<SupportTicket["status"], string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-neutral-100 text-neutral-500",
};

export default async function SupportTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/support/${id}`);

  const [{ data: ticketData }, { data: messagesData }] = await Promise.all([
    supabase.from("support_tickets").select("*").eq("id", id).maybeSingle(),
    supabase.from("support_ticket_messages").select("*").eq("ticket_id", id).order("created_at"),
  ]);

  const ticket = ticketData as SupportTicket | null;
  if (!ticket) notFound();

  let relatedTask: Pick<Task, "id" | "title"> | null = null;
  if (ticket.related_task_id) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title")
      .eq("id", ticket.related_task_id)
      .maybeSingle();
    relatedTask = data as Pick<Task, "id" | "title"> | null;
  }

  // RLS already hides internal notes from a non-admin; this is a belt-and-
  // suspenders filter so a page revalidation between the two queries above
  // can never flash one through.
  const messages = ((messagesData as SupportTicketMessage[]) ?? []).filter((m) => !m.is_internal_note);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
      <SupportTicketRealtime ticketId={id} />

      <div>
        <p className="text-sm text-neutral-500">
          <Link href="/support" className="hover:underline">
            Support
          </Link>{" "}
          / {CATEGORY_LABELS[ticket.category]}
        </p>
        <div className="mt-1 flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold text-neutral-900">{ticket.subject}</h1>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_TONE[ticket.status]}`}>
            {STATUS_LABELS[ticket.status]}
          </span>
        </div>
        {relatedTask && (
          <p className="mt-1 text-sm text-neutral-500">Related task: {relatedTask.title}</p>
        )}
      </div>

      <ul className="space-y-3">
        {messages.map((m) => (
          <li
            key={m.id}
            className={`rounded-lg border p-3 text-sm ${
              m.sender_role === "admin" ? "border-neutral-200 bg-neutral-50" : "border-blue-100 bg-blue-50"
            }`}
          >
            <p className="mb-1 text-xs font-medium text-neutral-500">
              {m.sender_role === "admin" ? "Done Support" : "You"} · {new Date(m.created_at).toLocaleString()}
            </p>
            <p className="whitespace-pre-wrap text-neutral-900">{m.body}</p>
          </li>
        ))}
      </ul>

      {ticket.status === "resolved" && <TicketResolutionActions ticketId={ticket.id} />}

      {ticket.status !== "closed" ? (
        <TicketReplyForm ticketId={ticket.id} />
      ) : (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-500">
          This ticket is closed.
        </p>
      )}
    </div>
  );
}
