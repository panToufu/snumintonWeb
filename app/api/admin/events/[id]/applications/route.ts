import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const applicationFields = "id,event_id,user_name,user_type,phone_number,participation_type,lesson_choice,afterparty_join,level,applied_at,attendance_status,is_paid,guest_source,guest_referrer";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const { data, error } = await getSupabaseAdmin().from("applications").select(applicationFields).eq("event_id", id).order("applied_at", { ascending: true });
    if (error) return databaseError(error);
    return NextResponse.json({ data });
  } catch (error) {
    return databaseError(error);
  }
}
