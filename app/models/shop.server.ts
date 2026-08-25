import prisma from "~/db.server";

export async function getOrCreateShop(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  });
}

export async function markShopInstalled(shopDomain: string) {
  return prisma.shop.upsert({
    where: { shopDomain },
    update: { uninstalledAt: null },
    create: { shopDomain },
  });
}

export async function markShopUninstalled(shopDomain: string) {
  return prisma.shop.updateMany({
    where: { shopDomain },
    data: { uninstalledAt: new Date() },
  });
}

export async function getShopByDomain(shopDomain: string) {
  return prisma.shop.findUnique({ where: { shopDomain } });
}
