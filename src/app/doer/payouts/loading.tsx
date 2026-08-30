import { SkeletonCard, SkeletonPage } from "@/components/Skeleton";

export default function PayoutsLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-lg px-6 py-10">
        <h1 className="mb-1 text-2xl font-semibold">Payouts</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Connect a bank account so Done can pay you after a Requester confirms your work.
        </p>
        <SkeletonCard />
      </div>
    </SkeletonPage>
  );
}
