import { NextResponse } from "next/server";
import { createAdminSession, isAdminAuthConfigured, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; startedAt: number }>();

function getClientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function isRateLimited(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.startedAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string) {
  const current = attempts.get(key);
  if (!current || Date.now() - current.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ message: "관리자 로그인 설정을 확인해주세요." }, { status: 500 });
  }

  const clientKey = getClientKey(request);
  if (isRateLimited(clientKey)) {
    return NextResponse.json({ message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
  }

  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }

  let password: unknown;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return NextResponse.json({ message: "비밀번호를 확인해주세요." }, { status: 400 });
  }

  if (!(await verifyAdminPassword(password))) {
    recordFailedAttempt(clientKey);
    return NextResponse.json({ message: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  attempts.delete(clientKey);
  await createAdminSession();
  return NextResponse.json({ ok: true });
}
