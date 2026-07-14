// Khởi tạo Firebase phía trình duyệt (dùng cho đăng nhập).
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// authDomain = chính tên miền đang mở (khi ở production) -> phần xác thực chạy
// same-origin nhờ proxy trong next.config -> Safari/iOS không chặn.
// Ở local (localhost) thì dùng authDomain gốc của Firebase.
function resolveAuthDomain(): string | undefined {
  if (typeof window !== "undefined") {
    const h = window.location.hostname;
    if (h !== "localhost" && h !== "127.0.0.1") return window.location.host;
  }
  return process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
}

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: resolveAuthDomain(),
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(firebaseApp);
