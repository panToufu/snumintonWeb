import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const eventFields = "id,title,type,start_at,end_at,location,max_capacity,participating_execs,allow_registration,allow_guests,has_afterparty,ask_level,is_attendance_counted,registration_start_at,color";

function isThirtyMinuteAligned(date: Date) {
  return date.getUTCMinutes() % 30 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0;
}

function normalizeEvent(input: Record<string, unknown>) {
  const type = input.type === "normal" || input.type === "lesson" || input.type === "special" || input.type === "lightning" ? input.type : "normal";
  const title = type === "lightning" ? "번개운동" : (typeof input.title === "string" ? input.title.trim().slice(0, 120) : "");
  const startAt = typeof input.start_at === "string" ? input.start_at : "";
  const endAt = typeof input.end_at === "string" ? input.end_at : "";
  const capacity = Number(input.max_capacity);
  const startDate = new Date(startAt);
  const endDate = new Date(endAt);
  const registrationStart = typeof input.registration_start_at === "string" ? new Date(input.registration_start_at) : null;
  const isLightning = type === "lightning";

  if (
    !title
    || Number.isNaN(startDate.getTime())
    || Number.isNaN(endDate.getTime())
    || endDate.getTime() <= startDate.getTime()
    || !isThirtyMinuteAligned(startDate)
    || !isThirtyMinuteAligned(endDate)
    || (!isLightning && (!Number.isInteger(capacity) || capacity < 0 || capacity > 500))
    || (registrationStart && (Number.isNaN(registrationStart.getTime()) || !isThirtyMinuteAligned(registrationStart)))
  ) {
    return null;
  }

  return {
    title,
    type,
    start_at: startDate.toISOString(),
    end_at: endDate.toISOString(),
    location: typeof input.location === "string" ? input.location.trim().slice(0, 200) : "장소 미정",
    max_capacity: isLightning ? 0 : capacity,
    participating_execs: Array.isArray(input.participating_execs) ? input.participating_execs.filter((name): name is string => typeof name === "string").map((name) => name.slice(0, 80)) : [],
    allow_registration: isLightning ? false : input.allow_registration !== false,
    allow_guests: isLightning ? false : input.allow_guests !== false,
    has_afterparty: isLightning ? false : input.has_afterparty === true,
    ask_level: isLightning ? false : input.ask_level === true,
    is_attendance_counted: type === "normal" || type === "lesson" ? input.is_attendance_counted !== false : false,
    registration_start_at: isLightning || !registrationStart ? null : registrationStart.toISOString(),
    color: type === "normal" ? "#3b82f6" : type === "lesson" ? "#8b5cf6" : type === "lightning" ? "#f59e0b" : "#ec4899",
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await getSupabaseAdmin().from("events").select(eventFields).order("start_at", { ascending: false });
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
    const body = await request.json() as { events?: unknown };
    if (!Array.isArray(body.events) || body.events.length === 0 || body.events.length > 40) {
      return NextResponse.json({ message: "등록할 일정을 확인해주세요." }, { status: 400 });
    }
    const events = body.events.filter((event): event is Record<string, unknown> => Boolean(event) && typeof event === "object").map(normalizeEvent);
    if (events.length !== body.events.length || events.some((event) => !event)) {
      return NextResponse.json({ message: "일정 입력값을 확인해주세요." }, { status: 400 });
    }
    const { data, error } = await getSupabaseAdmin().from("events").insert(events).select(eventFields);
    if (error) return databaseError(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}
