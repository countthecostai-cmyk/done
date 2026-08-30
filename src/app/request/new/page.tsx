import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestTaskForm } from "@/components/RequestTaskForm";
import type { Category, TaskType, TaskTypeAddon } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type TaskTypeWithAddons = TaskType & { task_type_addons: TaskTypeAddon[] };

export default async function NewRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/request/new");

  const { data: categories } = await supabase
    .from("categories")
    .select("*, task_types(*, task_type_addons(*))")
    .eq("active", true)
    .order("sort_order");

  const categoriesWithTypes =
    (categories as (Category & { task_types: TaskTypeWithAddons[] })[] | null)?.map((c) => ({
      ...c,
      task_types: c.task_types
        .filter((t) => t.active)
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((t) => ({
          ...t,
          task_type_addons: t.task_type_addons
            .filter((a) => a.active)
            .sort((a, b) => a.sort_order - b.sort_order),
        })),
    })) ?? [];

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-1 text-2xl font-semibold">Request a task</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Categories and pricing come straight from the database — adding a new task type never requires a code change.
      </p>
      {categoriesWithTypes.every((c) => c.task_types.length === 0) ? (
        <p className="rounded-lg border border-neutral-200 bg-white p-4 text-sm text-neutral-500">
          No task types are configured yet. Once Supabase is connected and migrations are applied,
          Car Wash Pickup will show up here automatically.
        </p>
      ) : (
        <RequestTaskForm categories={categoriesWithTypes} />
      )}
    </div>
  );
}
