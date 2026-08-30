"use client";

import { useActionState } from "react";
import { applyPromoCode, removePromoCode } from "@/app/tasks/actions";
import { formatCents } from "@/lib/pricing";

export function PromoCodeForm({
  taskId,
  promoCode,
  discountCents,
  currency,
}: {
  taskId: string;
  promoCode: string | null;
  discountCents: number;
  currency: string;
}) {
  if (promoCode) {
    return <AppliedPromo taskId={taskId} promoCode={promoCode} discountCents={discountCents} currency={currency} />;
  }
  return <ApplyPromoForm taskId={taskId} />;
}

function ApplyPromoForm({ taskId }: { taskId: string }) {
  const boundAction = async (prevState: { error?: string } | undefined, formData: FormData) =>
    applyPromoCode(taskId, formData);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form action={formAction} className="space-y-2 rounded-lg border border-neutral-200 bg-white p-4">
      <label className="block text-sm font-medium text-neutral-900" htmlFor="promo_code">
        Have a promo code?
      </label>
      <div className="flex gap-2">
        <input
          id="promo_code"
          name="promo_code"
          type="text"
          placeholder="PROMOCODE"
          className="w-40 rounded-lg border border-neutral-300 px-3 py-2 text-sm uppercase"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {pending ? "Applying…" : "Apply"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}

function AppliedPromo({
  taskId,
  promoCode,
  discountCents,
  currency,
}: {
  taskId: string;
  promoCode: string;
  discountCents: number;
  currency: string;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- useActionState requires this shape
  const boundAction = async (prevState: { error?: string } | undefined) => removePromoCode(taskId);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  return (
    <form
      action={formAction}
      className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-3"
    >
      <p className="text-sm text-green-800">
        Code <span className="font-mono font-semibold">{promoCode}</span> applied — {formatCents(discountCents, currency)}{" "}
        off
      </p>
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-green-800 underline hover:no-underline disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
