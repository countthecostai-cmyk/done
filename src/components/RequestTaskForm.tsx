"use client";

import { useActionState, useMemo, useState } from "react";
import { createTask } from "@/app/request/actions";
import { estimatePriceCents, formatCents } from "@/lib/pricing";
import type { Category, TaskType } from "@/lib/database.types";

export function RequestTaskForm({
  categories,
}: {
  categories: (Category & { task_types: TaskType[] })[];
}) {
  const allTypes = useMemo(() => categories.flatMap((c) => c.task_types), [categories]);
  const [taskTypeId, setTaskTypeId] = useState(allTypes[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [state, formAction, pending] = useActionState(createTask, undefined);

  const selectedType = allTypes.find((t) => t.id === taskTypeId);
  const estimate = selectedType
    ? estimatePriceCents(selectedType, quantity, 0)
    : 0;
  const needsQuantity =
    selectedType?.pricing_model === "hourly" ||
    selectedType?.pricing_model === "quantity" ||
    selectedType?.pricing_model === "distance";

  return (
    <form action={formAction} className="space-y-5 rounded-lg border border-neutral-200 bg-white p-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700">Task type</label>
        <div className="mt-2 space-y-4">
          {categories.map((category) =>
            category.task_types.length === 0 ? null : (
              <div key={category.id}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {category.icon} {category.name}
                </p>
                <div className="grid gap-2">
                  {category.task_types.map((type) => (
                    <label
                      key={type.id}
                      className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                        taskTypeId === type.id
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200"
                      }`}
                    >
                      <span>
                        <span className="font-medium">{type.name}</span>
                        {type.description && (
                          <span className="block text-xs text-neutral-500">{type.description}</span>
                        )}
                      </span>
                      <input
                        type="radio"
                        name="task_type_id"
                        value={type.id}
                        checked={taskTypeId === type.id}
                        onChange={() => setTaskTypeId(type.id)}
                        className="h-4 w-4"
                      />
                    </label>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {needsQuantity && (
        <div>
          <label className="block text-sm font-medium text-neutral-700" htmlFor="quantity">
            {selectedType?.unit_label ? `Number of ${selectedType.unit_label}s` : "Quantity"}
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            step="0.5"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="mt-1 w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-neutral-700" htmlFor="address">
          Address
        </label>
        <input
          id="address"
          name="address"
          type="text"
          required
          placeholder="123 Main St, Austin, TX"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700" htmlFor="description">
          Notes for your Doer (optional)
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
        <span className="text-sm text-neutral-600">Estimated price</span>
        <span className="text-lg font-semibold">{formatCents(estimate)}</span>
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || !taskTypeId}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Request task"}
      </button>
    </form>
  );
}
