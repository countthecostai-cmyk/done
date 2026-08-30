import { SkeletonList, SkeletonPage } from "@/components/Skeleton";

export default function SupportLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-neutral-900">Support</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Account, billing, safety, or app issues — a real person on the Done team replies here.
            </p>
          </div>
        </div>
        <SkeletonList rows={3} />
      </div>
    </SkeletonPage>
  );
}
