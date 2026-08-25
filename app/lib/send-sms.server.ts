import { SmsLogStatus } from "@prisma/client";
import prisma from "~/db.server";
import { decryptSecret } from "~/lib/crypto.server";
import {
  GennetClient,
  GennetError,
} from "~/lib/gennet-client.server";
import { maskPhone } from "~/lib/mask.server";
import { normalizePhone } from "~/lib/phone.server";
import { getSettingsForShop } from "~/models/sms-settings.server";

export interface SendSmsInput {
  shopId: string;
  event: string; // e.g. "MANUAL", "ORDER_CREATED"
  orderId?: string;
  topic?: string;
  recipientRaw: string;
  senderId?: string;
  message: string;
  csmsId: string;
}

export type SendSmsOutcome =
  | { ok: true }
  | { ok: false; category: string; message: string };

// Central place every SMS send (manual or automatic) goes through, so
// logging, masking, and settings resolution stay consistent and no
// secrets leak into logs.
export async function sendSms(input: SendSmsInput): Promise<SendSmsOutcome> {
  const settings = await getSettingsForShop(input.shopId);

  if (!settings?.enabled || !settings.apiTokenEncrypted) {
    return {
      ok: false,
      category: "CONFIGURATION",
      message: "Gennet SMS is not enabled or configured for this shop.",
    };
  }

  const senderId = input.senderId ?? settings.defaultSenderId;
  if (!senderId) {
    return {
      ok: false,
      category: "CONFIGURATION",
      message: "No sender ID configured.",
    };
  }

  const { msisdn } = normalizePhone(input.recipientRaw);
  const apiToken = decryptSecret(settings.apiTokenEncrypted);

  const client = new GennetClient({
    apiBaseUrl: settings.apiBaseUrl,
    apiToken,
    timeoutMs: settings.requestTimeoutMs,
  });

  try {
    await client.send({
      sid: senderId,
      msisdn,
      sms: input.message,
      csms_id: input.csmsId,
    });

    await prisma.smsLog.create({
      data: {
        shopId: input.shopId,
        event: input.event,
        orderId: input.orderId,
        topic: input.topic,
        recipientMasked: maskPhone(msisdn),
        senderId,
        csmsId: input.csmsId,
        status: SmsLogStatus.SENT,
      },
    });

    return { ok: true };
  } catch (error) {
    const gennetError =
      error instanceof GennetError
        ? error
        : new GennetError("API", error instanceof Error ? error.message : String(error));

    await prisma.smsLog.create({
      data: {
        shopId: input.shopId,
        event: input.event,
        orderId: input.orderId,
        topic: input.topic,
        recipientMasked: maskPhone(msisdn),
        senderId,
        csmsId: input.csmsId,
        status: SmsLogStatus.FAILED,
        apiStatusCode: gennetError.apiStatusCode,
        apiMeaning: gennetError.apiMeaning,
        errorCategory: gennetError.category,
      },
    });

    return {
      ok: false,
      category: gennetError.category,
      message: gennetError.message,
    };
  }
}
