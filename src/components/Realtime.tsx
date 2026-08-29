"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subscribeToRequesterTasks, subscribeToTask } from "@/lib/realtime";

/**
 * Renders nothing — just keeps the current Server Component page fresh by
 * calling router.refresh() (debounced) whenever a relevant row changes.
 * "A customer should never have to manually refresh to see a status
 * change" — this is how that's satisfied without hand-duplicating server
 * query logic into client state.
 */
function useRefreshOn(subscribe: (onChange: () => void) => () => void, deps: unknown[]) {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => router.refresh(), 350);
    });
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return null;
}

/** Dashboard/history list: refresh when any of my requested tasks change. */
export function RequesterTasksRealtime({ userId }: { userId: string }) {
  return useRefreshOn(
    (onChange) => {
      const supabase = createClient();
      return subscribeToRequesterTasks(supabase, userId, onChange);
    },
    [userId]
  );
}

/** Task detail: refresh on status/assignment/photo/tip changes for this one task. */
export function TaskDetailRealtime({ taskId }: { taskId: string }) {
  return useRefreshOn(
    (onChange) => {
      const supabase = createClient();
      return subscribeToTask(supabase, taskId, onChange);
    },
    [taskId]
  );
}
