import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requestOtp, verifyOtp } from "@/lib/actions/auth-actions";
import { GoogleLoginButton } from "@/components/GoogleLoginButton";

// Firebase đã cấu hình chưa? (có cả key client lẫn server)
const firebaseOn =
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && !!process.env.FIREBASE_CLIENT_EMAIL;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const phone = typeof sp.phone === "string" ? sp.phone : "";
  const error = typeof sp.error === "string" ? sp.error : "";
  const step = phone ? "verify" : "phone";

  // Chế độ dev (khi chưa cấu hình Firebase): hiện mã OTP ngay trên màn hình.
  let devOtp: string | null = null;
  if (!firebaseOn && step === "verify" && process.env.NODE_ENV !== "production") {
    const c = await prisma.otpChallenge.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    devOtp = c?.code ?? null;
  }

  const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="mx-auto max-w-sm space-y-5 py-8">
      <div className="text-center">
        <img src="/logo.png" alt="Matchup" className="mx-auto h-14 w-auto rounded-xl" />
        <h1 className="mt-3 text-xl font-bold">Đăng nhập Matchup</h1>
        <p className="text-sm text-slate-500">Tham gia cộng đồng thể thao gần bạn</p>
      </div>

      {firebaseOn ? (
        <>
          <GoogleLoginButton />
          <p className="text-center text-xs text-slate-400">
            Đăng nhập nhanh bằng Google. Bạn có thể thêm số điện thoại trong hồ sơ sau.
          </p>
        </>
      ) : (
        <>
          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}
          {step === "phone" ? (
            <form action={requestOtp} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
              <label className="block text-sm font-medium text-slate-700">Số điện thoại</label>
              <input name="phone" type="tel" inputMode="numeric" placeholder="0901234567" className={input} required autoFocus />
              <button className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                Gửi mã OTP
              </button>
            </form>
          ) : (
            <form action={verifyOtp} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
              <input type="hidden" name="phone" value={phone} />
              <p className="text-sm text-slate-600">
                Đã gửi mã tới <span className="font-semibold">{phone}</span>
              </p>
              {devOtp && (
                <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  🔧 <b>Chế độ dev:</b> mã của bạn là{" "}
                  <span className="text-lg font-bold tracking-widest">{devOtp}</span>
                </p>
              )}
              <label className="block text-sm font-medium text-slate-700">Nhập mã OTP</label>
              <input name="code" inputMode="numeric" maxLength={6} placeholder="6 số" className={`${input} tracking-widest`} required autoFocus />
              <button className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                Xác nhận
              </button>
              <Link href="/login" className="block text-center text-xs text-slate-500 hover:text-brand">
                ← Đổi số điện thoại
              </Link>
            </form>
          )}
        </>
      )}
    </div>
  );
}
