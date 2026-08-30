import { SkeletonBar, SkeletonDetailHeader, SkeletonLines, SkeletonPage } from "@/components/Skeleton";

export default function TaskDetailLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6">
          <SkeletonDetailHeader />
        </div>

        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <SkeletonLines count={3} />
        </div>

        <div className="mt-6 space-y-3">
          <SkeletonBar className="h-4 w-32" />
          <SkeletonBar className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </SkeletonPage>
  );
}
