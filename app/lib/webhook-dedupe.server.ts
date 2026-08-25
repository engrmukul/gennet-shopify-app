import { Prisma, SmsEventStatus } from "@prisma/client";
import prisma from "~/db.server";

// Unique-constraint-based dedupe. Shopify may redeliver the same webhook
// more than once, and duplicate deliveries can race each other concurrently.
// We never do a "check then act" — we let Postgres's unique constraint on
// SmsEvent(shopId, topic, orderId, subtype) do the race-safe work: only one
// concurrent insert wins, everyone else observes a unique-violation and
// backs off immediately without sending SMS.

export interface EventIdentity {
  shopId: string;
  topic: string;
  orderId: string;
  subtype?: string;
  webhookId?: string;
}

const UNIQUE_VIOLATION = "P2002";

export type ClaimResult =
  | { claimed: true; eventId: string }
  | { claimed: false };

// Attempts to claim an event for processing. Returns claimed: false if this
// exact event has already been claimed (by a prior delivery or a concurrent
// duplicate).
export async function claimEvent(identity: EventIdentity): Promise<ClaimResult> {
  try {
    const event = await prisma.smsEvent.create({
      data: {
        shopId: identity.shopId,
        topic: identity.topic,
        orderId: identity.orderId,
        subtype: identity.subtype ?? "",
        webhookId: identity.webhookId,
        status: SmsEventStatus.PENDING,
      },
    });
    return { claimed: true, eventId: event.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_VIOLATION
    ) {
      return { claimed: false };
    }
    throw error;
  }
}

export async function markEventStatus(
  eventId: string,
  status: SmsEventStatus,
): Promise<void> {
  await prisma.smsEvent.update({
    where: { id: eventId },
    data: { status },
  });
}
