import type { NextConfig } from "next";

const FIREBASE_AUTH_HOST = "matchup-7b058.firebaseapp.com";

const nextConfig: NextConfig = {
  // Các gói chạy ở server (Node) — không đóng gói lại, nạp trực tiếp từ node_modules
  // để tránh lỗi "Failed to load external module" trên Vercel serverless.
  serverExternalPackages: [
    "firebase-admin",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  // Cho phần xác thực Firebase chạy CHUNG tên miền (same-origin) -> Safari/iOS không chặn.
  // Trình duyệt gọi matchup.pro.vn/__/auth/* , ta chuyển tiếp sang Firebase.
  async rewrites() {
    return [
      { source: "/__/auth/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/auth/:path*` },
      { source: "/__/firebase/:path*", destination: `https://${FIREBASE_AUTH_HOST}/__/firebase/:path*` },
    ];
  },
};

export default nextConfig;
