import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { formatDateTime, MATCH_STATUS_LABEL } from "@/lib/format";

const PARTICIPANT_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  waitlisted: "Danh sách chờ",
  invited: "Được mời",
  rejected: "Bị từ chối",
  cancelled_by_user: "Đã hủy",
  removed_by_host: "Bị loại",
};

export default async function MyMatchesPage() {
  const me = await getCurrentUser();
  if (!me) {
    return <p className="text-slate-500">Đăng nhập để xem kèo của bạn.</p>;
  }

  const [hosted, joined] = await Promise.all([
    prisma.match.findMany({
      where: { hostId: me.id, deletedAt: null },
      include: { sport: true, venue: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.matchParticipant.findMany({
      where: { userId: me.id },
      include: { match: { include: { sport: true, venue: true } } },
      orderBy: { joinedAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kèo của tôi</h1>

      <section>
        <h2 className="mb-3 font-semibold text-slate-700">Kèo tôi tạo ({hosted.length})</h2>
        <div className="space-y-2">
          {hosted.length === 0 && <p className="text-sm text-slate-400">Chưa tạo kèo nào.</p>}
          {hosted.map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-brand">
              <div>
                <p className="font-medium">{m.sport.icon} {m.title}</p>
                <p className="text-xs text-slate-500">{formatDateTime(m.startsAt)} · {m.venue.name}</p>
              </div>
              <span className="text-xs text-slate-500">
                {m.slotsFilled}/{m.slotsNeeded} · {MATCH_STATUS_LABEL[m.status]}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold text-slate-700">Kèo tôi tham gia ({joined.length})</h2>
        <div className="space-y-2">
          {joined.length === 0 && <p className="text-sm text-slate-400">Chưa tham gia kèo nào.</p>}
          {joined.map((p) => (
            <Link key={p.id} href={`/matches/${p.match.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 hover:border-brand">
              <div>
                <p className="font-medium">{p.match.sport.icon} {p.match.title}</p>
                <p className="text-xs text-slate-500">{formatDateTime(p.match.startsAt)} · {p.match.venue.name}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {PARTICIPANT_STATUS_LABEL[p.status] ?? p.status}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
