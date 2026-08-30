import { formatCents } from "@/lib/pricing";
import type { PromotionDiscountType } from "@/lib/database.types";

/**
 * Pure promo-code math + eligibility. The AUTHORITATIVE enforcement lives
 * in the database (enforce_promotion_limits + tasks_lock_discount in
 * supabase/migrations/0011_promotions.sql) — a row lock there serializes
 * concurrent redemptions and re-checks every one of these rules again.
 * This module exists only so applyPromoCode can return a friendly error
 * instead of a raw Postgres exception in the common case, and so the UI
 * can preview a discount before submitting. Never treat its output as
 * final — the server action always re-derives from the promotion row it
 * just read, never from client input.
 */

export interface PromotionForDiscount {
  discount_type: PromotionDiscountType;
  discount_value: number;
  max_discount_cents: number | null;
  min_subtotal_cents: number;
  active: boolean;
  starts_at: string | null;
  expires_at: string | null;
}

/** Returns a user-facing reason the code can't be applied right now, or null if eligible. */
export function promoEligibilityError(
  promo: PromotionForDiscount,
  priceCents: number,
  now: Date = new Date()
): string | null {
  if (!promo.active) return "This code is no longer active.";
  if (promo.starts_at && new Date(promo.starts_at) > now) return "This code isn't active yet.";
  if (promo.expires_at && new Date(promo.expires_at) <= now) return "This code has expired.";
  if (priceCents < promo.min_subtotal_cents) {
    return `This code requires a minimum order of ${formatCents(promo.min_subtotal_cents)}.`;
  }
  return null;
}

/** The discount in cents this promotion applies to a given price. Never exceeds priceCents. */
export function computeDiscountCents(promo: PromotionForDiscount, priceCents: number): number {
  let discount =
    promo.discount_type === "percent"
      ? Math.floor((priceCents * promo.discount_value) / 100)
      : promo.discount_value;
  if (promo.discount_type === "percent" && promo.max_discount_cents != null) {
    discount = Math.min(discount, promo.max_discount_cents);
  }
  return Math.min(Math.max(discount, 0), priceCents);
}

export function normalizePromoCode(raw: string): string {
  return raw.trim().toUpperCase();
}
