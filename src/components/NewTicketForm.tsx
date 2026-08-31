"use client";

import { useActionState } from "react";
import { createTicket } from "@/app/support/actions";
import { CATEGORY_LABELS, type SupportTicketCategory } from "@/lib/support-ticket-state-machine";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as SupportTicketCategory[];

export function NewTicketForm({ tasks }: { tasks: { id: string; title: string; created_at: string }[] }) {
  const [state, formAction, pending] = useActionState(createTicket, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-5">
      <div>
        <label htmlFor="category" className="mb-1 block text-sm font-medium text-neutral-900">
          Category
        </label>
        <select
          id="category"
          name="category"
          defaultValue="other"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </div>

      {tasks.length > 0 && (
        <div>
          <label htmlFor="related_task_id" className="mb-1 block text-sm font-medium text-neutral-900">
            Related task <span className="font-normal text-neutral-400">(optional)</span>
          </label>
          <select
            id="related_task_id"
            name="related_task_id"
            defaultValue=""
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Not related to a specific task</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} — {new Date(t.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label htmlFor="subject" className="mb-1 block text-sm font-medium text-neutral-900">
          Subject
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          maxLength={200}
          placeholder="Short summary of the issue"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="body" className="mb-1 block text-sm font-medium text-neutral-900">
          Details
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={4000}
          rows={6}
          placeholder="What happened? Include as much detail as you can."
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit ticket"}
      </button>
    </form>
  );
}
