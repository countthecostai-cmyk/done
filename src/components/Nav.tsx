import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import type { Profile } from "@/lib/database.types";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    profile = data as Profile | null;
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
              {!profile?.is_doer && (
                <Link href="/doer/apply" className="text-neutral-600 hover:text-neutral-900">
                  Become a Doer
                </Link>
              )}
              {profile?.is_admin && (
                <Link href="/admin/doers" className="text-neutral-600 hover:text-neutral-900">
                  Admin
                </Link>
              )}
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
