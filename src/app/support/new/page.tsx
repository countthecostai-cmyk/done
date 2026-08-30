import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewTicketForm } from "@/components/NewTicketForm";
import type { Task } from "@/lib/database.types";

export const dynamic = "force-dynamic";

export default async function NewSupportTicketPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/support/new");

  const { data: tasksData } = await supabase
    .from("tasks")
    .select("id, title, created_at")
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false })
    .limit(25);

  const tasks = (tasksData as Pick<Task, "id" | "title" | "created_at">[]) ?? [];

  return (
    <div className="mx-auto max-w-xl space-y-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">New support ticket</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Tell us what&apos;s going on — we usually reply within a day.
        </p>
      </div>
      <NewTicketForm tasks={tasks} />
    </div>
  );
}
