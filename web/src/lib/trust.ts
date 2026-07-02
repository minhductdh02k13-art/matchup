import { prisma } from "@/lib/prisma";

// Tính lại thống kê + điểm uy tín của 1 user từ dữ liệu thực (đánh giá, số trận check-in).
// Gọi sau mỗi lần có đánh giá mới hoặc check-in.
export async function recomputeUserStats(userId: string) {
  const [agg, matchesPlayed] = await Promise.all([
    prisma.review.aggregate({
      where: { revieweeId: userId },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.checkIn.count({ where: { userId } }),
  ]);

  const ratingAvg = agg._avg.rating ?? 0;
  const ratingCount = agg._count;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cancelRate: true, noShowCount: true, onTimeRate: true },
  });

  // User hoàn toàn mới (chưa có đánh giá & chưa chơi trận nào) -> chưa có điểm (hiện badge "Mới").
  let trustScore: number | null = null;
  if (ratingCount > 0 || matchesPlayed > 0) {
    const raw =
      60 +
      (ratingAvg - 3) * 10 + // 5 sao: +20, 1 sao: -20
      Math.min(matchesPlayed, 20) * 1 + // kinh nghiệm, tối đa +20
      (user?.onTimeRate ?? 0) * 0.1 -
      (user?.cancelRate ?? 0) * 0.4 -
      (user?.noShowCount ?? 0) * 3;
    trustScore = Math.max(0, Math.min(100, Math.round(raw)));
  }

  await prisma.user.update({
    where: { id: userId },
    data: { ratingAvg, ratingCount, matchesPlayed, trustScore },
  });

  return trustScore;
}
