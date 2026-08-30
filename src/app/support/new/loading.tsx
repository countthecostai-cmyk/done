import { SkeletonField, SkeletonPage } from "@/components/Skeleton";

export default function NewSupportTicketLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-xl space-y-6 px-6 py-10">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">New support ticket</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tell us what&apos;s going on — we usually reply within a day.
          </p>
        </div>
        <div className="space-y-4">
          <SkeletonField labelWidth="w-20" />
          <SkeletonField labelWidth="w-16" />
          <SkeletonField labelWidth="w-28" />
        </div>
      </div>
    </SkeletonPage>
  );
}
