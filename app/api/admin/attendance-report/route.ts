import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getAttendanceRange } from "@/lib/attendance-range";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const range = getAttendanceRange(searchParams);
  if (!range) {
    return NextResponse.json({ message: "조회 기간을 확인해주세요." }, { status: 400 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, start_at, title, type, is_attendance_counted")
      .gte("start_at", range.startAt)
      .lt("start_at", range.endAt)
      .order("start_at", { ascending: true });
    if (eventsError) return databaseError(eventsError);

    const countedEvents = (events ?? []).filter((event) => event.type !== "special" && event.type !== "lightning" && event.is_attendance_counted !== false);
    const eventIds = countedEvents.map((event) => event.id);
    if (eventIds.length === 0) return NextResponse.json({ events: countedEvents, applications: [] });

    const { data: applications, error: applicationsError } = await supabase
      .from("applications")
      .select("user_name, event_id, attendance_status")
      .in("event_id", eventIds);
    if (applicationsError) return databaseError(applicationsError);
    return NextResponse.json({ events: countedEvents, applications: applications ?? [] });
  } catch (error) {
    return databaseError(error);
  }
}
