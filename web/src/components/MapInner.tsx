"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string;
  title: string;
  lat: number;
  lng: number;
  icon: string;
  missing: number;
};

// Icon dạng "pin" tự vẽ (tránh lỗi ảnh marker mặc định của Leaflet khi đóng gói).
function pinIcon(emoji: string, highlight: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:34px;height:34px;border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      background:${highlight ? "#16a34a" : "#64748b"};
      border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);">
      <span style="transform:rotate(45deg);font-size:16px;">${emoji}</span>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -32],
  });
}

export default function MapInner({
  points,
  center,
}: {
  points: MapPoint[];
  center: [number, number];
}) {
  return (
    <MapContainer
      center={center}
      zoom={12}
      scrollWheelZoom={false}
      style={{ height: "320px", width: "100%" }}
      className="z-0 rounded-xl"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={pinIcon(p.icon, p.missing > 0)}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{p.icon} {p.title}</p>
              <p className="text-xs text-slate-500">
                {p.missing > 0 ? `Còn thiếu ${p.missing} người` : "Đã đủ người"}
              </p>
              <Link href={`/matches/${p.id}`} className="text-xs font-medium text-green-700 underline">
                Xem chi tiết →
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
