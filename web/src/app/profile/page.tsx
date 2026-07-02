import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { updateProfile } from "@/lib/actions/profile-actions";
import { logout } from "@/lib/actions/auth-actions";
import { TrustBadge } from "@/components/TrustBadge";
import { AvatarUpload } from "@/components/AvatarUpload";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const welcome = sp.welcome === "1";
  const me = await getCurrentUser();

  if (!me) {
    return (
      <div className="mx-auto max-w-sm space-y-4 py-8 text-center">
        <p className="text-slate-500">Bạn chưa đăng nhập.</p>
        <Link href="/login" className="inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const label = "block text-sm font-medium text-slate-700 mb-1";
  // Đổi ảnh (lưu ổ đĩa) chỉ bật ở bản dev; bản online dùng ảnh Google (đổi ảnh online sẽ thêm sau).
  const canUploadAvatar = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {welcome && (
        <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          🎉 Chào mừng bạn! Hoàn thiện hồ sơ để tìm kèo phù hợp hơn nhé.
        </p>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Hồ sơ của tôi</h1>
        <form action={logout}>
          <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
            Đăng xuất
          </button>
        </form>
      </div>

      {/* Thống kê uy tín */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Uy tín"><TrustBadge score={me.trustScore} /></Stat>
        <Stat label="Đánh giá">⭐ {me.ratingAvg.toFixed(1)} ({me.ratingCount})</Stat>
        <Stat label="Số trận">{me.matchesPlayed}</Stat>
        <Stat label="Tỷ lệ hủy">{me.cancelRate.toFixed(0)}%</Stat>
      </div>

      {/* Form thông tin */}
      <form action={updateProfile} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div>
          <label className={label}>Ảnh đại diện</label>
          {canUploadAvatar ? (
            <AvatarUpload current={me.avatarUrl} name={me.nickname ?? me.fullName} />
          ) : me.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.avatarUrl} alt="avatar" className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-200" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand text-2xl font-bold text-white">
              {(me.nickname ?? me.fullName).charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Họ tên</label>
            <input name="fullName" defaultValue={me.fullName} className={input} required />
          </div>
          <div>
            <label className={label}>Biệt danh</label>
            <input name="nickname" defaultValue={me.nickname ?? ""} className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Số điện thoại</label>
            <input name="phone" type="tel" inputMode="numeric" defaultValue={me.phone ?? ""} placeholder="0901234567" className={input} />
          </div>
          <div>
            <label className={label}>Năm sinh</label>
            <input name="birthYear" type="number" min={1950} max={2020} defaultValue={me.birthYear ?? ""} className={input} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Giới tính</label>
            <select name="gender" defaultValue={me.gender ?? ""} className={input}>
              <option value="">--</option>
              <option value="male">Nam</option>
              <option value="female">Nữ</option>
              <option value="other">Khác</option>
            </select>
          </div>
          <div>
            <label className={label}>Thành phố</label>
            <input name="city" defaultValue={me.city ?? ""} className={input} placeholder="TP.HCM" />
          </div>
          <div>
            <label className={label}>Quận/Huyện</label>
            <input name="district" defaultValue={me.district ?? ""} className={input} placeholder="Quận 1" />
          </div>
        </div>

        <button className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
          Lưu hồ sơ
        </button>
      </form>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
      <p className="text-xs uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-800">{children}</p>
    </div>
  );
}
