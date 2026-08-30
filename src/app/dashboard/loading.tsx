import { SkeletonBar, SkeletonList, SkeletonPage, SkeletonSectionHeading } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-4xl space-y-10 px-6 py-10">
        <div className="flex items-center justify-between">
          <SkeletonBar className="h-8 w-40" />
          <SkeletonBar className="h-9 w-32 rounded-lg" />
        </div>

        <section>
          <SkeletonSectionHeading className="mb-3" />
          <SkeletonList rows={3} />
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <SkeletonSectionHeading />
            <SkeletonBar className="h-4 w-28" />
          </div>
          <SkeletonList rows={3} />
        </section>
      </div>
    </SkeletonPage>
  );
}
