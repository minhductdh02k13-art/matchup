import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const COOKIE = "uid";

// Trả về user đang đăng nhập (theo cookie session), hoặc null nếu chưa đăng nhập.
export async function getCurrentUser() {
  const store = await cookies();
  const uid = store.get(COOKIE)?.value;
  if (!uid) return null;

  const user = await prisma.user.findUnique({ where: { id: uid } });
  return user && user.status !== "banned" && !user.deletedAt ? user : null;
}

export const UID_COOKIE = COOKIE;
