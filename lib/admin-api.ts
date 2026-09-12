import "server-only";

import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-auth";

export async function requireAdminApi(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ message: "운영진 인증이 필요합니다." }, { status: 401 });
  }

  if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).origin !== new URL(request.url).origin) {
      return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
    }
  }

  return null;
}

export function databaseError(error: unknown) {
  console.error("관리자 DB 요청 실패", error);
  return NextResponse.json({ message: "요청을 처리하지 못했습니다." }, { status: 500 });
}
