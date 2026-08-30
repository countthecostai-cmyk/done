"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  subscribeToMySupportTickets,
  subscribeToSupportTicket,
  subscribeToSupportTicketMessages,
} from "@/lib/realtime";

/**
 * Renders nothing — refreshes the current Server Component page (debounced)
 * whenever a relevant support-ticket row changes. Same "never make someone
 * manually refresh to see a reply" rule as TaskDetailRealtime/
 * RequesterTasksRealtime in components/Realtime.tsx, split into its own
 * file since it's shared verbatim across Done and Doer (which don't share
 * a components/Realtime.tsx today) but not needed in Done Admin, which has
 * no client-side realtime wiring anywhere yet.
 */
function useDebouncedRefresh() {
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  return () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => router.refresh(), 350);
  };
}

/** Support inbox list: refresh when any of my own tickets change (new reply, status change). */
export function MySupportTicketsRealtime({ userId }: { userId: string }) {
  const refresh = useDebouncedRefresh();

  useEffect(() => {
    const supabase = createClient();
    return subscribeToMySupportTickets(supabase, userId, refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return null;
}

/** Ticket detail: refresh on status/assignment changes and new messages in this thread. */
export function SupportTicketRealtime({ ticketId }: { ticketId: string }) {
  const refresh = useDebouncedRefresh();

  useEffect(() => {
    const supabase = createClient();
    const unsubTicket = subscribeToSupportTicket(supabase, ticketId, refresh);
    const unsubMessages = subscribeToSupportTicketMessages(supabase, ticketId, refresh);
    return () => {
      unsubTicket();
      unsubMessages();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  return null;
}
