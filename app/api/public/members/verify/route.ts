import { NextResponse } from "next/server";
import { createAttendanceAccess } from "@/lib/attendance-access";
import { findMatchingMember } from "@/lib/member-name";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberRoles = ["member", "ob", "회장", "부회장", "임원진"];

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });

  let name: string;
  try {
    const body = await request.json() as { name?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  if (!name || name.length > 80) return NextResponse.json({ valid: false });

  try {
    const { data, error } = await getSupabaseAdmin().from("members").select("name,user_type").in("user_type", memberRoles);
    if (error) {
      console.error("부원 확인 실패", error);
      return NextResponse.json({ message: "부원 정보를 확인하지 못했습니다." }, { status: 500 });
    }
    if (!findMatchingMember(name, data ?? [])) {
      return NextResponse.json({ valid: false }, { headers: { "Cache-Control": "no-store" } });
    }

    await createAttendanceAccess();
    return NextResponse.json({ valid: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("부원 확인 실패", error);
    return NextResponse.json({ message: "부원 정보를 확인하지 못했습니다." }, { status: 500 });
  }
}
