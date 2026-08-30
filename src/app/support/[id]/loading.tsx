import Link from "next/link";
import { SkeletonBar, SkeletonDetailHeader, SkeletonLines, SkeletonPage } from "@/components/Skeleton";

export default function SupportTicketLoading() {
  return (
    <SkeletonPage>
      <div className="mx-auto max-w-2xl space-y-6 px-6 py-10">
        <div>
          <p className="text-sm text-neutral-500">
            <Link href="/support" className="hover:underline">
              Support
            </Link>
          </p>
          <div className="mt-1">
            <SkeletonDetailHeader />
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-neutral-200 bg-white p-4">
          <SkeletonLines count={2} />
          <div className="border-t border-neutral-100 pt-4">
            <SkeletonLines count={3} />
          </div>
        </div>

        <SkeletonBar className="h-24 w-full rounded-lg" />
      </div>
    </SkeletonPage>
  );
}
