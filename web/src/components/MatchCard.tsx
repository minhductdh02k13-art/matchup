import Link from "next/link";
import { TrustBadge } from "@/components/TrustBadge";
import {
  formatDateTime,
  formatTimeRange,
  formatVnd,
  costPerPerson,
  MATCH_STATUS_LABEL,
  SKILL_LABEL,
} from "@/lib/format";

type Props = {
  match: {
    id: string;
    title: string;
    startsAt: Date;
    endsAt: Date;
    slotsNeeded: number;
    slotsFilled: number;
    totalCost: number;
    skillReq: string;
    status: string;
    distanceKm: number | null;
    host: { fullName: string; nickname: string | null; trustScore: number | null };
    sport: { name: string; icon: string | null };
    venue: { name: string; district: string | null };
  };
};

export function MatchCard({ match: m }: Props) {
  const missing = Math.max(0, m.slotsNeeded - m.slotsFilled);
  const perPerson = costPerPerson(m.totalCost, m.slotsFilled || 1);
  const isOpen = m.status === "open";

  return (
    <Link
      href={`/matches/${m.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
          <span className="text-lg">{m.sport.icon}</span>
          <span>{m.sport.name}</span>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            isOpen ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {MATCH_STATUS_LABEL[m.status] ?? m.status}
        </span>
      </div>

      <h3 className="mt-2 line-clamp-2 font-semibold text-slate-900">{m.title}</h3>

      <div className="mt-2 space-y-1 text-sm text-slate-600">
        <p>🗓️ {formatDateTime(m.startsAt)} ({formatTimeRange(m.startsAt, m.endsAt)})</p>
        <p>
          📍 {m.venue.name}
          {m.venue.district ? `, ${m.venue.district}` : ""}
          {m.distanceKm != null && (
            <span className="ml-1 font-medium text-brand">· {m.distanceKm.toFixed(1)} km</span>
          )}
        </p>
        <p>🎯 {SKILL_LABEL[m.skillReq] ?? m.skillReq}</p>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex items-center gap-1.5 text-sm">
          <TrustBadge score={m.host.trustScore} />
          <span className="text-slate-500">{m.host.nickname ?? m.host.fullName}</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">
            {missing > 0 ? (
              <span className="text-brand">Còn thiếu {missing}</span>
            ) : (
              <span className="text-slate-400">Đủ người</span>
            )}
          </p>
          <p className="text-xs text-slate-500">~{formatVnd(perPerson)}/người</p>
        </div>
      </div>
    </Link>
  );
}
