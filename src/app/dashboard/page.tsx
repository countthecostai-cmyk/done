import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { DoerProfile, Profile, Task, TaskType } from "@/lib/database.types";
import { STATUS_LABELS } from "@/lib/task-state-machine";
import { formatCents } from "@/lib/pricing";

export const dynamic = "force-dynamic";

type TaskWithType = Task & { task_types: Pick<TaskType, "name" | "slug"> | null };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: doerProfile } = await supabase
    .from("doer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: myRequests } = await supabase
    .from("tasks")
    .select("*, task_types(name, slug)")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const isApprovedDoer = (doerProfile as DoerProfile | null)?.status === "approved";

  let openPool: TaskWithType[] = [];
  let myClaimed: TaskWithType[] = [];
  if (isApprovedDoer) {
    const [pool, claimed] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, task_types(name, slug)")
        .eq("status", "matching")
        .is("doer_id", null)
        .order("created_at", { ascending: true }),
      supabase
        .from("tasks")
        .select("*, task_types(name, slug)")
        .eq("doer_id", user.id)
        .order("created_at", { ascending: false }),
    ]);
    openPool = (pool.data as TaskWithType[]) ?? [];
    myClaimed = (claimed.data as TaskWithType[]) ?? [];
  }

  return (
    <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold">
          Hi {(profile as Profile | null)?.full_name?.split(" ")[0] ?? "there"} 👋
        </h1>
      </div>

      {isApprovedDoer && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium">Open tasks near you</h2>
          </div>
          <TaskList tasks={openPool} emptyLabel="No open tasks right now — check back soon." />
        </section>
      )}

      {isApprovedDoer && myClaimed.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-medium">Your claimed tasks</h2>
          <TaskList tasks={myClaimed} emptyLabel="Nothing claimed yet." />
        </section>
      )}

      {!isApprovedDoer && doerProfile && (doerProfile as DoerProfile).status === "pending" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your Doer application is pending review.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium">Your requested tasks</h2>
          <Link href="/request/new" className="text-sm font-medium text-neutral-900 underline">
            + New request
          </Link>
        </div>
        <TaskList
          tasks={(myRequests as TaskWithType[]) ?? []}
          emptyLabel="You haven't requested anything yet."
        />
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
                {formatCents(task.price_cents, task.currency)}
              </p>
              <p className="text-xs text-neutral-500">{STATUS_LABELS[task.status]}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
