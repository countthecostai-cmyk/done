"use server";

import { createClient } from "@/lib/supabase/server";
import {
  transitionTicket,
  TicketTransitionConflictError,
  TicketIllegalTransitionError,
} from "@/lib/support-ticket-transitions";
import type { SupportTicketCategory } from "@/lib/support-ticket-state-machine";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const VALID_CATEGORIES: SupportTicketCategory[] = [
  "account",
  "billing",
  "task_issue",
  "safety",
  "bug",
  "other",
];

function friendlyError(e: unknown): string {
  if (e instanceof TicketTransitionConflictError || e instanceof TicketIllegalTransitionError) {
    return e.message;
  }
  console.error(e);
  return "Something went wrong. Please try again.";
}

/**
 * Requester-side support actions for the Done (customer) app. The Doer
 * app's equivalent (src/app/support/actions.ts there) is the same shape
 * with created_by_role: "doer" and its own-tasks ownership check — both
 * write to the same shared support_tickets / support_ticket_messages /
 * support_ticket_status_history tables (0012_support_tickets.sql).
 *
 * This is deliberately a separate channel from disputes: a dispute is a
 * task-specific completion disagreement that resolves through the payout
 * trust gate (release/refund/cancel); a support ticket is a private
 * admin<->user conversation with no financial outcome of its own —
 * "I can't sign in", "wrong amount on my card", "the app crashed".
 */
export async function createTicket(
  _prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const category = String(formData.get("category") ?? "other") as SupportTicketCategory;
  if (!VALID_CATEGORIES.includes(category)) return { error: "Pick a valid category." };

  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) return { error: "Give your ticket a short subject." };
  if (subject.length > 200) return { error: "Subject is too long (200 characters max)." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Describe what's going on." };
  if (body.length > 4000) return { error: "Message is too long (4000 characters max)." };

  const relatedTaskId = String(formData.get("related_task_id") ?? "").trim() || null;
  if (relatedTaskId) {
    const { data: task } = await supabase
      .from("tasks")
      .select("id")
      .eq("id", relatedTaskId)
      .eq("requester_id", user.id)
      .maybeSingle();
    if (!task) return { error: "That task couldn't be found on your account." };
  }

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .insert({
      created_by: user.id,
      created_by_role: "requester",
      category,
      subject,
      related_task_id: relatedTaskId,
    })
    .select()
    .single();
  if (error || !ticket) return { error: error?.message ?? "Could not open a ticket." };

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_id: user.id,
    sender_role: "requester",
    body,
  });
  if (messageError) {
    // The ticket itself was created — don't lose it over the first message
    // failing to save; they can add it from the ticket page instead.
    console.error("initial ticket message insert failed:", messageError.message);
  }

  const { error: historyError } = await supabase.from("support_ticket_status_history").insert({
    ticket_id: ticket.id,
    status: "open",
    note: null,
    changed_by_actor: "requester",
    changed_by_user: user.id,
  });
  if (historyError) console.error("ticket status history insert failed:", historyError.message);

  revalidatePath("/support");
  redirect(`/support/${ticket.id}`);
}

export async function sendTicketMessage(
  ticketId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Message can't be empty." };
  if (body.length > 4000) return { error: "Message is too long (4000 characters max)." };

  const { data: ticket } = await supabase
    .from("support_tickets")
    .select("id, created_by, status")
    .eq("id", ticketId)
    .maybeSingle();
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.created_by !== user.id) return { error: "This isn't your ticket." };
  if (ticket.status === "closed") {
    return { error: "This ticket is closed. Reopen it first to add a new message." };
  }

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    sender_id: user.id,
    sender_role: "requester",
    body,
  });
  if (error) return { error: error.message };

  revalidatePath(`/support/${ticketId}`);
  return {};
}

/** Self-service: "yes, that fixed it" — the ticket creator confirming a resolved ticket is done. */
export async function closeMyTicket(ticketId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  try {
    await transitionTicket(supabase, {
      ticketId,
      from: "resolved",
      to: "closed",
      actor: "requester",
      changedByUser: user.id,
      note: "Confirmed resolved by Requester",
    });
  } catch (e) {
    return { error: friendlyError(e) };
  }

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  return {};
}

/** Self-service: "no, that didn't actually fix it" — reopens a resolved ticket. */
export async function reopenMyTicket(ticketId: string, formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const note = String(formData.get("note") ?? "").trim();

  try {
    await transitionTicket(supabase, {
      ticketId,
      from: "resolved",
      to: "open",
      actor: "requester",
      changedByUser: user.id,
      note: note || "Reopened by Requester — issue not resolved",
    });
  } catch (e) {
    return { error: friendlyError(e) };
  }

  revalidatePath(`/support/${ticketId}`);
  revalidatePath("/support");
  return {};
}
