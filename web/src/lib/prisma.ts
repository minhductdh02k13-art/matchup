import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 dùng driver adapter (node-postgres) thay cho engine cũ.
// Singleton để tránh tạo nhiều connection khi Next.js hot-reload trong dev.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrisma() {
  // Postgres local (prisma dev) đóng kết nối rảnh -> cấu hình pool để đóng nhanh
  // kết nối rảnh + keepAlive, tránh lỗi "ConnectionClosed" khi tái dùng kết nối chết.
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 1000,
    keepAlive: true,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
