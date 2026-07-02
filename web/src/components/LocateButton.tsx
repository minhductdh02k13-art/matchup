"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMyLocation } from "@/lib/actions/location-actions";

export function LocateButton({ located }: { located: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [, startTransition] = useTransition();

  function locate() {
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
            await saveMyLocation(latitude, longitude);
            router.refresh();
          } finally {
            setBusy(false);
          }
        });
      },
      (err) => {
        setBusy(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Bạn đã từ chối quyền vị trí. Bật lại trong cài đặt trình duyệt để dùng."
            : err.code === err.TIMEOUT
              ? "Định vị quá lâu. Thử lại hoặc kiểm tra mạng/quyền vị trí."
              : "Không lấy được vị trí. Thử lại nhé."
        );
      },
      // enableHighAccuracy: false hợp với máy tính (dùng WiFi/IP, không cần GPS), tránh treo.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={locate}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:border-brand hover:text-brand disabled:opacity-50"
      >
        📍 {busy ? "Đang định vị…" : located ? "Cập nhật vị trí" : "Định vị tôi"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
