"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { recomputeUserStats } from "@/lib/trust";
import type { ReviewDirection } from "@/generated/prisma/enums";

export async function submitReview(
  matchId: string,
  revieweeId: string,
  direction: ReviewDirection,
  rating: number,
  comment: string
) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");
  if (revieweeId === me.id) throw new Error("Không thể tự đánh giá");

  const r = Math.round(rating);
  if (r < 1 || r > 5) throw new Error("Điểm phải từ 1 đến 5 sao");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.endsAt.getTime() > Date.now()) throw new Error("Chỉ đánh giá sau khi trận kết thúc");

  // Chỉ người CÓ check-in mới được đánh giá
  const myCheckin = await prisma.checkIn.findUnique({
    where: { matchId_userId: { matchId, userId: me.id } },
  });
  if (!myCheckin) throw new Error("Chỉ người có check-in mới được đánh giá");

  await prisma.review.upsert({
    where: {
      matchId_reviewerId_revieweeId: { matchId, reviewerId: me.id, revieweeId },
    },
    create: { matchId, reviewerId: me.id, revieweeId, direction, rating: r, comment: comment || null },
    update: { rating: r, comment: comment || null },
  });

  await recomputeUserStats(revieweeId);
  revalidatePath(`/matches/${matchId}`);
}
