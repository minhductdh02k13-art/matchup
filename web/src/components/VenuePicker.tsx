"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const VenuePickerMap = dynamic(() => import("@/components/VenuePickerMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg bg-slate-100 text-sm text-slate-400">
      Đang tải bản đồ…
    </div>
  ),
});

const HCMC_CENTER: [number, number] = [10.7769, 106.7009];

type Suggestion = { display_name: string; lat: string; lon: string };

export function VenuePicker() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");

  async function search() {
    if (query.trim().length < 3) return;
    setSearching(true);
    try {
      // Nominatim (OpenStreetMap) — geocoding miễn phí, ưu tiên Việt Nam.
      const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=vn&limit=5&q=${encodeURIComponent(query)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "vi" } });
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  function choose(s: Suggestion) {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setPos({ lat, lng });
    setAddress(s.display_name);
    setSuggestions([]);
    setQuery(s.display_name);
  }

  const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <div className="space-y-3">
      {/* Tên sân */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Tên sân</label>
        <input name="venueName" className={input} placeholder="VD: Sân bóng Tao Đàn" required />
      </div>

      {/* Tìm địa chỉ */}
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">
          Địa chỉ / vị trí sân (gõ để tìm, hoặc bấm thẳng lên bản đồ)
        </label>
        <div className="flex gap-2">
          <input
            className={input}
            placeholder="VD: 123 Nguyễn Huệ, Quận 1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                search();
              }
            }}
          />
          <button
            type="button"
            onClick={search}
            disabled={searching}
            className="whitespace-nowrap rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {searching ? "Đang tìm…" : "Tìm"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (query.trim())
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
                  "_blank"
                );
            }}
            className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand"
          >
            Google Maps ↗
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Mẹo: bấm <b>Tìm</b> để chọn nhanh (bản đồ free), hoặc <b>Google Maps ↗</b> để tra chính
          xác rồi bấm đúng điểm đó lên bản đồ dưới đây để ghim.
        </p>

        {suggestions.length > 0 && (
          <ul className="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200 bg-white text-sm shadow">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(s)}
                  className="block w-full px-3 py-2 text-left hover:bg-slate-50"
                >
                  {s.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bản đồ chọn điểm */}
      <VenuePickerMap
        value={pos}
        center={pos ? [pos.lat, pos.lng] : HCMC_CENTER}
        onPick={(lat, lng) => setPos({ lat, lng })}
      />
      {pos ? (
        <p className="text-xs text-slate-500">
          ✅ Đã chọn vị trí: {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)} ·{" "}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`}
            target="_blank"
            rel="noreferrer"
            className="text-brand underline"
          >
            Kiểm tra trên Google Maps
          </a>
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Chưa chọn vị trí — bấm lên bản đồ hoặc tìm địa chỉ ở trên.
        </p>
      )}

      {/* Giá trị gửi kèm form */}
      <input type="hidden" name="venueAddress" value={address} />
      <input type="hidden" name="venueLat" value={pos?.lat ?? ""} />
      <input type="hidden" name="venueLng" value={pos?.lng ?? ""} />
    </div>
  );
}
