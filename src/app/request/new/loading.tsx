import { SkeletonBar, SkeletonPage } from "@/components/Skeleton";

export default function NewRequestLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Request a task</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Categories and pricing come straight from the database — adding a new task type never requires
          a code change.
        </p>
        <div className="mb-4 flex gap-2" aria-hidden="true">
          <SkeletonBar className="h-8 w-24 rounded-full" />
          <SkeletonBar className="h-8 w-20 rounded-full" />
          <SkeletonBar className="h-8 w-28 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden="true">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-neutral-200 bg-white p-4">
              <SkeletonBar className="mb-2 h-4 w-32" />
              <SkeletonBar className="h-3 w-full" />
            </div>
          ))}
        </div>
      </div>
    </SkeletonPage>
  );
}
