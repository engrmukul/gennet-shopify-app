import prisma from "~/db.server";

export async function listRecentLogsForShop(shopId: string, limit = 50) {
  return prisma.smsLog.findMany({
    where: { shopId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function countRecentByStatus(shopId: string) {
  const [sent, failed] = await Promise.all([
    prisma.smsLog.count({ where: { shopId, status: "SENT" } }),
    prisma.smsLog.count({ where: { shopId, status: "FAILED" } }),
  ]);
  return { sent, failed };
}

export async function listLogsForShopOrder(shopId: string, orderId: string) {
  return prisma.smsLog.findMany({ where: { shopId, orderId } });
}
