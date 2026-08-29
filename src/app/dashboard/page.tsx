import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Task, TaskType } from "@/lib/database.types";
import { ACTIVE_TASK_STATUSES, STATUS_LABELS } from "@/lib/task-state-machine";
import { formatCents } from "@/lib/pricing";
import { RequesterTasksRealtime } from "@/components/Realtime";

export const dynamic = "force-dynamic";

type TaskWithType = Task & { task_types: Pick<TaskType, "name" | "slug"> | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [{ data: profile }, { data: myRequests }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*, task_types(name, slug)")
      .eq("requester_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const tasks = (myRequests as TaskWithType[]) ?? [];
  const active = tasks.filter((t) => ACTIVE_TASK_STATUSES.includes(t.status));
  const past = tasks.filter((t) => !ACTIVE_TASK_STATUSES.includes(t.status));

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <RequesterTasksRealtime userId={user.id} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Hi {(profile as Profile | null)?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
        <Link
          href="/request/new"
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New request
        </Link>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-medium">Active tasks</h2>
        <TaskList tasks={active} emptyLabel="Nothing active right now." />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Past tasks</h2>
          <Link href="/receipts" className="text-sm font-medium text-neutral-900 underline">
            Receipts &amp; history
          </Link>
        </div>
        <TaskList tasks={past.slice(0, 5)} emptyLabel="You haven't completed anything yet." />
      </section>
    </div>
  );
}

function TaskList({ tasks, emptyLabel }: { tasks: TaskWithType[]; emptyLabel: string }) {
  if (tasks.length === 0) {
    return <p className="text-sm text-neutral-500">{emptyLabel}</p>;
  }
  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            href={`/tasks/${task.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-neutral-50"
          >
            <div>
              <p className="font-medium text-neutral-900">
                {task.task_types?.name ?? task.title}
              </p>
              <p className="text-sm text-neutral-500">{task.address}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-neutral-900">
                {formatCents(task.price_cents + task.tip_cents, task.currency)}
              </p>
              <p className="text-xs text-neutral-500">{STATUS_LABELS[task.status]}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
