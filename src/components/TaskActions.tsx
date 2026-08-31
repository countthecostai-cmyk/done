"use client";

import { useActionState, useState } from "react";
import { confirmCompletion, reportCompletionProblem, cancelTask, setTip, rateDoer } from "@/app/tasks/actions";
import type { TaskStatus } from "@/lib/task-state-machine";

const REQUESTER_CANCELLABLE: TaskStatus[] = [
  "requested",
  "matching",
  "quoted",
  "accepted",
  "scheduled",
  "en_route",
  "arrived",
];

export function TaskActions({
  taskId,
  status,
  isRequester,
  tipCents,
  alreadyReviewed,
}: {
  taskId: string;
  status: TaskStatus;
  isRequester: boolean;
  tipCents: number;
  alreadyReviewed: boolean;
}) {
  const [reportingProblem, setReportingProblem] = useState(false);

  if (!isRequester) return null;

  if (status === "completed") {
    return (
      <div className="space-y-3">
        <TipForm taskId={taskId} tipCents={tipCents} />
        <form action={confirmCompletion.bind(null, taskId)}>
          <button className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            Confirm &amp; pay
          </button>
        </form>
        {!reportingProblem ? (
          <button
            onClick={() => setReportingProblem(true)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Something&apos;s wrong
          </button>
        ) : (
          <ReportProblemForm taskId={taskId} onCancel={() => setReportingProblem(false)} />
        )}
      </div>
    );
  }

  if (status === "payout_completed" && !alreadyReviewed) {
    return <RateForm taskId={taskId} />;
  }

  if (REQUESTER_CANCELLABLE.includes(status)) {
    return <CancelForm taskId={taskId} />;
  }

  return null;
}

function TipForm({ taskId, tipCents }: { taskId: string; tipCents: number }) {
  const boundAction = async (prevState: { error?: string } | undefined, formData: FormData) =>
    setTip(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      <label className="block text-sm font-medium text-neutral-900" htmlFor="tip_dollars">
        {tipCents > 0 ? "Update tip for your Doer" : "Add a tip for your Doer (optional)"}
      </label>
      <p className="text-xs text-neutral-500">100% of the tip goes to your Doer.</p>
      <div className="flex gap-2">
        <input
          id="tip_dollars"
          name="tip_dollars"
          type="number"
          min="0"
          step="0.01"
          defaultValue={tipCents > 0 ? (tipCents / 100).toFixed(2) : ""}
          placeholder="0.00"
          className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save tip"}
        </button>
      </div>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function RateForm({ taskId }: { taskId: string }) {
  const boundAction = async (prevState: { error?: string } | undefined, formData: FormData) =>
    rateDoer(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [rating, setRating] = useState(5);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium text-neutral-900">Rate your Doer</p>
      <input type="hidden" name="rating" value={rating} />
      <div className="flex gap-1 text-2xl">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={n <= rating ? "text-amber-500" : "text-neutral-300"}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        name="comment"
        rows={2}
        placeholder="Leave a comment (optional)"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit rating"}
      </button>
    </form>
  );
}

function ReportProblemForm({ taskId, onCancel }: { taskId: string; onCancel: () => void }) {
  const boundAction = async (
    prevState: { error?: string } | undefined,
    formData: FormData
  ) => reportCompletionProblem(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <textarea
        name="reason"
        rows={2}
        required
        placeholder="What went wrong?"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          {pending ? "Submitting…" : "Report problem"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </form>
  );
}

function CancelForm({ taskId }: { taskId: string }) {
  const boundAction = async (
    prevState: { error?: string } | undefined,
    formData: FormData
  ) => cancelTask(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-500 hover:bg-neutral-50"
      >
        Cancel task
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      <input
        name="reason"
        type="text"
        placeholder="Reason (optional)"
        className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
      />
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
      >
        {pending ? "Cancelling…" : "Confirm cancel"}
      </button>
    </form>
  );
}
