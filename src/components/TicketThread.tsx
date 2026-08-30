"use client";

import { useActionState } from "react";
import { sendTicketMessage, closeMyTicket, reopenMyTicket } from "@/app/support/actions";

export function TicketReplyForm({ ticketId }: { ticketId: string }) {
  const boundAction = async (prevState: { error?: string } | undefined, formData: FormData) =>
    sendTicketMessage(ticketId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      <label htmlFor="body" className="block text-sm font-medium text-neutral-900">
        Reply
      </label>
      <textarea
        id="body"
        name="body"
        required
        maxLength={4000}
        rows={4}
        placeholder="Add more detail or reply to Done Support…"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send"}
      </button>
    </form>
  );
}

/** Shown only while status === "resolved" — the ticket creator's two self-service moves. */
export function TicketResolutionActions({ ticketId }: { ticketId: string }) {
  const reopenAction = async (prevState: { error?: string } | undefined, formData: FormData) =>
    reopenMyTicket(ticketId, formData);
  const [reopenState, reopenFormAction, reopenPending] = useActionState(reopenAction, undefined);

  return (
    <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
      <p className="text-sm font-medium text-green-800">Marked resolved — did this fix it?</p>
      <form
        action={() => {
          void closeMyTicket(ticketId);
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700"
        >
          Yes, close this ticket
        </button>
      </form>
      <form action={reopenFormAction} className="flex flex-wrap items-center gap-2">
        <input
          name="note"
          type="text"
          placeholder="What's still wrong? (optional)"
          className="min-w-[220px] flex-1 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <button
          type="submit"
          disabled={reopenPending}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {reopenPending ? "Reopening…" : "No, reopen it"}
        </button>
      </form>
      {reopenState?.error && <p className="text-sm text-red-600">{reopenState.error}</p>}
    </div>
  );
}
