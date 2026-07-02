"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase-client";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { loginWithFirebase } from "@/lib/actions/auth-actions";

// Đổi SĐT Việt Nam sang định dạng quốc tế cho Firebase: 0901234567 -> +84901234567
function toE164(raw: string): string {
  let x = raw.replace(/\s|-/g, "").trim();
  if (x.startsWith("+")) return x;
  if (x.startsWith("0")) return "+84" + x.slice(1);
  if (x.startsWith("84")) return "+" + x;
  return "+84" + x;
}

export function FirebaseLogin() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmationRef = useRef<ConfirmationResult | null>(null);
  const verifierRef = useRef<RecaptchaVerifier | null>(null);

  function getVerifier() {
    if (!verifierRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
    return verifierRef.current;
  }

  async function sendCode() {
    if (!/^0\d{9}$/.test(phone.replace(/\s|-/g, ""))) {
      setError("Số điện thoại không hợp lệ (VD: 0901234567)");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await signInWithPhoneNumber(auth, toE164(phone), getVerifier());
      confirmationRef.current = result;
      setStep("code");
    } catch (e) {
      console.error(e);
      setError("Không gửi được mã. Kiểm tra số hoặc thử lại sau.");
      // reset verifier để lần sau tạo lại
      verifierRef.current?.clear();
      verifierRef.current = null;
    } finally {
      setLoading(false);
    }
  }

  async function verify() {
    if (!confirmationRef.current) return;
    setError("");
    setLoading(true);
    try {
      const cred = await confirmationRef.current.confirm(code);
      const idToken = await cred.user.getIdToken();
      const { isNew } = await loginWithFirebase(idToken);
      router.push(isNew ? "/profile?welcome=1" : "/");
      router.refresh();
    } catch (e) {
      console.error(e);
      setError("Mã không đúng hoặc đã hết hạn.");
      setLoading(false);
    }
  }

  const input = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
  const btn =
    "w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50";

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {step === "phone" ? (
        <>
          <label className="block text-sm font-medium text-slate-700">Số điện thoại</label>
          <input
            type="tel"
            inputMode="numeric"
            placeholder="0901234567"
            className={input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoFocus
          />
          <button onClick={sendCode} disabled={loading} className={btn}>
            {loading ? "Đang gửi…" : "Gửi mã OTP"}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm text-slate-600">
            Đã gửi mã tới <span className="font-semibold">{phone}</span>
          </p>
          <label className="block text-sm font-medium text-slate-700">Nhập mã OTP</label>
          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="6 số"
            className={`${input} tracking-widest`}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoFocus
          />
          <button onClick={verify} disabled={loading} className={btn}>
            {loading ? "Đang xác thực…" : "Xác nhận"}
          </button>
          <button
            onClick={() => {
              setStep("phone");
              setCode("");
              setError("");
            }}
            className="block w-full text-center text-xs text-slate-500 hover:text-brand"
          >
            ← Đổi số điện thoại
          </button>
        </>
      )}

      {/* reCAPTCHA vô hình của Firebase */}
      <div id="recaptcha-container" />
    </div>
  );
}
