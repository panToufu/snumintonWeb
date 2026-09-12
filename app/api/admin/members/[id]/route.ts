import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };
const allowedRoles = ["member", "ob", "회장", "부회장", "임원진"];

export async function PATCH(request: Request, { params }: Context) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json() as { user_type?: unknown };
    if (typeof body.user_type !== "string" || !allowedRoles.includes(body.user_type)) {
      return NextResponse.json({ message: "직책 정보를 확인해주세요." }, { status: 400 });
    }
    const { id } = await params;
    const { error } = await getSupabaseAdmin().from("members").update({ user_type: body.user_type }).eq("id", id);
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
    const { error } = await getSupabaseAdmin().from("members").delete().eq("id", id);
    if (error) return databaseError(error);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return databaseError(error);
  }
}
