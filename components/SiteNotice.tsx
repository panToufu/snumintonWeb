"use client";

import { useCallback, useEffect, useRef } from "react";
import { MAX_OB_APPLICATIONS_PER_EVENT } from "@/lib/application-policy";

// Bump the version when the notice changes so it is shown again.
const NOTICE_STORAGE_KEY = `snuminton:notice:ob-capacity:v2:${MAX_OB_APPLICATIONS_PER_EVENT}`;

const copy = {
  ko: {
    notifications: "공지사항",
    title: "운동별 OB 정원 제한 안내",
    description: `운동별 OB 정원을 ${MAX_OB_APPLICATIONS_PER_EVENT}명으로 제한하려고 합니다. 쾌적한 운동 환경을 위한 것이므로 양해해주시면 감사드리겠습니다`,
    revisit: "이 안내는 좌측 상단 알림 버튼에서 언제든 다시 확인할 수 있습니다.",
    close: "닫기",
    confirm: "넵",
  },
  en: {
    notifications: "Notices",
    title: "OB capacity limit per session",
    description: `We plan to limit OB participation to ${MAX_OB_APPLICATIONS_PER_EVENT} people per session to keep sessions comfortable for everyone. Thank you for your understanding.`,
    revisit: "You can read this notice again anytime using the bell at the top left.",
    close: "Close",
    confirm: "OK",
  },
};

function BellIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </svg>
  );
}

export default function SiteNotice({ lang }: { lang: "ko" | "en" }) {
  const t = copy[lang];
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);

  const restoreScrolling = useCallback(() => {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }, []);

  const openNotice = useCallback(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
  }, []);

  const dismissNotice = () => {
    try {
      window.localStorage.setItem(NOTICE_STORAGE_KEY, "acknowledged");
    } catch {
      // The notice can still be dismissed if browser storage is unavailable.
    }
    dialogRef.current?.close();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    let acknowledged = false;
    try {
      acknowledged = window.localStorage.getItem(NOTICE_STORAGE_KEY) === "acknowledged";
    } catch {
      // Show the notice normally when browser storage is unavailable.
    }
    if (!acknowledged) openNotice();

    return () => {
      dialog?.close();
      restoreScrolling();
    };
  }, [openNotice, restoreScrolling]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={openNotice}
        aria-label={t.notifications}
        aria-haspopup="dialog"
        aria-controls="site-notice"
        title={t.notifications}
        className="absolute left-6 top-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 md:left-8 md:top-8"
      >
        <BellIcon className="h-5 w-5" />
      </button>

      <dialog
        ref={dialogRef}
        id="site-notice"
        aria-labelledby="site-notice-title"
        aria-describedby="site-notice-description"
        aria-modal="true"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[2rem] border border-blue-100 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm sm:p-8"
        onCancel={(event) => {
          event.preventDefault();
          dismissNotice();
        }}
        onClose={() => {
          // Ignore a queued close event if Strict Mode has already reopened it.
          if (dialogRef.current?.open) return;
          restoreScrolling();
          buttonRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissNotice();
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BellIcon className="h-6 w-6" />
          </span>
          <button type="button" onClick={dismissNotice} aria-label={t.close} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <p className="mb-2 text-xs font-bold tracking-wide text-blue-600">{t.notifications}</p>
        <h2 id="site-notice-title" className="text-2xl font-black tracking-tight">{t.title}</h2>
        <div id="site-notice-description" className="mt-5 space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{t.description}</p>
          <p className="text-xs leading-relaxed text-slate-500">{t.revisit}</p>
        </div>
        <button ref={confirmRef} type="button" onClick={dismissNotice} className="mt-7 w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{t.confirm}</button>
      </dialog>
    </>
  );
}
