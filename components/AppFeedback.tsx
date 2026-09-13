"use client";

import { useCallback, useEffect, useState } from "react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: number;
  message: string;
  tone: ToastTone;
};

type Confirmation = {
  message: string;
  confirmLabel: string;
  resolve: (approved: boolean) => void;
};

const toastStyles: Record<ToastTone, string> = {
  success: "bg-emerald-600 text-white",
  error: "bg-rose-600 text-white",
  info: "bg-slate-800 text-white",
};

export function useAppFeedback() {
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast((current) => current?.id === toast.id ? null : current), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = useCallback((message: string, tone: ToastTone = "info") => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  const askForConfirmation = useCallback((message: string, confirmLabel = "확인") => {
    return new Promise<boolean>((resolve) => {
      setConfirmation({ message, confirmLabel, resolve });
    });
  }, []);

  const settleConfirmation = useCallback((approved: boolean) => {
    if (!confirmation) return;
    confirmation.resolve(approved);
    setConfirmation(null);
  }, [confirmation]);

  const feedbackUi = (
    <>
      {toast && (
        <div className={`fixed right-4 top-4 z-[500] max-w-sm rounded-2xl px-4 py-3 text-sm font-bold shadow-xl ${toastStyles[toast.tone]}`} role="status" aria-live="polite">
          {toast.message}
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label="작업 확인">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <p className="whitespace-pre-line text-center text-sm font-bold leading-relaxed text-slate-700">{confirmation.message}</p>
            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => settleConfirmation(false)} className="flex-1 rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200">취소</button>
              <button type="button" autoFocus onClick={() => settleConfirmation(true)} className="flex-1 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800">{confirmation.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { showToast, askForConfirmation, feedbackUi };
}
