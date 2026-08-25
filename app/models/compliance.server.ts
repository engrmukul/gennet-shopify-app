import { ComplianceRequestType } from "@prisma/client";
import prisma from "~/db.server";

export async function recordComplianceRequest(
  shopDomain: string,
  type: ComplianceRequestType,
  summary: string,
) {
  return prisma.complianceRequestLog.create({
    data: { shopDomain, type, summary },
  });
}
