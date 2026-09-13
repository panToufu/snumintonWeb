import { NextResponse } from "next/server";
import { hasAttendanceAccess } from "@/lib/attendance-access";
import { getAttendanceRange } from "@/lib/attendance-range";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasAttendanceAccess())) {
    return NextResponse.json({ message: "출석 확인을 위해 이름을 다시 입력해주세요." }, { status: 401 });
  }

  const url = new URL(request.url);
  const range = getAttendanceRange(url.searchParams);
  if (!range) {
    return NextResponse.json({ message: "조회 기간을 확인해주세요." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const [membersResult, eventsResult] = await Promise.all([
      supabase.from("members").select("id,name,user_type").order("name", { ascending: true }),
      supabase.from("events").select("id,start_at,title,type,is_attendance_counted").gte("start_at", range.startAt).lt("start_at", range.endAt).order("start_at", { ascending: true }),
    ]);
    if (membersResult.error || eventsResult.error) {
      console.error("출석 데이터 조회 실패", membersResult.error ?? eventsResult.error);
      return NextResponse.json({ message: "출석 데이터를 불러오지 못했습니다." }, { status: 500 });
    }

    const events = (eventsResult.data ?? []).filter((event) => event.type !== "special" && event.type !== "lightning" && event.is_attendance_counted !== false);
    if (events.length === 0) return NextResponse.json({ members: membersResult.data ?? [], events, applications: [] });

    const { data: applications, error: applicationsError } = await supabase
      .from("applications")
      .select("user_name,event_id,attendance_status")
      .in("event_id", events.map((event) => event.id));
    if (applicationsError) {
      console.error("출석 신청 데이터 조회 실패", applicationsError);
      return NextResponse.json({ message: "출석 데이터를 불러오지 못했습니다." }, { status: 500 });
    }

    return NextResponse.json(
      { members: membersResult.data ?? [], events, applications: applications ?? [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("출석 데이터 조회 실패", error);
    return NextResponse.json({ message: "출석 데이터를 불러오지 못했습니다." }, { status: 500 });
  }
}
