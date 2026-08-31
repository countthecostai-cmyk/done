import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/lib/task-state-machine";
import { formatCents } from "@/lib/pricing";
import type { Payment, Task, TaskType } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type TaskWithExtras = Task & {
  task_types: Pick<TaskType, "name"> | null;
  payments: Payment[];
};

/** Full transaction history — every task this Requester has ever paid (or attempted to pay) for. */
export default async function ReceiptsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/receipts");

  const { data } = await supabase
    .from("tasks")
    .select("*, task_types(name), payments(*)")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const tasks = (data as unknown as TaskWithExtras[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Receipts &amp; transaction history</h1>

      {tasks.length === 0 ? (
        <p className="text-sm text-neutral-500">No transactions yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium">Task</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 font-medium">Tip</th>
                <th className="px-4 py-2 font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Payment status</th>
                <th className="px-4 py-2 font-medium">Task status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {tasks.map((task) => {
                const payment = task.payments?.[0] ?? null;
                return (
                  <tr key={task.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-3 text-neutral-500">
                      {new Date(task.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/tasks/${task.id}`} className="font-medium text-neutral-900 underline">
                        {task.task_types?.name ?? task.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{formatCents(task.price_cents, task.currency)}</td>
                    <td className="px-4 py-3">
                      {task.tip_cents > 0 ? formatCents(task.tip_cents, task.currency) : "—"}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {formatCents(task.price_cents + task.tip_cents, task.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {payment ? (
                        <span
                          className={
                            payment.status === "succeeded"
                              ? "text-green-700"
                              : payment.status === "failed"
                                ? "text-red-700"
                                : "text-neutral-500"
                          }
                        >
                          {payment.status}
                        </span>
                      ) : (
                        <span className="text-neutral-500">not charged</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{STATUS_LABELS[task.status]}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
