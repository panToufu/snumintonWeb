import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const publicEvents = "id,title,type,start_at,end_at,location,max_capacity,participating_execs,allow_registration,allow_guests,has_afterparty,ask_level,registration_start_at,color";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const [eventsResult, pollsResult, executivesResult] = await Promise.all([
      supabase.from("events").select(publicEvents).order("start_at", { ascending: true }),
      supabase.from("polls").select("id,title,poll_type,deadline,created_at").order("created_at", { ascending: false }),
      supabase.from("members").select("name,user_type").in("user_type", ["회장", "부회장", "임원진"]),
    ]);

    if (eventsResult.error || pollsResult.error || executivesResult.error) {
      console.error("공개 초기 데이터 조회 실패", eventsResult.error ?? pollsResult.error ?? executivesResult.error);
      return NextResponse.json({ message: "초기 데이터를 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json(
      {
        events: eventsResult.data ?? [],
        polls: pollsResult.data ?? [],
        executives: executivesResult.data ?? [],
        serverTime: new Date().toISOString(),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("공개 초기 데이터 조회 실패", error);
    return NextResponse.json({ message: "초기 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
}
