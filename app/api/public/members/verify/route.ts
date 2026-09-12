import { NextResponse } from "next/server";
import { findMatchingMember } from "@/lib/member-name";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const memberRoles = ["member", "ob", "회장", "부회장", "임원진"];

export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get("name")?.trim() ?? "";
  if (!name || name.length > 80) return NextResponse.json({ valid: false });

  try {
    const { data, error } = await getSupabaseAdmin().from("members").select("name,user_type").in("user_type", memberRoles);
    if (error) {
      console.error("부원 확인 실패", error);
      return NextResponse.json({ message: "부원 정보를 확인하지 못했습니다." }, { status: 500 });
    }
    return NextResponse.json({ valid: Boolean(findMatchingMember(name, data ?? [])) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("부원 확인 실패", error);
    return NextResponse.json({ message: "부원 정보를 확인하지 못했습니다." }, { status: 500 });
  }
}
