"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function markAllNotificationsRead() {
  const me = await getCurrentUser();
  if (!me) return;
  await prisma.notification.updateMany({
    where: { userId: me.id, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/", "layout");
}
