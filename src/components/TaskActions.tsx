"use client";

import { useActionState, useState } from "react";
import {
  acceptTask,
  startTask,
  completeTask,
  confirmCompletion,
  reportCompletionProblem,
  cancelTask,
} from "@/app/tasks/actions";
import type { TaskStatus } from "@/lib/task-state-machine";

export function TaskActions({
  taskId,
  status,
  requiresPhotoProof,
  isRequester,
  isAssignedDoer,
  canClaim,
}: {
  taskId: string;
  status: TaskStatus;
  requiresPhotoProof: boolean;
  isRequester: boolean;
  isAssignedDoer: boolean;
  canClaim: boolean;
}) {
  const [reportingProblem, setReportingProblem] = useState(false);

  if (canClaim && status === "matching") {
    return (
      <form action={acceptTask.bind(null, taskId)}>
        <button className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          Accept this task
        </button>
      </form>
    );
  }

  if (isAssignedDoer && status === "accepted") {
    return (
      <form action={startTask.bind(null, taskId)}>
        <button className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800">
          Start task
        </button>
      </form>
    );
  }

  if (isAssignedDoer && status === "in_progress") {
    return <CompleteForm taskId={taskId} requiresPhotoProof={requiresPhotoProof} />;
  }

  if (isRequester && status === "completed") {
    return (
      <div className="space-y-3">
        <form action={confirmCompletion.bind(null, taskId)}>
          <button className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            Confirm & pay
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

  if (
    (isRequester || isAssignedDoer) &&
    ["requested", "matching", "accepted", "scheduled", "en_route", "arrived"].includes(status)
  ) {
    return <CancelForm taskId={taskId} />;
  }

  return null;
}

function CompleteForm({
  taskId,
  requiresPhotoProof,
}: {
  taskId: string;
  requiresPhotoProof: boolean;
}) {
  const boundAction = async (
    prevState: { error?: string } | undefined,
    formData: FormData
  ) => completeTask(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-sm font-medium text-neutral-900">Mark this task complete</p>
      <div>
        <label className="block text-xs font-medium text-neutral-600" htmlFor="photo">
          {requiresPhotoProof ? "Completion photo (required)" : "Completion photo (optional)"}
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          capture="environment"
          required={requiresPhotoProof}
          className="mt-1 w-full text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-600" htmlFor="note">
          Note (optional)
        </label>
        <textarea id="note" name="note" rows={2} className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Mark complete"}
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
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
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
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
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
