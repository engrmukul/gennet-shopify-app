import { describe, expect, it } from "vitest";
import { normalizePhone } from "~/lib/phone.server";

describe("phone normalization", () => {
  it("normalizes a local BD number (01XXXXXXXXX)", () => {
    expect(normalizePhone("01712345678")).toEqual({
      msisdn: "8801712345678",
      country: "BD",
      valid: true,
    });
  });

  it("normalizes a BD number with a leading +", () => {
    expect(normalizePhone("+8801712345678")).toEqual({
      msisdn: "8801712345678",
      country: "BD",
      valid: true,
    });
  });

  it("normalizes a BD number already in country-code form", () => {
    expect(normalizePhone("8801712345678")).toEqual({
      msisdn: "8801712345678",
      country: "BD",
      valid: true,
    });
  });

  it("does not corrupt a non-BD international number", () => {
    const result = normalizePhone("+14155552671");
    expect(result.msisdn).toBe("14155552671");
    expect(result.country).toBe("UNKNOWN");
    expect(result.valid).toBe(true);
  });

  it("flags an implausibly short number as invalid without guessing a country", () => {
    const result = normalizePhone("123");
    expect(result.country).toBe("UNKNOWN");
    expect(result.valid).toBe(false);
  });
});
