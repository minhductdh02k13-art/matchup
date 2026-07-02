import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";

const sans = Be_Vietnam_Pro({
  variable: "--font-geist-sans",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Matchup — Tìm kèo thể thao gần bạn",
  description: "Kết nối người chơi thể thao với các trận giao hữu đang thiếu người theo vị trí và thời gian thực.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${sans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <Header />
        {/* pb-24 chừa chỗ cho thanh nav dưới đáy trên mobile */}
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 sm:pb-6">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
