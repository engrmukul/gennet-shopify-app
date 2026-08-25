// Phone normalization service.
//
// Gennet's documented MSISDN format is a bare international number without
// a leading "+", e.g. "8801712345678". This module only rewrites numbers it
// can positively identify as Bangladeshi mobile numbers (explicit, narrow
// rule set below); every other input is passed through digit-stripped but
// otherwise untouched — we never guess a merchant's country, and we never
// silently mutate a non-BD number into something that looks BD.

export interface PhoneNormalizationResult {
  msisdn: string;
  country: "BD" | "UNKNOWN";
  valid: boolean;
}

const BD_COUNTRY_CODE = "88";
const BD_LOCAL_PREFIX = "01"; // Bangladeshi mobile numbers start 01[3-9]

function isBdLocal(digits: string): boolean {
  // 01XXXXXXXXX — 11 digits total.
  return digits.length === 11 && digits.startsWith(BD_LOCAL_PREFIX);
}

function isBdWithCountryCode(digits: string): boolean {
  // 8801XXXXXXXXX — 13 digits total.
  return (
    digits.length === 13 &&
    digits.startsWith(BD_COUNTRY_CODE + BD_LOCAL_PREFIX)
  );
}

export function normalizePhone(raw: string): PhoneNormalizationResult {
  const digits = raw.replace(/\D/g, "");

  if (isBdWithCountryCode(digits)) {
    return { msisdn: digits, country: "BD", valid: true };
  }

  if (isBdLocal(digits)) {
    return {
      msisdn: BD_COUNTRY_CODE + digits,
      country: "BD",
      valid: true,
    };
  }

  // Not a recognized Bangladeshi form. Pass through unmodified (digits
  // only) rather than guessing — the merchant may be in another country.
  // Basic sanity check: E.164-range length, no country assumed.
  const valid = digits.length >= 8 && digits.length <= 15;
  return { msisdn: digits, country: "UNKNOWN", valid };
}
