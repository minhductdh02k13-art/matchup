"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { loginWithFirebase } from "@/lib/actions/auth-actions";

const provider = new GoogleAuthProvider();

export function GoogleLoginButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function loginGoogle() {
    setError("");
    setBusy(true);
    try {
      // Popup: giữ mọi thứ trong 1 cửa sổ -> ổn định cả trên điện thoại,
      // tránh lỗi mất phiên khi tên miền app khác tên miền Firebase.
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const { isNew } = await loginWithFirebase(idToken);
      router.push(isNew ? "/profile?welcome=1" : "/");
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string })?.code ?? "";
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setError("Bạn đã đóng cửa sổ đăng nhập.");
      } else if (code === "auth/popup-blocked") {
        setError("Trình duyệt chặn cửa sổ đăng nhập. Cho phép popup rồi thử lại.");
      } else if (code === "auth/unauthorized-domain") {
        setError("Tên miền chưa được cho phép trong Firebase (Authorized domains).");
      } else {
        console.error(e);
        setError(`Đăng nhập thất bại${code ? ` (${code})` : ""}. Thử lại nhé.`);
      }
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={loginGoogle}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
          <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.5 0 10.5-2.1 14.2-5.5l-6.6-5.4C29.6 34.7 26.9 36 24 36c-5.2 0-9.6-3.3-11.2-8l-6.5 5C9.6 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.6 5.4C41.9 36.6 44 31 44 24c0-1.3-.1-2.3-.4-3.5z" />
        </svg>
        {busy ? "Đang đăng nhập…" : "Đăng nhập bằng Google"}
      </button>
      {error && <p className="text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
