import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { markAllNotificationsRead } from "@/lib/actions/notification-actions";

function timeAgo(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "vừa xong";
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}

export default async function NotificationsPage() {
  const me = await getCurrentUser();
  if (!me) {
    return (
      <div className="mx-auto max-w-md py-8 text-center text-slate-500">
        <p>Đăng nhập để xem thông báo.</p>
        <Link href="/login" className="mt-3 inline-block rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">
          Đăng nhập
        </Link>
      </div>
    );
  }

  const items = await prisma.notification.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thông báo</h1>
        {items.some((n) => !n.isRead) && (
          <form action={markAllNotificationsRead}>
            <button className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100">
              Đánh dấu đã đọc hết
            </button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400">
          Chưa có thông báo nào.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const matchId = (n.dataJson as { matchId?: string } | null)?.matchId;
            const body = (
              <div className={`rounded-xl border p-3 ${n.isRead ? "border-slate-200 bg-white" : "border-brand/30 bg-green-50"}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-semibold text-slate-800">{n.title}</p>
                  {!n.isRead && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                </div>
                <p className="text-sm text-slate-600">{n.body}</p>
                <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </div>
            );
            return (
              <li key={n.id}>
                {matchId ? <Link href={`/matches/${matchId}`}>{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
