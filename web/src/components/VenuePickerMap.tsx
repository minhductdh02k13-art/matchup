"use client";

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";
import "leaflet/dist/leaflet.css";

const pin = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#16a34a;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function ClickToPick({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Di chuyển bản đồ tới toạ độ mới khi chọn gợi ý.
function Recenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], Math.max(map.getZoom(), 15));
  }, [lat, lng, map]);
  return null;
}

export default function VenuePickerMap({
  value,
  center,
  onPick,
}: {
  value: { lat: number; lng: number } | null;
  center: [number, number];
  onPick: (lat: number, lng: number) => void;
}) {
  return (
    <MapContainer center={center} zoom={13} style={{ height: "280px", width: "100%" }} className="z-0 rounded-lg">
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickToPick onPick={onPick} />
      {value && (
        <>
          <Marker position={[value.lat, value.lng]} icon={pin} />
          <Recenter lat={value.lat} lng={value.lng} />
        </>
      )}
    </MapContainer>
  );
}
