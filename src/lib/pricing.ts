/**
 * Display-only pricing preview. The AUTHORITATIVE calculation lives in the
 * database (compute_task_pricing + the tasks_recompute_pricing trigger in
 * supabase/migrations/0002_functions_rls.sql), which recomputes price_cents
 * on every insert/update from task_type + quantity + addons — a client
 * cannot make the two disagree. This module exists only so the UI can show
 * an estimate before submitting; never treat its output as final.
 */

export type PricingModel =
  | "flat"
  | "hourly"
  | "quantity"
  | "distance"
  | "doer_quote"
  | "custom_quote"
  | "minimum_charge";

export interface TaskTypeForPricing {
  pricing_model: PricingModel;
  base_price_cents: number;
  min_price_cents: number;
  price_per_unit_cents: number | null;
}

export function estimatePriceCents(
  taskType: TaskTypeForPricing,
  quantity: number | null,
  addonTotalCents: number
): number {
  let price: number;
  switch (taskType.pricing_model) {
    case "flat":
      price = taskType.base_price_cents;
      break;
    case "hourly":
    case "quantity":
    case "distance":
      price =
        taskType.base_price_cents +
        (taskType.price_per_unit_cents ?? 0) * Math.max(quantity ?? 1, 0);
      break;
    default:
      price = taskType.base_price_cents;
  }
  price += addonTotalCents;
  return Math.max(price, taskType.min_price_cents);
}

export const PLATFORM_FEE_RATE = 0.2;

export function splitFee(priceCents: number): {
  platformFeeCents: number;
  doerPayoutCents: number;
} {
  const platformFeeCents = Math.floor(priceCents * PLATFORM_FEE_RATE);
  return { platformFeeCents, doerPayoutCents: priceCents - platformFeeCents };
}

export function formatCents(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
