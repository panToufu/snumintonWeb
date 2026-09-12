import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ eventId: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const { eventId } = await params;
    if (!eventId || eventId.length > 100) {
      return NextResponse.json({ message: "일정 정보를 확인해주세요." }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("applications")
      .select("id,user_name,user_type,participation_type,lesson_choice,afterparty_join,level,applied_at")
      .eq("event_id", eventId)
      .order("applied_at", { ascending: true });

    if (error) {
      console.error("공개 신청 명단 조회 실패", error);
      return NextResponse.json({ message: "신청 명단을 불러오지 못했습니다." }, { status: 500 });
    }
    return NextResponse.json({ data: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("공개 신청 명단 조회 실패", error);
    return NextResponse.json({ message: "신청 명단을 불러오지 못했습니다." }, { status: 500 });
  }
}
