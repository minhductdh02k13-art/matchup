"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import type { ReportReason } from "@/generated/prisma/enums";

export async function submitReport(
  matchId: string,
  reportedUserId: string,
  reason: ReportReason,
  detail: string
) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");
  if (reportedUserId === me.id) throw new Error("Không thể tự báo cáo");

  await prisma.report.create({
    data: { matchId, reporterId: me.id, reportedUserId, reason, detail: detail || null },
  });
  // TODO(admin): trang admin xử lý report; nhiều report -> tự giảm uy tín / ẩn kèo
  revalidatePath(`/matches/${matchId}`);
}
