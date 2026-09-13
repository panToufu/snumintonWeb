import { NextResponse } from "next/server";
import { createAdminSession, isAdminAuthConfigured, verifyAdminPassword } from "@/lib/admin-auth";

export const runtime = "nodejs";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isAdminAuthConfigured()) {
    return NextResponse.json({ message: "임원진 로그인 설정을 확인해주세요." }, { status: 500 });
  }

  if (!isSameOrigin(request)) {
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
    return NextResponse.json({ message: "비밀번호가 일치하지 않습니다." }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
