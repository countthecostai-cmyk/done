"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToNotifications } from "@/lib/realtime";
import { markNotificationRead } from "@/app/notifications/actions";
import type { NotificationRow } from "@/lib/database.types";

export function NotificationBell({
  userId,
  initialNotifications,
}: {
  userId: string;
  initialNotifications: NotificationRow[];
}) {
  const [notifications, setNotifications] = useState<NotificationRow[]>(initialNotifications);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const unsubscribe = subscribeToNotifications<NotificationRow>(supabase, userId, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
      } else if (payload.eventType === "UPDATE" && payload.new) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === payload.new!.id ? { ...n, ...payload.new } : n))
        );
      }
    });
    return unsubscribe;
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-lg p-1.5 text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-neutral-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-2">
            <span className="text-sm font-medium text-neutral-900">Notifications</span>
            <Link href="/notifications" className="text-xs font-medium text-neutral-500 hover:text-neutral-900">
              View all
            </Link>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-neutral-500">Nothing yet.</p>
            )}
            {notifications.slice(0, 8).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read_at) {
                    setNotifications((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x))
                    );
                    markNotificationRead(n.id);
                  }
                }}
                className={`block w-full border-b border-neutral-50 px-4 py-3 text-left text-sm last:border-0 hover:bg-neutral-50 ${
                  n.read_at ? "opacity-60" : ""
                }`}
              >
                <p className="font-medium text-neutral-900">{n.title}</p>
                {n.body && <p className="mt-0.5 text-xs text-neutral-500">{n.body}</p>}
                <p className="mt-1 text-[10px] text-neutral-500">{new Date(n.created_at).toLocaleString()}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
