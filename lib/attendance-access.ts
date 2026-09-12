import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ACCESS_COOKIE = "snuminton_attendance_access";
const ACCESS_TTL_SECONDS = 60 * 60 * 4;

type AccessPayload = {
  exp: number;
  version: string;
};

function getConfig() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  return {
    secret,
    version: process.env.ADMIN_SESSION_VERSION ?? "1",
  };
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function createAttendanceAccess() {
  const config = getConfig();
  if (!config) throw new Error("출석 확인 환경 변수가 설정되지 않았습니다.");

  const payload: AccessPayload = {
    exp: Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS,
    version: config.version,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const token = `${encodedPayload}.${sign(encodedPayload, config.secret)}`;
  const cookieStore = await cookies();

  cookieStore.set(ACCESS_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/public/attendance",
    maxAge: ACCESS_TTL_SECONDS,
  });
}

export async function hasAttendanceAccess() {
  const config = getConfig();
  if (!config) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = sign(encodedPayload, config.secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AccessPayload;
    return payload.version === config.version && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
