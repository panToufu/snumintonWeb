import { NextResponse } from "next/server";
import { hasAttendanceAccess } from "@/lib/attendance-access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { authorized: await hasAttendanceAccess() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
