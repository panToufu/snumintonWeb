import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(request.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ message: "조회 기간을 확인해주세요." }, { status: 400 });
  }

  try {
    const startAt = new Date(year, month - 1, 1).toISOString();
    const endAt = new Date(year, month, 1).toISOString();
    const supabase = getSupabaseAdmin();
    const { data: events, error: eventsError } = await supabase
      .from("events")
      .select("id, start_at, title, type, is_attendance_counted")
      .gte("start_at", startAt)
      .lt("start_at", endAt)
      .order("start_at", { ascending: true });
    if (eventsError) return databaseError(eventsError);

    const countedEvents = (events ?? []).filter((event) => event.is_attendance_counted !== false);
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
