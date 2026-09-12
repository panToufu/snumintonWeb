import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await getSupabaseAdmin().from("members").select("*").order("name", { ascending: true });
    if (error) return databaseError(error);
    return NextResponse.json({ data });
  } catch (error) {
    return databaseError(error);
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as { members?: unknown };
    if (!Array.isArray(body.members) || body.members.length === 0 || body.members.length > 200) {
      return NextResponse.json({ message: "등록할 부원 정보를 확인해주세요." }, { status: 400 });
    }
    const members = body.members.flatMap((member) => {
      if (!member || typeof member !== "object") return [];
      const { name, user_type: userType } = member as Record<string, unknown>;
      const normalizedName = typeof name === "string" ? name.trim().slice(0, 80) : "";
      if (!normalizedName || (userType !== "member" && userType !== "ob")) return [];
      return [{ name: normalizedName, user_type: userType }];
    });
    if (members.length !== body.members.length) return NextResponse.json({ message: "부원 입력값을 확인해주세요." }, { status: 400 });

    const { data, error } = await getSupabaseAdmin().from("members").insert(members).select();
    if (error) return databaseError(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}
