import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setDoerStatus } from "@/app/admin/doers/actions";
import type { DoerProfile, Profile } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Row = DoerProfile & { profiles: Pick<Profile, "full_name" | "id"> | null };

export default async function AdminDoersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) redirect("/dashboard");

  const { data } = await supabase
    .from("doer_profiles")
    .select("*, profiles(id, full_name)")
    .order("applied_at", { ascending: true });

  const rows = (data as Row[]) ?? [];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">Doer applications</h1>
      <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {rows.length === 0 && <li className="p-4 text-sm text-neutral-500">No applications yet.</li>}
        {rows.map((row) => (
          <li key={row.user_id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{row.profiles?.full_name ?? row.user_id}</p>
              <p className="text-sm text-neutral-500">
                {row.bio || "No bio provided"} · status: {row.status}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={setDoerStatus.bind(null, row.user_id, "approved")}>
                <button className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700">
                  Approve
                </button>
              </form>
              <form action={setDoerStatus.bind(null, row.user_id, "rejected")}>
                <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
                  Reject
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
