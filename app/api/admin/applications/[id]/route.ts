import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const attendanceStatuses = ["present", "late", "absent", "none"];
const participationTypes = ["full", "partial_7_9", "partial_8_10"];
const lessonChoices = ["tue_thu", "sat"];
const levels = ["A/B", "C", "D/초심"];

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    const wantsAttendanceUpdate = typeof body.attendance_status === "string" && attendanceStatuses.includes(body.attendance_status);
    if (wantsAttendanceUpdate) update.attendance_status = body.attendance_status;
    if (typeof body.is_paid === "boolean") update.is_paid = body.is_paid;
    if (typeof body.participation_type === "string" && participationTypes.includes(body.participation_type)) update.participation_type = body.participation_type;
    if (typeof body.lesson_choice === "string" && lessonChoices.includes(body.lesson_choice)) update.lesson_choice = body.lesson_choice;
    if (typeof body.afterparty_join === "boolean") update.afterparty_join = body.afterparty_join;
    if (typeof body.level === "string" && levels.includes(body.level)) update.level = body.level;
    if (Object.keys(update).length === 0) return NextResponse.json({ message: "수정할 내용을 확인해주세요." }, { status: 400 });

    const { id } = await params;
    const supabase = getSupabaseAdmin();
    if (wantsAttendanceUpdate) {
      const { data: application, error: applicationError } = await supabase.from("applications").select("event_id").eq("id", id).maybeSingle();
      if (applicationError) return databaseError(applicationError);
      if (!application) return NextResponse.json({ message: "신청 내역을 찾을 수 없습니다." }, { status: 404 });

      const { data: event, error: eventError } = await supabase.from("events").select("type").eq("id", application.event_id).maybeSingle();
      if (eventError) return databaseError(eventError);
      if (!event || event.type === "special" || event.type === "lightning") {
        return NextResponse.json({ message: "행사와 번개운동은 출석 관리 대상이 아닙니다." }, { status: 400 });
      }
    }

    const { error } = await supabase.from("applications").update(update).eq("id", id);
    if (error) return databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const { error } = await getSupabaseAdmin().from("applications").delete().eq("id", id);
    if (error) return databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
