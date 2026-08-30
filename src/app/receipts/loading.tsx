import { SkeletonPage, SkeletonTable } from "@/components/Skeleton";

export default function ReceiptsLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Receipts &amp; transaction history</h1>
        <SkeletonTable rows={6} cols={7} />
      </div>
    </SkeletonPage>
  );
}
