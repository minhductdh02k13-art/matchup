"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { UID_COOKIE } from "@/lib/session";
import { verifyFirebaseToken } from "@/lib/verify-firebase-token";
import { recomputeUserStats } from "@/lib/trust";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 phút

async function startSession(userId: string) {
  const store = await cookies();
  store.set(UID_COOKIE, userId, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

// Chuẩn hóa SĐT: bỏ khoảng trắng, đổi +84 -> 0
function normalizePhone(raw: string): string {
  let p = raw.replace(/\s|-/g, "").trim();
  if (p.startsWith("+84")) p = "0" + p.slice(3);
  if (p.startsWith("84") && p.length > 9) p = "0" + p.slice(2);
  return p;
}

function genCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 số
}

// ===== Bước 1: gửi mã OTP =====
export async function requestOtp(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!/^0\d{9}$/.test(phone)) {
    redirect(`/login?error=${encodeURIComponent("Số điện thoại không hợp lệ (VD: 0901234567)")}`);
  }

  const code = genCode();
  await prisma.otpChallenge.create({
    data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });

  // TODO: khi có dịch vụ SMS/Zalo ZNS -> gửi `code` tới `phone` ở đây.
  // Giai đoạn dev: mã sẽ được hiển thị trên màn hình /login (xem devOtp trong page).

  redirect(`/login?phone=${phone}`);
}

// ===== Bước 2: xác thực mã =====
export async function verifyOtp(formData: FormData) {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();

  const challenge = await prisma.otpChallenge.findFirst({
    where: { phone, code, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!challenge) {
    redirect(`/login?phone=${phone}&error=${encodeURIComponent("Mã không đúng hoặc đã hết hạn")}`);
  }

  await prisma.otpChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  // Tìm user theo SĐT, chưa có thì tạo mới (hồ sơ tối thiểu)
  const existing = await prisma.user.findUnique({ where: { phone } });
  const user =
    existing ??
    (await prisma.user.create({
      data: { phone, fullName: `Người dùng ${phone.slice(-4)}` },
    }));

  await startSession(user.id);

  revalidatePath("/", "layout");
  // User mới -> đưa tới hồ sơ để hoàn thiện
  redirect(existing ? "/" : "/profile?welcome=1");
}

// ===== Đăng nhập bằng Firebase (idToken từ trình duyệt) — hỗ trợ cả Google lẫn SĐT =====
export async function loginWithFirebase(idToken: string) {
  const decoded = await verifyFirebaseToken(idToken);

  const phone = decoded.phone_number ? normalizePhone(decoded.phone_number) : null;
  const email = decoded.email ?? null;
  const name = (decoded.name as string | undefined) ?? null;
  const picture = (decoded.picture as string | undefined) ?? null;

  // Tìm user theo SĐT trước, rồi tới email
  let user = phone ? await prisma.user.findUnique({ where: { phone } }) : null;
  if (!user && email) user = await prisma.user.findUnique({ where: { email } });

  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: {
        phone: phone ?? undefined,
        email: email ?? undefined,
        fullName: name ?? (phone ? `Người dùng ${phone.slice(-4)}` : "Người dùng mới"),
        avatarUrl: picture ?? undefined,
      },
    });
  }

  await startSession(user.id);
  // Cập nhật uy tín định kỳ (no-show / hủy được phản ánh sau mỗi lần đăng nhập)
  if (!isNew) await recomputeUserStats(user.id).catch(() => {});
  revalidatePath("/", "layout");
  return { isNew };
}

// ===== Đăng xuất =====
export async function logout() {
  const store = await cookies();
  store.delete(UID_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
