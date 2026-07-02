import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";

// Tạo 1 thông báo in-app cho user. dataJson để đính kèm id trận... (mở link khi bấm).
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data?: Prisma.InputJsonValue
) {
  await prisma.notification.create({
    data: { userId, type, title, body, dataJson: data },
  });
}
