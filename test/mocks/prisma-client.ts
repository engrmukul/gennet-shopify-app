// Stand-in for the generated @prisma/client module (enums + error class)
// so unit tests can run without `prisma generate` against a real database.
// Only what this codebase actually imports from @prisma/client is defined
// here — kept in sync with prisma/schema.prisma.

export enum NotificationEvent {
  ORDER_CREATED = "ORDER_CREATED",
  ORDER_PAID = "ORDER_PAID",
  ORDER_FULFILLED = "ORDER_FULFILLED",
  ORDER_CANCELLED = "ORDER_CANCELLED",
  ORDER_REFUNDED = "ORDER_REFUNDED",
}

export enum SmsEventStatus {
  PENDING = "PENDING",
  SENT = "SENT",
  FAILED = "FAILED",
}

export enum SmsLogStatus {
  SENT = "SENT",
  FAILED = "FAILED",
}

export enum ComplianceRequestType {
  CUSTOMER_DATA_REQUEST = "CUSTOMER_DATA_REQUEST",
  CUSTOMER_REDACT = "CUSTOMER_REDACT",
  SHOP_REDACT = "SHOP_REDACT",
}

export class PrismaClientKnownRequestError extends Error {
  code: string;
  constructor(message: string, opts: { code: string }) {
    super(message);
    this.code = opts.code;
  }
}

export const Prisma = { PrismaClientKnownRequestError };

export class PrismaClient {
  constructor() {
    // Real PrismaClient is never constructed in tests — app/db.server.ts
    // itself is always mocked (see test/mocks/prisma.ts) before it would
    // call `new PrismaClient()`.
  }
}
