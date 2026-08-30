/**
 * Hand-written types mirroring supabase/migrations/0001-0010. Once a live
 * Supabase project is connected, replace/augment this with the output of
 * `generate_typescript_types` — keep this file's shape compatible so the
 * swap is a no-op for callers.
 */
import type { TaskStatus } from "@/lib/task-state-machine";

export type PricingModel =
  | "flat"
  | "hourly"
  | "quantity"
  | "distance"
  | "doer_quote"
  | "custom_quote"
  | "minimum_charge";

export type DoerStatus = "pending" | "approved" | "rejected" | "suspended";
export type BackgroundCheckStatus = "not_started" | "pending" | "clear" | "flagged";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded" | "partially_refunded";
export type PayoutStatus = "pending" | "in_transit" | "paid" | "failed" | "canceled";
export type DisputeStatus = "open" | "resolved_release" | "resolved_refund" | "resolved_other";
export type TaskActorDb = "requester" | "doer" | "admin" | "system";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  is_doer: boolean;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  suspended_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DoerProfile {
  user_id: string;
  status: DoerStatus;
  identity_verified: boolean;
  background_check_status: BackgroundCheckStatus;
  is_available: boolean;
  rating_avg: number | null;
  rating_count: number;
  bio: string | null;
  applied_at: string;
  approved_at: string | null;
  suspended_reason: string | null;
  created_at: string;
  updated_at: string;
}
