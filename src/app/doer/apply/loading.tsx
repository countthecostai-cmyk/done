import { SkeletonBar, SkeletonCard, SkeletonPage } from "@/components/Skeleton";

export default function DoerApplyLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-lg px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Become a Doer</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Approved Doers see every open task in the pool — no toggle required to make jobs visible.
        </p>
        <SkeletonBar className="mb-3 h-4 w-48" />
        <SkeletonCard />
      </div>
    </SkeletonPage>
  );
}
