import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isScryptHash, verifyScryptHash } from "@/lib/password-hash";

const SESSION_COOKIE = "snuminton_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  exp: number;
  version: string;
};

function getConfig() {
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;
  const sessionSecret = process.env.ADMIN_SESSION_SECRET;
  const version = process.env.ADMIN_SESSION_VERSION ?? "1";

  if (!passwordHash || !sessionSecret) return null;
  return { passwordHash, sessionSecret, version };
}

export function isAdminAuthConfigured() {
  const config = getConfig();
  return Boolean(config && isScryptHash(config.passwordHash));
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export async function verifyAdminPassword(password: string) {
  const config = getConfig();
  if (!config) return false;
  return verifyScryptHash(password, config.passwordHash);
}

export async function createAdminSession() {
  const config = getConfig();
  if (!config) throw new Error("임원진 인증 환경 변수가 설정되지 않았습니다.");

  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    version: config.version,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const token = `${encodedPayload}.${sign(encodedPayload, config.sessionSecret)}`;
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}

export async function hasAdminSession() {
  const config = getConfig();
  if (!config) return false;

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return false;

  const expectedSignature = sign(encodedPayload, config.sessionSecret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;
    return payload.version === config.version && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
