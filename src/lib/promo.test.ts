import { describe, expect, it } from "vitest";
import { computeDiscountCents, normalizePromoCode, promoEligibilityError } from "./promo";
import type { PromotionForDiscount } from "./promo";

const basePromo: PromotionForDiscount = {
  discount_type: "percent",
  discount_value: 10,
  max_discount_cents: null,
  min_subtotal_cents: 0,
  active: true,
  starts_at: null,
  expires_at: null,
};

describe("promoEligibilityError", () => {
  it("allows an active, unrestricted code", () => {
    expect(promoEligibilityError(basePromo, 5000)).toBeNull();
  });

  it("rejects an inactive code", () => {
    expect(promoEligibilityError({ ...basePromo, active: false }, 5000)).toBe(
      "This code is no longer active."
    );
  });

  it("rejects a code that hasn't started yet", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const promo = { ...basePromo, starts_at: "2026-06-01T00:00:00Z" };
    expect(promoEligibilityError(promo, 5000, now)).toBe("This code isn't active yet.");
  });

  it("rejects an expired code", () => {
    const now = new Date("2026-06-01T00:00:00Z");
    const promo = { ...basePromo, expires_at: "2026-01-01T00:00:00Z" };
    expect(promoEligibilityError(promo, 5000, now)).toBe("This code has expired.");
  });

  it("accepts right at the start boundary and rejects right at the expiry boundary", () => {
    const startsAt = "2026-06-01T00:00:00Z";
    const expiresAt = "2026-06-01T00:00:00Z";
    expect(promoEligibilityError({ ...basePromo, starts_at: startsAt }, 5000, new Date(startsAt))).toBeNull();
    expect(
      promoEligibilityError({ ...basePromo, expires_at: expiresAt }, 5000, new Date(expiresAt))
    ).toBe("This code has expired.");
  });

  it("rejects a subtotal below the minimum", () => {
    const promo = { ...basePromo, min_subtotal_cents: 6000 };
    expect(promoEligibilityError(promo, 5000)).toBe("This code requires a minimum order of $60.00.");
  });

  it("allows a subtotal exactly at the minimum", () => {
    const promo = { ...basePromo, min_subtotal_cents: 5000 };
    expect(promoEligibilityError(promo, 5000)).toBeNull();
  });
});

describe("computeDiscountCents", () => {
  it("computes a flat percent discount", () => {
    expect(computeDiscountCents(basePromo, 5000)).toBe(500); // 10% of $50
  });

  it("floors a percent discount to whole cents", () => {
    const promo = { ...basePromo, discount_value: 33 };
    expect(computeDiscountCents(promo, 1001)).toBe(330); // floor(1001 * 0.33) = 330.33 -> 330
  });

  it("caps a percent discount at max_discount_cents", () => {
    const promo = { ...basePromo, discount_value: 50, max_discount_cents: 1000 };
    expect(computeDiscountCents(promo, 10000)).toBe(1000); // 50% of $100 = $50, capped to $10
  });

  it("does not cap a fixed discount by max_discount_cents (fixed ignores that field)", () => {
    const promo: PromotionForDiscount = {
      ...basePromo,
      discount_type: "fixed",
      discount_value: 2000,
      max_discount_cents: 500,
    };
    expect(computeDiscountCents(promo, 10000)).toBe(2000);
  });

  it("clamps a fixed discount so it never exceeds the price", () => {
    const promo: PromotionForDiscount = { ...basePromo, discount_type: "fixed", discount_value: 9000 };
    expect(computeDiscountCents(promo, 5000)).toBe(5000);
  });

  it("a 100% percent discount equals the full price", () => {
    const promo = { ...basePromo, discount_value: 100 };
    expect(computeDiscountCents(promo, 5000)).toBe(5000);
  });
});

describe("normalizePromoCode", () => {
  it("trims and uppercases", () => {
    expect(normalizePromoCode("  save10 ")).toBe("SAVE10");
  });
});
