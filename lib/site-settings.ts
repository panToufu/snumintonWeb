import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type PaymentSettings = {
  bankName: string;
  bankAccount: string;
  accountHolder: string;
};

type StoredSiteSettings = PaymentSettings & {
  adminPasswordHash: string | null;
  guestPasswordHash: string | null;
  authVersion: number;
};

export const fallbackPaymentSettings: PaymentSettings = {
  bankName: "카카오뱅크",
  bankAccount: "3333335748122",
  accountHolder: "김민성",
};

function normalizedText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export async function getStoredSiteSettings(): Promise<StoredSiteSettings | null> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("site_settings")
      .select("bank_name,bank_account,account_holder,admin_password_hash,guest_password_hash,auth_version")
      .eq("id", "club")
      .maybeSingle();

    if (error) {
      // The app keeps working with environment-variable passwords until the
      // accompanying migration has been applied.
      if (error.code !== "42P01") console.error("사이트 설정 조회 실패", error);
      return null;
    }
    if (!data) return null;

    return {
      bankName: normalizedText(data.bank_name, fallbackPaymentSettings.bankName),
      bankAccount: normalizedText(data.bank_account, fallbackPaymentSettings.bankAccount),
      accountHolder: normalizedText(data.account_holder, fallbackPaymentSettings.accountHolder),
      adminPasswordHash: typeof data.admin_password_hash === "string" ? data.admin_password_hash : null,
      guestPasswordHash: typeof data.guest_password_hash === "string" ? data.guest_password_hash : null,
      authVersion: typeof data.auth_version === "number" && data.auth_version > 0 ? data.auth_version : 1,
    };
  } catch (error) {
    console.error("사이트 설정 조회 실패", error);
    return null;
  }
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const settings = await getStoredSiteSettings();
  return settings ?? fallbackPaymentSettings;
}

export async function getGuestPasswordHash() {
  const settings = await getStoredSiteSettings();
  return settings?.guestPasswordHash ?? process.env.GUEST_PASSWORD_HASH;
}
