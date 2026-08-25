import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

// Reuse a single PrismaClient across Vite/HMR reloads in development so we
// don't exhaust the Postgres connection pool.
const prisma = global.prismaGlobal ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

export default prisma;
