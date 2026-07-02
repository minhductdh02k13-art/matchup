import { jwtVerify, createRemoteJWKSet } from "jose";

// Khóa công khai của Firebase để xác thực idToken (không cần firebase-admin).
const JWKS = createRemoteJWKSet(
  new URL(
    "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"
  )
);

export type FirebaseClaims = {
  sub: string; // uid
  phone_number?: string;
  email?: string;
  name?: string;
  picture?: string;
};

// Xác thực Firebase ID token (Google/Phone) bằng jose — nhẹ, chạy tốt trên serverless.
export async function verifyFirebaseToken(idToken: string): Promise<FirebaseClaims> {
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Thiếu cấu hình FIREBASE_PROJECT_ID");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });
  return payload as FirebaseClaims;
}
