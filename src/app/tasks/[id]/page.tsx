import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TaskActions } from "@/components/TaskActions";
import { STATUS_LABELS, type TaskStatus } from "@/lib/task-state-machine";
import { formatCents } from "@/lib/pricing";
import type { DoerProfile, Profile, Task, TaskStatusHistoryRow, TaskType } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ payment_error?: string; paid?: string }>;
}) {
  const { id } = await params;
  const { payment_error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/tasks/${id}`);

  const { data: taskData } = await supabase
    .from("tasks")
    .select("*, task_types(*), requester:profiles!tasks_requester_id_fkey(*), doer:profiles!tasks_doer_id_fkey(*)")
    .eq("id", id)
    .maybeSingle();

  if (!taskData) notFound();

  const task = taskData as unknown as Task & {
    task_types: TaskType | null;
    requester: Profile | null;
    doer: Profile | null;
  };

  const { data: doerProfile } = await supabase
    .from("doer_profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  const isApprovedDoer = (doerProfile as DoerProfile | null)?.status === "approved";

  const { data: history } = await supabase
    .from("task_status_history")
    .select("*")
    .eq("task_id", id)
    .order("created_at", { ascending: true });

  let photoUrl: string | null = null;
  if (task.completion_photo_url) {
    const { data: signed } = await supabase.storage
      .from("task-photos")
      .createSignedUrl(task.completion_photo_url, 3600);
    photoUrl = signed?.signedUrl ?? null;
  }

  const isRequester = task.requester_id === user.id;
  const isAssignedDoer = task.doer_id === user.id;
  const canClaim = isApprovedDoer && !task.doer_id;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      {payment_error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          This task is confirmed, but payment couldn&apos;t be started automatically (Stripe isn&apos;t
          connected yet). An admin will need to resolve payment for this task manually.
        </div>
      )}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{task.task_types?.name ?? task.title}</h1>
          <p className="text-sm text-neutral-500">{task.address}</p>
        </div>
        <span className="rounded-full bg-neutral-900 px-3 py-1 text-xs font-medium text-white">
          {STATUS_LABELS[task.status]}
        </span>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
        <div>
          <p className="text-neutral-500">Price</p>
          <p className="font-medium">{formatCents(task.price_cents, task.currency)}</p>
        </div>
        <div>
          <p className="text-neutral-500">Doer payout</p>
          <p className="font-medium">{formatCents(task.doer_payout_cents, task.currency)}</p>
        </div>
        <div>
          <p className="text-neutral-500">Requester</p>
          <p className="font-medium">{task.requester?.full_name ?? "—"}</p>
        </div>
        <div>
          <p className="text-neutral-500">Doer</p>
          <p className="font-medium">{task.doer?.full_name ?? "Unclaimed"}</p>
        </div>
      </div>

      {task.description && (
        <p className="mb-6 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-700">{task.description}</p>
      )}

      {photoUrl && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-neutral-700">Completion photo</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Completion proof" className="w-full rounded-lg border border-neutral-200" />
          {task.completion_note && <p className="mt-2 text-sm text-neutral-600">{task.completion_note}</p>}
        </div>
      )}

      <div className="mb-6">
        <TaskActions
          taskId={task.id}
          status={task.status}
          requiresPhotoProof={task.requires_photo_proof}
          isRequester={isRequester}
          isAssignedDoer={isAssignedDoer}
          canClaim={canClaim}
        />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-neutral-700">Timeline</h2>
        <ol className="space-y-3 border-l border-neutral-200 pl-4">
          {((history as TaskStatusHistoryRow[]) ?? []).map((h) => (
            <li key={h.id} className="text-sm">
              <p className="font-medium text-neutral-900">{STATUS_LABELS[h.status as TaskStatus] ?? h.status}</p>
              <p className="text-xs text-neutral-500">
                {new Date(h.created_at).toLocaleString()} · {h.changed_by_actor}
              </p>
              {h.note && <p className="text-xs text-neutral-600">{h.note}</p>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
