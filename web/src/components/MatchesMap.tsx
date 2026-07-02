"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "@/components/MapInner";

// Nạp động, tắt SSR: Leaflet cần `window` (chỉ có ở trình duyệt).
const MapInner = dynamic(() => import("@/components/MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[320px] items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-400">
      Đang tải bản đồ…
    </div>
  ),
});

export function MatchesMap({ points }: { points: MapPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-100 text-sm text-slate-400">
        Chưa có kèo nào để hiển thị trên bản đồ.
      </div>
    );
  }

  // Tâm bản đồ = điểm đầu tiên
  const center: [number, number] = [points[0].lat, points[0].lng];
  return <MapInner points={points} center={center} />;
}
