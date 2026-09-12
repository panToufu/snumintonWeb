import { NextResponse } from "next/server";
import { findMatchingMember } from "@/lib/member-name";
import { isScryptHash, verifyScryptHash } from "@/lib/password-hash";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; startedAt: number }>();
const memberRoles = ["member", "회장", "부회장", "임원진"];
const obRoles = ["ob"];
const guestSources = ["인스타", "홍보 글", "부원 소개"];

type EventRow = {
  id: string;
  type: "normal" | "lesson" | "special";
  start_at: string;
  end_at: string | null;
  allow_registration: boolean | null;
  allow_guests: boolean | null;
  has_afterparty: boolean | null;
  ask_level: boolean | null;
  registration_start_at: string | null;
};

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function rateLimited(key: string) {
  const attempt = attempts.get(key);
  if (!attempt) return false;
  if (Date.now() - attempt.startedAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return attempt.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(key: string) {
  const current = attempts.get(key);
  if (!current || Date.now() - current.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  attempts.set(key, { ...current, count: current.count + 1 });
}

function requestError(message: string, status = 400) {
  return NextResponse.json({ message }, { status });
}

function registrationStart(event: EventRow, userType: string) {
  if (event.registration_start_at) return new Date(event.registration_start_at);

  const start = new Date(event.start_at);
  const hoursBeforeStart = userType === "guest" ? { days: 1, hour: 15 } : { days: 2, hour: 23 };
  // 기본 신청 시간은 동아리 운영 시간대(Asia/Seoul)를 기준으로 고정한다.
  const koreaTime = new Date(start.getTime() + 9 * 60 * 60 * 1000);
  const openAt = Date.UTC(
    koreaTime.getUTCFullYear(),
    koreaTime.getUTCMonth(),
    koreaTime.getUTCDate() - hoursBeforeStart.days,
    hoursBeforeStart.hour,
  ) - 9 * 60 * 60 * 1000;
  return new Date(openAt);
}

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
  if (!isSameOrigin(request)) return requestError("허용되지 않은 요청입니다.", 403);

  const key = clientKey(request);
  if (rateLimited(key)) return requestError("신청 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.", 429);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return requestError("잘못된 요청입니다.");
  }

  const eventId = typeof body.event_id === "string" ? body.event_id.trim() : "";
  const name = typeof body.user_name === "string" ? body.user_name.trim().replace(/\s+/g, " ") : "";
  const userType = body.user_type;
  if (!eventId || eventId.length > 100 || !name || name.length > 80 || !["member", "ob", "guest"].includes(String(userType))) {
    recordFailedAttempt(key);
    return requestError("신청 정보를 확인해주세요.");
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,type,start_at,end_at,allow_registration,allow_guests,has_afterparty,ask_level,registration_start_at")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) return requestError("일정을 찾을 수 없습니다.", 404);

    const eventRow = event as EventRow;
    const now = new Date();
    const endAt = eventRow.end_at ? new Date(eventRow.end_at) : new Date(new Date(eventRow.start_at).getTime() + 3 * 60 * 60 * 1000);
    if (eventRow.allow_registration === false || now > endAt) return requestError("마감된 일정입니다.");
    if (now < registrationStart(eventRow, String(userType))) return requestError("아직 신청 시간이 아닙니다.");
    if (eventRow.type === "special" && userType !== "member") return requestError("행사는 부원만 신청할 수 있습니다.");
    if (userType === "guest" && eventRow.allow_guests === false) return requestError("이 일정은 게스트 신청을 받지 않습니다.");

    let finalName = name;
    if (userType === "member" || userType === "ob") {
      const expectedRoles = userType === "member" ? memberRoles : obRoles;
      const { data: members, error: membersError } = await supabase.from("members").select("name,user_type").in("user_type", expectedRoles);
      if (membersError) throw membersError;
      const matchedMember = findMatchingMember(name, members ?? []);
      if (!matchedMember) {
        recordFailedAttempt(key);
        return requestError("등록되지 않은 이름입니다. 확인해주세요.");
      }
      finalName = matchedMember.name;

      const { data: existingApplications, error: duplicateError } = await supabase
        .from("applications")
        .select("user_type")
        .eq("event_id", eventId)
        .eq("user_name", finalName);
      if (duplicateError) throw duplicateError;
      if ((existingApplications ?? []).some((application) => application.user_type !== "guest" && application.user_type !== "ob")) {
        return requestError(`이미 신청된 이름(${finalName})입니다. 명단을 다시 확인해주세요.`);
      }
    }

    let guestSource: string | null = null;
    let guestReferrer: string | null = null;
    let phoneNumber: string | null = null;
    if (userType === "guest") {
      const guestPassword = typeof body.guest_password === "string" ? body.guest_password : "";
      const guestPasswordHash = process.env.GUEST_PASSWORD_HASH;
      if (!isScryptHash(guestPasswordHash)) return requestError("게스트 신청 설정을 확인해주세요.", 503);
      if (!(await verifyScryptHash(guestPassword, guestPasswordHash))) {
        recordFailedAttempt(key);
        return requestError("게스트 공통 비밀번호가 일치하지 않습니다. 임원진에게 문의해주세요.");
      }

      const rawPhone = typeof body.phone_number === "string" ? body.phone_number.trim() : "";
      if (!rawPhone || rawPhone.length > 30) return requestError("게스트는 연락처를 필수로 입력해야 합니다.");
      phoneNumber = rawPhone;

      guestSource = typeof body.guest_source === "string" && guestSources.includes(body.guest_source) ? body.guest_source : "인스타";
      if (guestSource === "부원 소개") {
        const referrer = typeof body.guest_referrer === "string" ? body.guest_referrer.trim() : "";
        if (!referrer || referrer.length > 80) return requestError("소개해준 부원 이름을 입력해주세요.");
        const { data: members, error: referrerError } = await supabase.from("members").select("name,user_type");
        if (referrerError) throw referrerError;
        const matchedReferrer = findMatchingMember(referrer, members ?? []);
        if (!matchedReferrer) return requestError("입력한 추천인 이름이 부원 명단에 없습니다. 정확히 확인해주세요.");
        guestReferrer = matchedReferrer.name;
      }
    }

    const participationType = eventRow.type === "normal" && ["full", "partial_7_9", "partial_8_10"].includes(String(body.participation_type))
      ? body.participation_type
      : "full";
    const lessonChoice = eventRow.type === "lesson" && ["tue_thu", "sat"].includes(String(body.lesson_choice))
      ? body.lesson_choice
      : null;
    const level = eventRow.ask_level
      ? (["A/B", "C", "D/초심"].includes(String(body.level)) ? body.level : null)
      : null;
    if (eventRow.ask_level && !level) return requestError("실력(레벨)을 선택하셔야 신청이 가능합니다.");

    const { data: application, error: insertError } = await supabase
      .from("applications")
      .insert({
        event_id: eventId,
        user_name: finalName,
        user_type: userType,
        guest_password: null,
        phone_number: phoneNumber,
        participation_type: participationType,
        lesson_choice: lessonChoice,
        afterparty_join: eventRow.has_afterparty === true && body.afterparty_join === true,
        level,
        guest_source: guestSource,
        guest_referrer: guestReferrer,
      })
      .select("id,user_name,user_type,participation_type,lesson_choice,afterparty_join,level,applied_at")
      .single();
    if (insertError) throw insertError;

    attempts.delete(key);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("공개 신청 처리 실패", error);
    return requestError("신청을 처리하지 못했습니다.", 500);
  }
}
