"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { haversineKm } from "@/lib/format";
import { recomputeUserStats } from "@/lib/trust";

const CHECKIN_RADIUS_KM = 1; // phải ở trong 1km quanh sân

export async function checkInGps(matchId: string, lat: number, lng: number) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { venue: true } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.status === "cancelled") throw new Error("Trận đã hủy");

  // Phải là host hoặc người đã được duyệt
  const isHost = match.hostId === me.id;
  if (!isHost) {
    const p = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: me.id } },
    });
    if (!p || p.status !== "approved") throw new Error("Chỉ người đã được duyệt mới check-in");
  }

  // Cửa sổ thời gian: từ 1 giờ trước giờ bắt đầu tới 2 giờ sau giờ kết thúc
  const now = Date.now();
  if (now < match.startsAt.getTime() - 3_600_000)
    throw new Error("Chưa tới giờ check-in (mở trước giờ đá 1 tiếng)");
  if (now > match.endsAt.getTime() + 2 * 3_600_000) throw new Error("Đã quá giờ check-in");

  // Kiểm tra ở gần sân
  const dist = haversineKm(lat, lng, match.venue.lat, match.venue.lng);
  if (dist > CHECKIN_RADIUS_KM)
    throw new Error(
      `Bạn đang cách sân ~${dist.toFixed(1)} km — cần ở gần sân (trong ${CHECKIN_RADIUS_KM} km) để check-in`
    );

  await prisma.checkIn.upsert({
    where: { matchId_userId: { matchId, userId: me.id } },
    create: { matchId, userId: me.id, method: "gps", lat, lng },
    update: {},
  });

  await recomputeUserStats(me.id);
  revalidatePath(`/matches/${matchId}`);
}
