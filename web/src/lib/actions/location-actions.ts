"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { GEO_COOKIE } from "@/lib/cookies";

// Lưu vị trí GPS: vào cookie (dùng ngay, cả khi chưa đăng nhập) + vào hồ sơ nếu đã đăng nhập.
export async function saveMyLocation(lat: number, lng: number) {
  if (!isFinite(lat) || !isFinite(lng)) throw new Error("Toạ độ không hợp lệ");

  const store = await cookies();
  store.set(GEO_COOKIE, `${lat},${lng}`, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  const me = await getCurrentUser();
  if (me) {
    await prisma.user.update({
      where: { id: me.id },
      data: { homeLat: lat, homeLng: lng },
    });
  }

  revalidatePath("/", "layout");
}
