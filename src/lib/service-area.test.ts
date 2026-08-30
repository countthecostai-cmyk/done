import { describe, it, expect } from "vitest";
import { isZipInServiceArea } from "./service-area";

describe("isZipInServiceArea", () => {
  it("allows any zip when no active service areas are configured (pre-launch / open)", () => {
    expect(isZipInServiceArea("99999", [])).toBe(true);
  });

  it("allows a zip listed in an active service area", () => {
    const areas = [{ zip_codes: ["78701", "78702"] }, { zip_codes: ["10001"] }];
    expect(isZipInServiceArea("78702", areas)).toBe(true);
    expect(isZipInServiceArea("10001", areas)).toBe(true);
  });

  it("rejects a zip not listed in any active service area", () => {
    const areas = [{ zip_codes: ["78701", "78702"] }];
    expect(isZipInServiceArea("90210", areas)).toBe(false);
  });

  it("treats an empty zip_codes array on a configured area as covering nothing", () => {
    const areas = [{ zip_codes: [] }];
    expect(isZipInServiceArea("78701", areas)).toBe(false);
  });
});
