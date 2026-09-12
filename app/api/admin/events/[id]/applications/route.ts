import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const { data, error } = await getSupabaseAdmin().from("applications").select("*").eq("event_id", id).order("applied_at", { ascending: true });
    if (error) return databaseError(error);
    return NextResponse.json({ data });
  } catch (error) {
    return databaseError(error);
  }
}
