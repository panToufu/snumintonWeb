"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? "로그인에 실패했습니다.");
        return;
      }
      router.replace("/admin");
      router.refresh();
    } catch {
      setError("연결 상태를 확인한 뒤 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
        <p className="mb-2 text-sm font-bold text-blue-600">SNUMINTON</p>
        <h1 className="text-2xl font-black text-slate-900">운영진 페이지</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">운영진 공용 비밀번호를 입력해주세요.</p>
        <label className="mt-6 block text-sm font-bold text-slate-700" htmlFor="admin-password">비밀번호</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-2 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none focus:border-blue-500"
          required
          autoFocus
        />
        {error && <p className="mt-3 text-sm font-medium text-rose-600" role="alert">{error}</p>}
        <button disabled={isSubmitting} className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-black text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">
          {isSubmitting ? "확인 중..." : "운영진 페이지로 이동"}
        </button>
      </form>
    </main>
  );
}
