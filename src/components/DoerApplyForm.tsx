"use client";

import { useActionState } from "react";
import { applyToBeDoer } from "@/app/doer/apply/actions";

export function DoerApplyForm() {
  const [state, formAction, pending] = useActionState(applyToBeDoer, undefined);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700" htmlFor="bio">
          A little about you (optional)
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={4}
          placeholder="What kind of tasks are you great at?"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Apply to be a Doer"}
      </button>
    </form>
  );
}
