import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Các gói chạy ở server (Node) — không đóng gói lại, nạp trực tiếp từ node_modules
  // để tránh lỗi "Failed to load external module" trên Vercel serverless.
  serverExternalPackages: [
    "firebase-admin",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
};

export default nextConfig;
