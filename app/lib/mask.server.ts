// Masks a phone number for storage in long-lived logs, keeping only enough
// to be recognizable by support staff (country code + last 2 digits).
export function maskPhone(msisdn: string): string {
  const digits = msisdn.replace(/\D/g, "");
  if (digits.length <= 4) {
    return "*".repeat(digits.length);
  }
  const visibleStart = digits.slice(0, 3);
  const visibleEnd = digits.slice(-2);
  const maskedMiddle = "*".repeat(digits.length - 5);
  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}
