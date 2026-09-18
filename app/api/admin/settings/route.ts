import { NextResponse } from "next/server";
import { databaseError, requireAdminApi } from "@/lib/admin-api";
import { hashScryptPassword } from "@/lib/password-hash";
import { fallbackPaymentSettings, getStoredSiteSettings } from "@/lib/site-settings";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

function normalizeText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeAccount(value: unknown) {
  if (typeof value !== "string") return "";
  const digits = value.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 30 ? digits : "";
}

function settingsResponse(settings: Awaited<ReturnType<typeof getStoredSiteSettings>>) {
  const payment = settings ?? fallbackPaymentSettings;
  return {
    bankName: payment.bankName,
    bankAccount: payment.bankAccount,
    accountHolder: payment.accountHolder,
    adminPasswordManagedHere: Boolean(settings?.adminPasswordHash),
    guestPasswordManagedHere: Boolean(settings?.guestPasswordHash),
  };
}

function settingsTableMissing(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "42P01";
}

export async function GET(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  return NextResponse.json({ settings: settingsResponse(await getStoredSiteSettings()) });
}

export async function PATCH(request: Request) {
  const unauthorized = await requireAdminApi(request);
  if (unauthorized) return unauthorized;

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ message: "잘못된 요청입니다." }, { status: 400 });
  }

  const bankName = normalizeText(body.bank_name, 40);
  const bankAccount = normalizeAccount(body.bank_account);
  const accountHolder = normalizeText(body.account_holder, 40);
  if (!bankName || !bankAccount || !accountHolder) {
    return NextResponse.json({ message: "은행명, 계좌번호, 예금주를 확인해주세요." }, { status: 400 });
  }

  const changeAdminPassword = Object.hasOwn(body, "admin_password");
  const changeGuestPassword = Object.hasOwn(body, "guest_password");
  const adminPassword = changeAdminPassword ? body.admin_password : undefined;
  const guestPassword = changeGuestPassword ? body.guest_password : undefined;
  if (
    (changeAdminPassword && (typeof adminPassword !== "string" || adminPassword.length < 8 || adminPassword.length > 200))
    || (changeGuestPassword && (typeof guestPassword !== "string" || guestPassword.length < 8 || guestPassword.length > 200))
  ) {
    return NextResponse.json({ message: "새 비밀번호는 8자 이상 200자 이하로 입력해주세요." }, { status: 400 });
  }

  try {
    const currentSettings = await getStoredSiteSettings();
    const update: Record<string, unknown> = {
      id: "club",
      bank_name: bankName,
      bank_account: bankAccount,
      account_holder: accountHolder,
      updated_at: new Date().toISOString(),
    };
    if (typeof adminPassword === "string") {
      update.admin_password_hash = await hashScryptPassword(adminPassword);
      update.auth_version = (currentSettings?.authVersion ?? 1) + 1;
    }
    if (typeof guestPassword === "string") update.guest_password_hash = await hashScryptPassword(guestPassword);

    const { error } = await getSupabaseAdmin().from("site_settings").upsert(update, { onConflict: "id" });
    if (error) {
      if (settingsTableMissing(error)) {
        return NextResponse.json({ message: "설정 기능을 사용하려면 Supabase 마이그레이션을 먼저 적용해주세요." }, { status: 503 });
      }
      return databaseError(error);
    }

    const settings = await getStoredSiteSettings();
    return NextResponse.json({ settings: settingsResponse(settings), adminPasswordChanged: typeof adminPassword === "string" });
  } catch (error) {
    return databaseError(error);
  }
}
