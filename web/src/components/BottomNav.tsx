import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MobileNavBar } from "@/components/MobileNavBar";

// Server wrapper: lấy số thông báo chưa đọc rồi truyền xuống thanh nav mobile.
export async function BottomNav() {
  const me = await getCurrentUser();
  const unread = me
    ? await prisma.notification.count({ where: { userId: me.id, isRead: false } })
    : 0;
  return <MobileNavBar unread={unread} />;
}
