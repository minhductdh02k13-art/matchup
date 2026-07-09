"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notify } from "@/lib/notify";
import { recomputeUserStats, matchCreationLimit } from "@/lib/trust";
import type { Prisma } from "@/generated/prisma/client";

// Trong 1 transaction: mời người waitlist kế tiếp (vị trí nhỏ nhất) khi có chỗ trống.
// Trả về userId người được mời (để gửi thông báo sau khi transaction commit), hoặc null.
async function promoteNextWaitlist(
  tx: Prisma.TransactionClient,
  matchId: string
): Promise<string | null> {
  const next = await tx.matchParticipant.findFirst({
    where: { matchId, status: "waitlisted" },
    orderBy: { waitlistPosition: "asc" },
  });
  if (!next) return null;
  await tx.matchParticipant.update({
    where: { id: next.id },
    data: { status: "invited", invitedAt: new Date(), waitlistPosition: null },
  });
  return next.userId;
}

// Toạ độ trung tâm TP.HCM (fallback khi chưa có map picker)
const HCMC_CENTER = { lat: 10.7769, lng: 106.7009 };

function shortCode(n = 8) {
  return Math.random().toString(36).slice(2, 2 + n);
}

// ===== HOST: Tạo kèo =====
export async function createMatch(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  // Chống spam: giới hạn số kèo chưa diễn ra theo uy tín
  const activeCount = await prisma.match.count({
    where: { hostId: me.id, deletedAt: null, status: { not: "cancelled" }, endsAt: { gt: new Date() } },
  });
  const limit = matchCreationLimit(me.trustScore);
  if (activeCount >= limit) {
    throw new Error(
      `Bạn đang có ${activeCount} kèo chưa diễn ra (giới hạn ${limit} theo uy tín). Hoàn thành hoặc hủy bớt rồi tạo tiếp.`
    );
  }

  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const sportCode = get("sport");
  const sport = await prisma.sport.findUnique({ where: { code: sportCode } });
  if (!sport) throw new Error("Môn không hợp lệ");

  const date = get("date"); // yyyy-mm-dd
  const startTime = get("startTime"); // HH:mm
  const endTime = get("endTime");
  const startsAt = new Date(`${date}T${startTime}:00`);
  const endsAt = new Date(`${date}T${endTime}:00`);
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) throw new Error("Ngày giờ không hợp lệ");
  if (endsAt <= startsAt) throw new Error("Giờ kết thúc phải sau giờ bắt đầu");

  const slotsNeeded = Math.max(1, Number(get("slotsNeeded")) || 1);
  const totalCost = Math.max(0, Number(get("totalCost")) || 0);

  // Toạ độ sân: ưu tiên điểm host chọn trên bản đồ; nếu bỏ trống thì fallback nhà host / trung tâm TP.HCM
  const latRaw = Number(get("venueLat"));
  const lngRaw = Number(get("venueLng"));
  const venueLat = isFinite(latRaw) && latRaw !== 0 ? latRaw : me.homeLat ?? HCMC_CENTER.lat;
  const venueLng = isFinite(lngRaw) && lngRaw !== 0 ? lngRaw : me.homeLng ?? HCMC_CENTER.lng;

  const venue = await prisma.venue.create({
    data: {
      name: get("venueName") || "Sân chưa đặt tên",
      address: get("venueAddress") || (me.district ?? "TP.HCM"),
      lat: venueLat,
      lng: venueLng,
      city: me.city,
      district: me.district,
      createdById: me.id,
    },
  });

  const match = await prisma.match.create({
    data: {
      hostId: me.id,
      sportId: sport.id,
      venueId: venue.id,
      title: get("title") || `Kèo ${sport.name}`,
      description: get("description") || null,
      rules: get("rules") || null,
      startsAt,
      endsAt,
      slotsNeeded,
      slotsFilled: 0,
      genderReq: (get("genderReq") || "any") as "any" | "male" | "female",
      skillReq: (get("skillReq") || "any") as "any" | "beginner" | "intermediate" | "advanced" | "pro",
      totalCost,
      costSplitMode: "per_host_total",
      status: "open",
      shareCode: shortCode(),
    },
  });

  revalidatePath("/");
  redirect(`/matches/${match.id}`);
}

// ===== PLAYER: Xin tham gia =====
export async function joinMatch(matchId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.hostId === me.id) throw new Error("Bạn là host của trận này");

  // Chặn nếu quá hạn đăng ký
  if (match.registerDeadline && match.registerDeadline < new Date()) {
    throw new Error("Đã quá hạn đăng ký");
  }
  if (["cancelled", "completed", "closed", "locked"].includes(match.status)) {
    throw new Error("Trận không còn nhận đăng ký");
  }

  // Đã có record?
  const existing = await prisma.matchParticipant.findUnique({
    where: { matchId_userId: { matchId, userId: me.id } },
  });
  if (existing && !["cancelled_by_user", "rejected", "removed_by_host"].includes(existing.status)) {
    throw new Error("Bạn đã đăng ký trận này rồi");
  }

  // Kiểm tra điều kiện (giới tính/tuổi/trình độ) — CHỐT: cảnh báo nhưng vẫn cho join
  const meetsRequirements = checkRequirements(match, me);

  // Nếu đã đủ người -> vào waitlist
  const isFull = match.slotsFilled >= match.slotsNeeded;
  let status: "pending" | "waitlisted" = "pending";
  let waitlistPosition: number | null = null;

  if (isFull) {
    status = "waitlisted";
    const last = await prisma.matchParticipant.findFirst({
      where: { matchId, status: "waitlisted" },
      orderBy: { waitlistPosition: "desc" },
    });
    waitlistPosition = (last?.waitlistPosition ?? 0) + 1;
  }

  await prisma.matchParticipant.upsert({
    where: { matchId_userId: { matchId, userId: me.id } },
    create: { matchId, userId: me.id, status, waitlistPosition, meetsRequirements, joinedAt: new Date() },
    update: { status, waitlistPosition, meetsRequirements, joinedAt: new Date(), decidedAt: null },
  });

  await notify(
    match.hostId,
    "join_request",
    "Có người xin tham gia",
    `${me.nickname ?? me.fullName} xin tham gia "${match.title}"`,
    { matchId }
  );
  revalidatePath(`/matches/${matchId}`);
}

// ===== HOST: Duyệt (chống double-book bằng transaction) =====
export async function approveParticipant(participantId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.matchParticipant.findUnique({
      where: { id: participantId },
      include: { match: true },
    });
    if (!p) throw new Error("Không tìm thấy đăng ký");
    if (p.match.hostId !== me.id) throw new Error("Chỉ host mới được duyệt");

    // Chỉ tăng chỗ khi còn slot (điều kiện trong transaction).
    if (p.match.slotsFilled < p.match.slotsNeeded) {
      await tx.matchParticipant.update({
        where: { id: participantId },
        data: { status: "approved", decidedAt: new Date(), waitlistPosition: null },
      });
      const filled = p.match.slotsFilled + 1;
      await tx.match.update({
        where: { id: p.matchId },
        data: {
          slotsFilled: filled,
          status: filled >= p.match.slotsNeeded ? "full" : p.match.status,
        },
      });
      return { userId: p.userId, matchId: p.matchId, title: p.match.title, outcome: "approved" as const };
    } else {
      // Hết chỗ -> chuyển sang waitlist
      const last = await tx.matchParticipant.findFirst({
        where: { matchId: p.matchId, status: "waitlisted" },
        orderBy: { waitlistPosition: "desc" },
      });
      await tx.matchParticipant.update({
        where: { id: participantId },
        data: { status: "waitlisted", waitlistPosition: (last?.waitlistPosition ?? 0) + 1 },
      });
      return { userId: p.userId, matchId: p.matchId, title: p.match.title, outcome: "waitlisted" as const };
    }
  });

  if (result.outcome === "approved") {
    await notify(result.userId, "approved", "Được duyệt tham gia ✅", `Bạn đã được duyệt vào "${result.title}"`, { matchId: result.matchId });
  } else {
    await notify(result.userId, "waitlist_invite", "Vào danh sách chờ", `Trận "${result.title}" đã đủ người, bạn được xếp vào danh sách chờ`, { matchId: result.matchId });
  }

  revalidatePath("/", "layout");
}

// ===== HOST: Từ chối / loại =====
export async function rejectParticipant(participantId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.matchParticipant.findUnique({
      where: { id: participantId },
      include: { match: true },
    });
    if (!p) throw new Error("Không tìm thấy đăng ký");
    if (p.match.hostId !== me.id) throw new Error("Chỉ host mới được thao tác");

    const wasApproved = p.status === "approved";
    await tx.matchParticipant.update({
      where: { id: participantId },
      data: { status: wasApproved ? "removed_by_host" : "rejected", decidedAt: new Date() },
    });

    let invitedUserId: string | null = null;
    // Nếu loại người đã duyệt -> giảm slot + mở lại trận + mời người waitlist kế tiếp
    if (wasApproved) {
      await tx.match.update({
        where: { id: p.matchId },
        data: {
          slotsFilled: Math.max(0, p.match.slotsFilled - 1),
          status: p.match.status === "full" ? "open" : p.match.status,
        },
      });
      invitedUserId = await promoteNextWaitlist(tx, p.matchId);
    }

    return { userId: p.userId, matchId: p.matchId, title: p.match.title, wasApproved, invitedUserId };
  });

  await notify(result.userId, "rejected", "Đăng ký không được duyệt", `Chủ kèo đã ${result.wasApproved ? "loại bạn khỏi" : "từ chối bạn ở"} "${result.title}"`, { matchId: result.matchId });
  if (result.invitedUserId) {
    await notify(result.invitedUserId, "waitlist_invite", "Bạn được mời vào trận! 🎉", `Có chỗ trống ở "${result.title}", xác nhận để tham gia`, { matchId: result.matchId });
  }

  revalidatePath("/", "layout");
}

// ===== HOST: Hủy trận =====
export async function cancelMatch(matchId: string, formData?: FormData) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.hostId !== me.id) throw new Error("Chỉ host mới được hủy trận");
  if (match.status === "cancelled") return;

  const reason = formData ? String(formData.get("reason") ?? "").trim() : "";

  await prisma.match.update({
    where: { id: matchId },
    data: { status: "cancelled", cancelReason: reason || null },
  });

  // Báo cho tất cả người đã đăng ký (còn hiệu lực)
  const affected = await prisma.matchParticipant.findMany({
    where: { matchId, status: { in: ["pending", "approved", "waitlisted", "invited"] } },
    select: { userId: true },
  });
  await Promise.all(
    affected.map((p) =>
      notify(p.userId, "match_cancelled", "Trận đã bị hủy", `Chủ kèo đã hủy "${match.title}"${reason ? `: ${reason}` : ""}`, { matchId })
    )
  );
  // TODO(sau): trừ điểm uy tín host khi hủy sát giờ
  revalidatePath("/", "layout");
  redirect("/my");
}

// ===== HOST: Xóa hẳn trận (chỉ khi chưa có ai tham gia) =====
export async function deleteMatch(matchId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Không tìm thấy trận");
  if (match.hostId !== me.id) throw new Error("Chỉ host mới được xóa trận");

  await prisma.match.update({ where: { id: matchId }, data: { deletedAt: new Date() } });
  revalidatePath("/", "layout");
  redirect("/my");
}

// ===== PLAYER: Hủy đăng ký của mình =====
export async function cancelMyParticipation(matchId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: me.id } },
      include: { match: true },
    });
    if (!p) throw new Error("Bạn chưa đăng ký trận này");

    const wasApproved = p.status === "approved";
    // Hủy sát giờ = đã được duyệt & còn <3h tới giờ bắt đầu (hoặc đã qua giờ)
    const lateCancel =
      wasApproved && p.match.startsAt.getTime() - Date.now() < 3 * 3_600_000;

    await tx.matchParticipant.update({
      where: { id: p.id },
      data: { status: "cancelled_by_user" },
    });

    let invitedUserId: string | null = null;
    if (wasApproved) {
      await tx.match.update({
        where: { id: matchId },
        data: {
          slotsFilled: Math.max(0, p.match.slotsFilled - 1),
          status: p.match.status === "full" ? "open" : p.match.status,
        },
      });
      invitedUserId = await promoteNextWaitlist(tx, matchId);
      if (lateCancel) {
        await tx.user.update({
          where: { id: me.id },
          data: { lateCancelCount: { increment: 1 } },
        });
      }
    }
    return { hostId: p.match.hostId, title: p.match.title, invitedUserId, lateCancel };
  });

  // Hủy sát giờ -> tính lại uy tín ngay
  if (result.lateCancel) await recomputeUserStats(me.id);

  // Báo host có người hủy + mời người chờ kế tiếp (nếu có)
  await notify(result.hostId, "system", "Có người hủy tham gia", `${me.nickname ?? me.fullName} đã hủy ở "${result.title}"`, { matchId });
  if (result.invitedUserId) {
    await notify(result.invitedUserId, "waitlist_invite", "Bạn được mời vào trận! 🎉", `Có chỗ trống ở "${result.title}", xác nhận để tham gia`, { matchId });
  }

  revalidatePath(`/matches/${matchId}`);
}

// ===== PLAYER: Nhận lời mời từ waitlist =====
export async function acceptInvite(matchId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: me.id } },
      include: { match: true },
    });
    if (!p || p.status !== "invited") throw new Error("Lời mời không còn hiệu lực");
    if (p.match.slotsFilled >= p.match.slotsNeeded) {
      throw new Error("Rất tiếc, chỗ vừa bị lấp. Bạn vẫn ở trong danh sách chờ.");
    }
    await tx.matchParticipant.update({
      where: { id: p.id },
      data: { status: "approved", decidedAt: new Date() },
    });
    const filled = p.match.slotsFilled + 1;
    await tx.match.update({
      where: { id: matchId },
      data: { slotsFilled: filled, status: filled >= p.match.slotsNeeded ? "full" : p.match.status },
    });
    return { hostId: p.match.hostId, title: p.match.title };
  });

  await notify(result.hostId, "system", "Người chờ đã nhận lời", `${me.nickname ?? me.fullName} đã xác nhận tham gia "${result.title}"`, { matchId });
  revalidatePath(`/matches/${matchId}`);
}

// ===== PLAYER: Từ chối lời mời từ waitlist =====
export async function declineInvite(matchId: string) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const result = await prisma.$transaction(async (tx) => {
    const p = await tx.matchParticipant.findUnique({
      where: { matchId_userId: { matchId, userId: me.id } },
      include: { match: true },
    });
    if (!p || p.status !== "invited") throw new Error("Lời mời không còn hiệu lực");
    await tx.matchParticipant.update({
      where: { id: p.id },
      data: { status: "cancelled_by_user" },
    });
    const invitedUserId = await promoteNextWaitlist(tx, matchId);
    return { title: p.match.title, invitedUserId };
  });

  if (result.invitedUserId) {
    await notify(result.invitedUserId, "waitlist_invite", "Bạn được mời vào trận! 🎉", `Có chỗ trống ở "${result.title}", xác nhận để tham gia`, { matchId });
  }
  revalidatePath(`/matches/${matchId}`);
}

// ===== Helper =====
type MatchReq = { genderReq: string; ageMin: number | null; ageMax: number | null; skillReq: string };
type UserInfo = { gender: string | null; birthYear: number | null };

function checkRequirements(match: MatchReq, user: UserInfo): boolean {
  if (match.genderReq !== "any" && user.gender && match.genderReq !== user.gender) return false;
  if (user.birthYear) {
    const age = new Date().getFullYear() - user.birthYear;
    if (match.ageMin && age < match.ageMin) return false;
    if (match.ageMax && age > match.ageMax) return false;
  }
  // Trình độ: chỉ cảnh báo, không có dữ liệu trình độ ở đây nên bỏ qua ở MVP
  return true;
}
