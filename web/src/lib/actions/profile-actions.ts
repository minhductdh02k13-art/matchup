"use server";

import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_EXT = ["jpg", "jpeg", "png", "webp", "gif"];

// Lưu ảnh avatar vào public/uploads (giai đoạn dev). Trả về đường dẫn public, hoặc null nếu không có ảnh.
// TODO(deploy): đổi sang upload lên Firebase Storage / Cloudinary (đĩa server serverless không giữ file).
async function saveAvatar(file: File, userId: string): Promise<string | null> {
  if (!file || file.size === 0) return null;
  // Bản online (Vercel) không ghi được ổ đĩa -> bỏ qua (dùng ảnh Google). Sẽ chuyển sang cloud storage sau.
  if (process.env.NODE_ENV === "production") return null;
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Ảnh quá lớn (tối đa 5MB)");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  if (!ALLOWED_EXT.includes(ext)) throw new Error("Định dạng ảnh không hỗ trợ");

  const bytes = Buffer.from(await file.arrayBuffer());
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  const filename = `${userId}-${Date.now()}.${ext}`;
  await writeFile(path.join(dir, filename), bytes);
  return `/uploads/${filename}`;
}

export async function updateProfile(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) throw new Error("Chưa đăng nhập");

  const get = (k: string) => {
    const v = String(formData.get(k) ?? "").trim();
    return v === "" ? null : v;
  };

  const birthYearRaw = get("birthYear");
  const birthYear = birthYearRaw ? Number(birthYearRaw) : null;

  // SĐT: chuẩn hoá + kiểm tra không trùng người khác
  let phone = get("phone");
  if (phone) {
    phone = phone.replace(/\s|-/g, "");
    if (!/^0\d{9}$/.test(phone)) throw new Error("Số điện thoại không hợp lệ (VD: 0901234567)");
    if (phone !== me.phone) {
      const taken = await prisma.user.findUnique({ where: { phone } });
      if (taken && taken.id !== me.id) throw new Error("Số điện thoại đã được dùng bởi tài khoản khác");
    }
  }

  const avatarFile = formData.get("avatar") as File | null;
  const newAvatarUrl = avatarFile ? await saveAvatar(avatarFile, me.id) : null;

  await prisma.user.update({
    where: { id: me.id },
    data: {
      fullName: get("fullName") ?? me.fullName,
      nickname: get("nickname"),
      phone: phone || null,
      city: get("city"),
      district: get("district"),
      gender: (get("gender") as "male" | "female" | "other" | null) ?? undefined,
      birthYear: birthYear && !isNaN(birthYear) ? birthYear : null,
      // Chỉ đổi avatar khi có upload ảnh mới
      ...(newAvatarUrl ? { avatarUrl: newAvatarUrl } : {}),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/profile");
}
