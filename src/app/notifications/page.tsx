import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { markAllNotificationsRead, markNotificationRead } from "@/app/notifications/actions";
import type { NotificationRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/notifications");

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const notifications = (data as NotificationRow[]) ?? [];
  const hasUnread = notifications.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {hasUnread && (
          <form action={markAllNotificationsRead}>
            <button className="text-sm font-medium text-neutral-500 underline hover:text-neutral-900">
              Mark all read
            </button>
          </form>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="text-sm text-neutral-500">You&apos;re all caught up.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          {notifications.map((n) => (
            <li key={n.id} className={`px-4 py-3 ${n.read_at ? "" : "bg-neutral-50"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-neutral-600">{n.body}</p>}
                  <p className="mt-1 text-xs text-neutral-500">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button className="whitespace-nowrap text-xs font-medium text-neutral-500 underline hover:text-neutral-900">
                      Mark read
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
