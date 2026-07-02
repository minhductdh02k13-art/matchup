"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInGps } from "@/lib/actions/checkin-actions";

export function CheckInButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function checkIn() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setError("");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        startTransition(async () => {
          try {
            await checkInGps(matchId, latitude, longitude);
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Check-in thất bại");
          } finally {
            setBusy(false);
          }
        });
      },
      () => {
        setBusy(false);
        setError("Không lấy được vị trí. Cần bật quyền vị trí để check-in.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={checkIn}
        disabled={busy}
        className="w-full rounded-lg bg-brand py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
      >
        📍 {busy ? "Đang check-in…" : "Check-in tại sân (GPS)"}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
