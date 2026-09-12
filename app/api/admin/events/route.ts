import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function normalizeEvent(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : "";
  const type = input.type === "normal" || input.type === "lesson" || input.type === "special" ? input.type : "normal";
  const startAt = typeof input.start_at === "string" ? input.start_at : "";
  const endAt = typeof input.end_at === "string" ? input.end_at : "";
  const capacity = Number(input.max_capacity);

  if (!title || Number.isNaN(Date.parse(startAt)) || Number.isNaN(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt) || !Number.isInteger(capacity) || capacity < 0 || capacity > 500) {
    return null;
  }

  return {
    title,
    type,
    start_at: new Date(startAt).toISOString(),
    end_at: new Date(endAt).toISOString(),
    location: typeof input.location === "string" ? input.location.trim().slice(0, 200) : "장소 미정",
    max_capacity: capacity,
    participating_execs: Array.isArray(input.participating_execs) ? input.participating_execs.filter((name): name is string => typeof name === "string").map((name) => name.slice(0, 80)) : [],
    allow_registration: input.allow_registration !== false,
    allow_guests: input.allow_guests !== false,
    has_afterparty: input.has_afterparty === true,
    ask_level: input.ask_level === true,
    is_attendance_counted: input.is_attendance_counted !== false,
    registration_start_at: typeof input.registration_start_at === "string" && !Number.isNaN(Date.parse(input.registration_start_at)) ? new Date(input.registration_start_at).toISOString() : null,
    color: type === "normal" ? "#3b82f6" : type === "lesson" ? "#8b5cf6" : "#ec4899",
  };
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { data, error } = await getSupabaseAdmin().from("events").select("*").order("start_at", { ascending: false });
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
    const { data, error } = await getSupabaseAdmin().from("events").insert(events).select();
    if (error) return databaseError(error);
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    return databaseError(error);
  }
}
