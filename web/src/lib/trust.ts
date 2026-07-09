import { prisma } from "@/lib/prisma";

// Tính lại thống kê + điểm uy tín của 1 user từ dữ liệu thật.
// Gọi sau: check-in, đánh giá, hủy sát giờ, và khi đăng nhập.
export async function recomputeUserStats(userId: string) {
  const now = new Date();

  const [agg, checkIns, approvedEnded, user] = await Promise.all([
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    }),
    // matchesPlayed = số trận đã check-in
    prisma.checkIn.findMany({ where: { userId }, select: { matchId: true } }),
    // các trận đã được duyệt + đã kết thúc + không bị hủy -> để soi no-show
    prisma.matchParticipant.findMany({
      where: {
        userId,
        status: "approved",
        match: { endsAt: { lt: now }, status: { not: "cancelled" }, deletedAt: null },
      },
      select: { matchId: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { lateCancelCount: true } }),
  ]);

  const ratingAvg = agg._avg.rating ?? 0;
  const ratingCount = agg._count;
  const matchesPlayed = checkIns.length;

  // No-show = được duyệt, trận đã xong, nhưng KHÔNG check-in
  const checkedIn = new Set(checkIns.map((c) => c.matchId));
  const noShowCount = approvedEnded.filter((p) => !checkedIn.has(p.matchId)).length;
  const lateCancelCount = user?.lateCancelCount ?? 0;

  // User hoàn toàn chưa có hoạt động -> chưa có điểm (badge "Mới")
  const hasActivity =
    ratingCount > 0 || matchesPlayed > 0 || noShowCount > 0 || lateCancelCount > 0;

  let trustScore: number | null = null;
  if (hasActivity) {
    // Chỉ tính điểm đánh giá khi ĐÃ có đánh giá (chưa có -> trung tính, không trừ oan)
    const ratingTerm = ratingCount > 0 ? (ratingAvg - 3) * 10 : 0; // ±20
    const raw =
      60 +
      ratingTerm +
      Math.min(matchesPlayed, 20) - // kinh nghiệm: tối đa +20
      noShowCount * 8 - // KHÔNG đến: phạt nặng
      lateCancelCount * 5; // hủy sát giờ: phạt
    trustScore = Math.max(0, Math.min(100, Math.round(raw)));
  }

  await prisma.user.update({
    where: { id: userId },
    data: { ratingAvg, ratingCount, matchesPlayed, noShowCount, trustScore },
  });

  return trustScore;
}

// Giới hạn số kèo "chưa diễn ra" được phép mở cùng lúc, theo uy tín.
// Chống spam tạo trận giả. Người mới vẫn được tạo (2), kẻ điểm thấp bị siết.
export function matchCreationLimit(trustScore: number | null): number {
  if (trustScore == null) return 2; // người mới
  if (trustScore >= 80) return 10;
  if (trustScore >= 50) return 5;
  if (trustScore >= 30) return 2;
  return 1; // uy tín rất thấp
}

// "Rủi ro": hay vắng mặt hoặc uy tín thấp -> cảnh báo host khi duyệt.
export function isRiskyUser(u: { trustScore: number | null; noShowCount: number }): boolean {
  return u.noShowCount >= 2 || (u.trustScore != null && u.trustScore < 40);
}

export const LOW_TRUST_THRESHOLD = 30; // dưới mức này bị hạ hạng tìm kiếm
