"use client";

import { useEffect, useState } from "react";

// Các "trình duyệt trong app" (webview) — Google chặn đăng nhập OAuth ở đây.
const IN_APP_RE = /Zalo|FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|MicroMessenger|TikTok/i;

export function InAppBrowserNotice() {
  const [inApp, setInApp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && IN_APP_RE.test(navigator.userAgent)) {
      setInApp(true);
    }
  }, []);

  if (!inApp) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // trình duyệt không cho copy tự động — người dùng tự copy từ thanh địa chỉ
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-semibold">⚠️ Bạn đang mở trong app khác (Zalo/Facebook…)</p>
      <p className="mt-1">
        Google không cho đăng nhập trong trình duyệt của app khác. Hãy mở bằng{" "}
        <b>Chrome</b> hoặc <b>Safari</b>:
      </p>
      <ul className="mt-1 list-inside list-disc text-xs">
        <li>Bấm nút <b>⋯</b> (góc phải trên) → chọn <b>“Mở trong trình duyệt”</b></li>
        <li>Hoặc sao chép link rồi dán vào Chrome/Safari</li>
      </ul>
      <button
        onClick={copy}
        className="mt-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
      >
        {copied ? "✓ Đã sao chép link" : "Sao chép link"}
      </button>
    </div>
  );
}
