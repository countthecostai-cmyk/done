import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import { NotificationBell } from "@/components/NotificationBell";
import type { NotificationRow, Profile } from "@/lib/database.types";

const DOER_APP_URL = process.env.NEXT_PUBLIC_DOER_APP_URL;

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  let notifications: NotificationRow[] = [];
  if (user) {
    const [{ data: profileData }, { data: notificationData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    profile = profileData as Profile | null;
    notifications = (notificationData as NotificationRow[]) ?? [];
  }

  return (
    <header className="border-b border-neutral-200 bg-white">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
          Done
        </Link>
        <div className="flex items-center gap-4 text-sm">
          {user ? (
            <>
              <Link href="/dashboard" className="text-neutral-600 hover:text-neutral-900">
                Dashboard
              </Link>
              <Link href="/request/new" className="text-neutral-600 hover:text-neutral-900">
                Request a task
              </Link>
              <Link href="/receipts" className="text-neutral-600 hover:text-neutral-900">
                Receipts
              </Link>
              <Link href="/support" className="text-neutral-600 hover:text-neutral-900">
                Support
              </Link>
              {!profile?.is_doer && DOER_APP_URL && (
                <a
                  href={DOER_APP_URL}
                  className="text-neutral-600 hover:text-neutral-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Become a Doer
                </a>
              )}
              <NotificationBell userId={user.id} initialNotifications={notifications} />
              <form action={signOut}>
                <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-50">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="text-neutral-600 hover:text-neutral-900">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-lg bg-neutral-900 px-3 py-1.5 text-white hover:bg-neutral-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
