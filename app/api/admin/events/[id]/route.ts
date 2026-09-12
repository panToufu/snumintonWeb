import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const update: Record<string, unknown> = {};
    if (typeof body.title === "string" && body.title.trim()) update.title = body.title.trim().slice(0, 120);
    if (typeof body.location === "string") update.location = body.location.trim().slice(0, 200);
    if (Number.isInteger(body.max_capacity) && Number(body.max_capacity) >= 0 && Number(body.max_capacity) <= 500) update.max_capacity = body.max_capacity;
    if (typeof body.is_attendance_counted === "boolean") update.is_attendance_counted = body.is_attendance_counted;
    if (typeof body.allow_guests === "boolean") update.allow_guests = body.allow_guests;
    if (Array.isArray(body.participating_execs)) update.participating_execs = body.participating_execs.filter((name): name is string => typeof name === "string").map((name) => name.slice(0, 80));
    if (Object.keys(update).length === 0) return NextResponse.json({ message: "수정할 내용을 확인해주세요." }, { status: 400 });

    const { error } = await getSupabaseAdmin().from("events").update(update).eq("id", id);
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
    const supabase = getSupabaseAdmin();
    const { error: applicationsError } = await supabase.from("applications").delete().eq("event_id", id);
    if (applicationsError) return databaseError(applicationsError);
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) return databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
