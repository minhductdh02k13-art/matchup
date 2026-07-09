import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatchDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { haversineKm, formatDateTime, formatTimeRange, formatVnd, costPerPerson, MATCH_STATUS_LABEL, SKILL_LABEL } from "@/lib/format";
import { TrustBadge } from "@/components/TrustBadge";
import { isRiskyUser } from "@/lib/trust";
import { ConfirmButton } from "@/components/ConfirmButton";
import { CheckInButton } from "@/components/CheckInButton";
import { RatingForm } from "@/components/RatingForm";
import { ReportButton } from "@/components/ReportButton";
import { joinMatch, approveParticipant, rejectParticipant, cancelMyParticipation, cancelMatch, deleteMatch, acceptInvite, declineInvite } from "@/lib/actions/match-actions";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [match, me] = await Promise.all([getMatchDetail(id), getCurrentUser()]);
  if (!match) notFound();

  const isHost = me?.id === match.hostId;
  const mine = match.participants.find((p) => p.userId === me?.id);

  const approved = match.participants.filter((p) => p.status === "approved");
  const pending = match.participants.filter((p) => p.status === "pending");
  const waitlist = match.participants
    .filter((p) => p.status === "waitlisted")
    .sort((a, b) => (a.waitlistPosition ?? 0) - (b.waitlistPosition ?? 0));

  const missing = Math.max(0, match.slotsNeeded - match.slotsFilled);
  const perPerson = costPerPerson(match.totalCost, match.slotsFilled || 1);
  const distanceKm =
    me?.homeLat != null && me?.homeLng != null
      ? haversineKm(me.homeLat, me.homeLng, match.venue.lat, match.venue.lng)
      : null;

  const canJoin =
    me &&
    !isHost &&
    (!mine || ["cancelled_by_user", "rejected", "removed_by_host"].includes(mine.status)) &&
    ["open", "full"].includes(match.status);

  // ===== Check-in & Đánh giá =====
  const now = Date.now();
  const iAmIn = isHost || mine?.status === "approved"; // được phép có mặt ở trận
  const myCheckin = match.checkIns.find((c) => c.userId === me?.id);
  const checkinOpen =
    match.status !== "cancelled" &&
    now >= match.startsAt.getTime() - 3_600_000 &&
    now <= match.endsAt.getTime() + 2 * 3_600_000;
  const showCheckIn = !!me && iAmIn && checkinOpen && !myCheckin;

  const matchEnded = match.status !== "cancelled" && now > match.endsAt.getTime();
  const checkedInUserIds = new Set(match.checkIns.map((c) => c.userId));
  const iCheckedIn = !!me && checkedInUserIds.has(me.id);
  const myReview = (revieweeId: string) =>
    match.reviews.find((r) => r.reviewerId === me?.id && r.revieweeId === revieweeId);
  // Người chơi đã check-in để host chấm (không tính chính host)
  const checkedInPlayers = approved.filter((p) => checkedInUserIds.has(p.userId) && p.userId !== match.hostId);

  // Link Google Maps theo TOẠ ĐỘ chính xác (miễn phí, chỉ là URL — không cần API key)
  const gmapView = `https://www.google.com/maps/search/?api=1&query=${match.venue.lat},${match.venue.lng}`;
  const gmapDir = `https://www.google.com/maps/dir/?api=1&destination=${match.venue.lat},${match.venue.lng}`;

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-slate-500 hover:text-brand">← Về danh sách</Link>

      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm font-medium text-slate-500">
            <span className="text-xl">{match.sport.icon}</span> {match.sport.name}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {MATCH_STATUS_LABEL[match.status] ?? match.status}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{match.title}</h1>

        <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
          <p>🗓️ {formatDateTime(match.startsAt)} ({formatTimeRange(match.startsAt, match.endsAt)})</p>
          <p>🎯 Trình độ: {SKILL_LABEL[match.skillReq] ?? match.skillReq}</p>
          <p>
            📍 {match.venue.name}
            {match.venue.district ? `, ${match.venue.district}` : ""}
            {distanceKm != null && <span className="ml-1 font-medium text-brand">· {distanceKm.toFixed(1)} km</span>}
          </p>
          <p className="flex gap-3">
            <a href={gmapView} target="_blank" rel="noreferrer" className="text-brand underline">
              🗺️ Xem trên Google Maps
            </a>
            <a href={gmapDir} target="_blank" rel="noreferrer" className="text-brand underline">
              🧭 Chỉ đường
            </a>
          </p>
        </div>

        {match.description && <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{match.description}</p>}
        {match.rules && (
          <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">📋 Quy định: {match.rules}</p>
        )}
      </div>

      {/* Host + Sĩ số + Chi phí */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Chủ kèo</p>
          <div className="mt-2 flex items-center gap-2">
            <TrustBadge score={match.host.trustScore} />
            <span className="font-semibold">{match.host.nickname ?? match.host.fullName}</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            ⭐ {match.host.ratingAvg.toFixed(1)} ({match.host.ratingCount}) · {match.host.matchesPlayed} trận
          </p>
          {me && !isHost && (
            <div className="mt-2">
              <ReportButton matchId={match.id} reportedUserId={match.hostId} label="chủ kèo" />
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Sĩ số</p>
          <p className="mt-2 text-2xl font-bold">
            {match.slotsFilled}<span className="text-base font-normal text-slate-400">/{match.slotsNeeded}</span>
          </p>
          <p className="text-sm font-medium text-brand">{missing > 0 ? `Còn thiếu ${missing}` : "Đã đủ người"}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-medium uppercase text-slate-400">Chi phí</p>
          <p className="mt-2 text-2xl font-bold">{formatVnd(perPerson)}</p>
          <p className="text-sm text-slate-500">/người (tổng {formatVnd(match.totalCost)})</p>
        </div>
      </div>

      {match.status === "cancelled" && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          ⚠️ Trận này đã bị hủy.{match.cancelReason ? ` Lý do: ${match.cancelReason}` : ""}
        </div>
      )}

      {/* Vùng hành động */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {isHost ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Bạn là chủ kèo. Duyệt/loại người chơi ở danh sách bên dưới.</p>
            {match.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <ConfirmButton
                  action={cancelMatch.bind(null, match.id)}
                  message="Hủy trận này? Trận sẽ ẩn khỏi danh sách tìm kèo và mọi người thấy trạng thái đã hủy."
                  className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Hủy trận
                </ConfirmButton>
                {match.participants.length === 0 && (
                  <ConfirmButton
                    action={deleteMatch.bind(null, match.id)}
                    message="Xóa hẳn trận này? Không thể hoàn tác."
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                  >
                    Xóa hẳn
                  </ConfirmButton>
                )}
              </div>
            )}
          </div>
        ) : mine && mine.status === "invited" ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-brand">🎉 Bạn được mời vào trận! Xác nhận để tham gia.</p>
            <div className="flex gap-2">
              <form action={acceptInvite.bind(null, match.id)}>
                <button className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-green-700">Nhận lời</button>
              </form>
              <form action={declineInvite.bind(null, match.id)}>
                <button className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Từ chối</button>
              </form>
            </div>
          </div>
        ) : mine && ["pending", "approved", "waitlisted"].includes(mine.status) ? (
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Trạng thái của bạn:{" "}
              <span className="text-brand">
                {mine.status === "pending" && "Đang chờ duyệt"}
                {mine.status === "approved" && "Đã được duyệt ✅"}
                {mine.status === "waitlisted" && `Trong danh sách chờ (#${mine.waitlistPosition})`}
              </span>
            </p>
            <form action={cancelMyParticipation.bind(null, match.id)}>
              <button className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                Hủy đăng ký
              </button>
            </form>
          </div>
        ) : canJoin ? (
          <form action={joinMatch.bind(null, match.id)}>
            <button className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-green-700">
              {match.slotsFilled >= match.slotsNeeded ? "Đăng ký vào danh sách chờ" : "Tham gia kèo này"}
            </button>
          </form>
        ) : (
          <p className="text-sm text-slate-400">
            {!me ? "Đăng nhập để tham gia." : "Không thể tham gia trận này."}
          </p>
        )}
      </div>

      {/* Check-in tại sân */}
      {me && iAmIn && (checkinOpen || myCheckin) && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="mb-2 font-semibold">Check-in tại sân</h3>
          {myCheckin ? (
            <p className="text-sm font-medium text-green-600">✅ Bạn đã check-in</p>
          ) : (
            <>
              <p className="mb-2 text-xs text-slate-500">
                Bấm khi bạn đã có mặt ở sân (cần bật vị trí, phải ở gần sân trong ~1km).
              </p>
              <CheckInButton matchId={match.id} />
            </>
          )}
        </div>
      )}

      {/* Đánh giá sau trận */}
      {matchEnded && me && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="font-semibold">Đánh giá sau trận</h3>
          {!iCheckedIn ? (
            <p className="text-sm text-slate-400">Chỉ người đã check-in mới được đánh giá.</p>
          ) : isHost ? (
            checkedInPlayers.length === 0 ? (
              <p className="text-sm text-slate-400">Chưa có người chơi nào check-in để đánh giá.</p>
            ) : (
              checkedInPlayers.map((p) => (
                <RatingForm
                  key={p.id}
                  matchId={match.id}
                  revieweeId={p.userId}
                  revieweeName={p.user.nickname ?? p.user.fullName}
                  direction="host_to_player"
                  existingRating={myReview(p.userId)?.rating}
                  existingComment={myReview(p.userId)?.comment ?? undefined}
                />
              ))
            )
          ) : (
            <RatingForm
              matchId={match.id}
              revieweeId={match.hostId}
              revieweeName={match.host.nickname ?? match.host.fullName}
              direction="player_to_host"
              existingRating={myReview(match.hostId)?.rating}
              existingComment={myReview(match.hostId)?.comment ?? undefined}
            />
          )}
        </div>
      )}

      {/* Danh sách người tham gia */}
      <div className="space-y-4">
        <ParticipantGroup title={`Đã tham gia (${approved.length})`} items={approved} />

        {isHost && pending.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-semibold">Chờ duyệt ({pending.length})</h3>
            <ul className="space-y-2">
              {pending.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-2">
                  <div className="flex items-center gap-2">
                    <TrustBadge score={p.user.trustScore} />
                    <span className="text-sm font-medium">{p.user.nickname ?? p.user.fullName}</span>
                    {!p.meetsRequirements && (
                      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">Không khớp điều kiện</span>
                    )}
                    {isRiskyUser(p.user) && (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        ⚠️ {p.user.noShowCount >= 2 ? `Vắng ${p.user.noShowCount} lần` : "Uy tín thấp"}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <form action={approveParticipant.bind(null, p.id)}>
                      <button className="rounded-md bg-brand px-3 py-1 text-xs font-medium text-white hover:bg-green-700">Duyệt</button>
                    </form>
                    <form action={rejectParticipant.bind(null, p.id)}>
                      <button className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100">Từ chối</button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {waitlist.length > 0 && (
          <ParticipantGroup title={`Danh sách chờ (${waitlist.length})`} items={waitlist} showPosition />
        )}
      </div>
    </div>
  );
}

function ParticipantGroup({
  title,
  items,
  showPosition,
}: {
  title: string;
  items: { id: string; waitlistPosition: number | null; user: { fullName: string; nickname: string | null; trustScore: number | null } }[];
  showPosition?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">Chưa có ai.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              {showPosition && <span className="w-6 text-slate-400">#{p.waitlistPosition}</span>}
              <TrustBadge score={p.user.trustScore} />
              <span className="font-medium">{p.user.nickname ?? p.user.fullName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
