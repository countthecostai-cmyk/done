"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { subscribeToTaskMessages } from "@/lib/realtime";
import { sendMessage, markMessageRead } from "@/app/messages/actions";
import type { Message } from "@/lib/database.types";

export function TaskMessages({
  taskId,
  currentUserId,
  otherPartyName,
  initialMessages,
}: {
  taskId: string;
  currentUserId: string;
  otherPartyName: string;
  initialMessages: Message[];
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const boundAction = async (
    _prev: { error?: string } | undefined,
    formData: FormData
  ) => {
    const result = await sendMessage(taskId, formData);
    if (!result.error) formEl.current?.reset();
    return result;
  };
  const formEl = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(boundAction, undefined);

  useEffect(() => {
    const supabase = createClient();
    const unsubscribe = subscribeToTaskMessages<Message>(supabase, taskId, (payload) => {
      if (payload.eventType === "INSERT" && payload.new) {
        setMessages((prev) => (prev.some((m) => m.id === payload.new!.id) ? prev : [...prev, payload.new!]));
      }
    });
    return unsubscribe;
  }, [taskId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const markedReadRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Mark incoming unread messages as read as they're viewed (once each).
    messages
      .filter((m) => m.recipient_id === currentUserId && !m.read_at && !markedReadRef.current.has(m.id))
      .forEach((m) => {
        markedReadRef.current.add(m.id);
        markMessageRead(m.id);
      });
  }, [messages, currentUserId]);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700">
        Chat with {otherPartyName}
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-neutral-400">No messages yet — say hello.</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                  isMine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-900"
                }`}
              >
                <p>{m.body}</p>
                <p className={`mt-1 text-[10px] ${isMine ? "text-neutral-300" : "text-neutral-400"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form ref={formEl} action={formAction} className="flex gap-2 border-t border-neutral-200 p-3">
        <input
          name="body"
          type="text"
          required
          placeholder="Type a message…"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        >
          Send
        </button>
      </form>
      {state?.error && <p className="px-4 pb-3 text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
