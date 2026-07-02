import Link from "next/link";
import { cookies } from "next/headers";
import { getMatches } from "@/lib/queries";
import { getCurrentUser } from "@/lib/session";
import { GEO_COOKIE } from "@/lib/cookies";
import { MatchCard } from "@/components/MatchCard";
import { MatchesMap } from "@/components/MatchesMap";
import { LocateButton } from "@/components/LocateButton";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const me = await getCurrentUser();

  // Vị trí để tính khoảng cách: ưu tiên GPS vừa định vị (cookie), sau đó tới hồ sơ.
  const store = await cookies();
  const geo = store.get(GEO_COOKIE)?.value?.split(",").map(Number);
  const fromLat = geo && geo.length === 2 ? geo[0] : me?.homeLat ?? null;
  const fromLng = geo && geo.length === 2 ? geo[1] : me?.homeLng ?? null;
  const located = fromLat != null && fromLng != null;

  const sport = typeof sp.sport === "string" && sp.sport ? sp.sport : undefined;
  const radiusKm = typeof sp.radius === "string" && sp.radius ? Number(sp.radius) : undefined;
  const onlyOpen = sp.open === "1";
  const sort = (typeof sp.sort === "string" ? sp.sort : "soonest") as
    | "soonest"
    | "newest"
    | "nearest";

  const matches = await getMatches({ sport, radiusKm, onlyOpen, sort, fromLat, fromLng });

  const select = "rounded-md border border-slate-300 bg-white px-3 py-2 text-sm";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Tìm kèo gần bạn</h1>
          <p className="text-sm text-slate-500">
            {located ? "📍 Đã có vị trí — hiện khoảng cách tới từng kèo" : "Chưa có vị trí — bấm định vị để xem khoảng cách"} ·{" "}
            {matches.length} kèo
          </p>
          <LocateButton located={located} />
        </div>
        <Link
          href="/matches/new"
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          + Tạo kèo
        </Link>
      </div>

      {/* Bản đồ các kèo (Leaflet + OpenStreetMap, miễn phí) */}
      <MatchesMap
        points={matches.map((m) => ({
          id: m.id,
          title: m.title,
          lat: m.venue.lat,
          lng: m.venue.lng,
          icon: m.sport.icon ?? "📍",
          missing: Math.max(0, m.slotsNeeded - m.slotsFilled),
        }))}
      />

      {/* Bộ lọc */}
      <form method="get" className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <select name="sport" defaultValue={sport ?? ""} className={select}>
          <option value="">Tất cả môn</option>
          <option value="football">⚽ Bóng đá</option>
          <option value="badminton">🏸 Cầu lông</option>
        </select>

        <select name="radius" defaultValue={(sp.radius as string) ?? ""} className={select}>
          <option value="">Mọi khoảng cách</option>
          <option value="3">Trong 3 km</option>
          <option value="5">Trong 5 km</option>
          <option value="10">Trong 10 km</option>
        </select>

        <select name="sort" defaultValue={sort} className={select}>
          <option value="soonest">Sắp diễn ra</option>
          <option value="newest">Mới nhất</option>
          <option value="nearest">Gần nhất</option>
        </select>

        <label className="flex items-center gap-1.5 text-sm text-slate-600">
          <input type="checkbox" name="open" value="1" defaultChecked={onlyOpen} />
          Còn chỗ
        </label>

        <button type="submit" className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Lọc
        </button>
      </form>

      {/* Danh sách */}
      {matches.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500">
          Không có kèo nào khớp bộ lọc. Thử mở rộng khoảng cách hoặc bỏ lọc.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {matches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </div>
      )}
    </div>
  );
}
