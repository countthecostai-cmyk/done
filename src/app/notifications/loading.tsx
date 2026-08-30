import { SkeletonList, SkeletonPage } from "@/components/Skeleton";

export default function NotificationsLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-lg px-6 py-10">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Notifications</h1>
        </div>
        <SkeletonList rows={4} />
      </div>
    </SkeletonPage>
  );
}
