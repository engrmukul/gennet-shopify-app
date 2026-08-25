import { describe, expect, it } from "vitest";
import { generateCsmsId, isValidCsmsId } from "~/lib/csms.server";

describe("CSMS ID generation", () => {
  it("generates an alphanumeric ID no longer than 20 characters", () => {
    for (let i = 0; i < 200; i++) {
      const id = generateCsmsId();
      expect(id.length).toBeLessThanOrEqual(20);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    }
  });

  it("never contains hyphens even with a prefix like an order number", () => {
    const id = generateCsmsId("ORDER-123");
    expect(id).not.toContain("-");
    expect(id.length).toBeLessThanOrEqual(20);
  });

  it("has a low collision rate across many generations", () => {
    const ids = new Set(Array.from({ length: 5000 }, () => generateCsmsId()));
    expect(ids.size).toBe(5000);
  });

  it("validates well-formed CSMS IDs and rejects malformed ones", () => {
    expect(isValidCsmsId("ABC123")).toBe(true);
    expect(isValidCsmsId("A".repeat(20))).toBe(true);
    expect(isValidCsmsId("A".repeat(21))).toBe(false);
    expect(isValidCsmsId("ORDER-123")).toBe(false);
    expect(isValidCsmsId("")).toBe(false);
  });
});
