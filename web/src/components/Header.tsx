import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth-actions";
import { TrustBadge } from "@/components/TrustBadge";

export async function Header() {
  const me = await getCurrentUser();
  const unread = me
    ? await prisma.notification.count({ where: { userId: me.id, isRead: false } })
    : 0;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900">
          {/* Thay logo: đổi file public/logo.png là xong */}
          <img src="/logo.png" alt="Matchup" className="h-9 w-auto rounded-lg" />
          <span>Match<span className="text-brand">up</span></span>
        </Link>

        <nav className="ml-2 hidden gap-4 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/" className="hover:text-brand">Tìm kèo</Link>
          <Link href="/matches/new" className="hover:text-brand">Tạo kèo</Link>
          <Link href="/my" className="hover:text-brand">Kèo của tôi</Link>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {me ? (
            <>
              <Link href="/notifications" className="relative text-xl leading-none" title="Thông báo">
                🔔
                {unread > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="flex items-center gap-2 text-sm hover:opacity-80">
                {me.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover ring-1 ring-slate-200" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                    {(me.nickname ?? me.fullName).charAt(0).toUpperCase()}
                  </span>
                )}
                <TrustBadge score={me.trustScore} />
                <span className="hidden font-medium sm:inline">{me.nickname ?? me.fullName}</span>
              </Link>
              <form action={logout}>
                <button className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-green-700"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
