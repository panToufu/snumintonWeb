"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_OB_APPLICATIONS_PER_EVENT } from "@/lib/application-policy";

type Notice = {
  id: string;
  storageKey: string;
  content: Record<"ko" | "en", { title: string; description: string }>;
};

// Add new notices here, newest first. Bump a notice's storage key version when
// its content changes so it is shown again without resetting other notices.
const notices: Notice[] = [
  {
    id: "ob-capacity",
    storageKey: `snuminton:notice:ob-capacity:v2:${MAX_OB_APPLICATIONS_PER_EVENT}`,
    content: {
      ko: {
        title: "운동별 OB 정원 제한 안내",
        description: `운동별 OB 정원을 ${MAX_OB_APPLICATIONS_PER_EVENT}명으로 제한하려고 합니다. 쾌적한 운동 환경을 위한 것이므로 양해해주시면 감사드리겠습니다`,
      },
      en: {
        title: "OB capacity limit per session",
        description: `We plan to limit OB participation to ${MAX_OB_APPLICATIONS_PER_EVENT} people per session to keep sessions comfortable for everyone. Thank you for your understanding.`,
      },
    },
  },
];

const copy = {
  ko: {
    notifications: "공지사항",
    noticeList: "공지 목록",
    noticeCount: (count: number) => `총 ${count}개의 공지`,
    viewNotice: "공지 보기",
    empty: "등록된 공지가 없습니다.",
    revisit: "이 안내는 좌측 상단 알림 버튼에서 언제든 다시 확인할 수 있습니다.",
    close: "닫기",
    confirm: "넵",
  },
  en: {
    notifications: "Notices",
    noticeList: "Notice list",
    noticeCount: (count: number) => `${count} notice${count === 1 ? "" : "s"}`,
    viewNotice: "Read notice",
    empty: "No notices yet.",
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
  const [isListOpen, setIsListOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const firstNoticeRef = useRef<HTMLButtonElement>(null);
  const dialogRefs = useRef(new Map<string, HTMLDialogElement>());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const confirmRefs = useRef(new Map<string, HTMLButtonElement>());
  const previousOverflow = useRef<string | null>(null);

  const restoreScrolling = useCallback(() => {
    if (previousOverflow.current !== null) {
      document.body.style.overflow = previousOverflow.current;
      previousOverflow.current = null;
    }
  }, []);

  const openNotice = useCallback((noticeId: string) => {
    const dialog = dialogRefs.current.get(noticeId);
    if (!dialog || dialog.open) return;
    dialog.showModal();
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRefs.current.get(noticeId)?.focus();
  }, []);

  const dismissNotice = (notice: Notice) => {
    try {
      window.localStorage.setItem(notice.storageKey, "acknowledged");
    } catch {
      // The notice can still be dismissed if browser storage is unavailable.
    }
    dialogRefs.current.get(notice.id)?.close();
  };

  useEffect(() => {
    const dialogs = [...dialogRefs.current.values()];
    let unreadNotice: Notice | undefined;
    try {
      unreadNotice = notices.find((notice) => window.localStorage.getItem(notice.storageKey) !== "acknowledged");
    } catch {
      unreadNotice = notices[0];
    }
    if (unreadNotice) openNotice(unreadNotice.id);

    return () => {
      dialogs.forEach((dialog) => dialog.close());
      restoreScrolling();
    };
  }, [openNotice, restoreScrolling]);

  useEffect(() => {
    if (!isListOpen) return;
    firstNoticeRef.current?.focus();
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setIsListOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsListOpen(false);
        buttonRef.current?.focus();
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setIsListOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
    };
  }, [isListOpen]);

  return (
    <>
      <div ref={containerRef} className="absolute left-6 top-6 z-50 md:left-8 md:top-8">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsListOpen((open) => !open)}
        aria-label={`${t.notifications}, ${t.noticeCount(notices.length)}`}
        aria-expanded={isListOpen}
        aria-controls="site-notice-list"
        title={t.notifications}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-blue-100 bg-white text-blue-700 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
      >
        <BellIcon className="h-5 w-5" />
        <span aria-hidden="true" className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-black leading-none text-white">{notices.length > 99 ? "99+" : notices.length}</span>
      </button>

      {isListOpen && (
        <section id="site-notice-list" aria-label={t.noticeList} className="absolute left-0 top-full mt-3 w-80 max-w-[calc(100vw-3rem)] overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="text-sm font-black text-slate-900">{t.notifications}</h2>
            <span className="text-xs font-medium text-slate-500">{t.noticeCount(notices.length)}</span>
          </div>
          <ul className="max-h-[min(60dvh,24rem)] overflow-y-auto divide-y divide-slate-100">
            {notices.map((notice, index) => (
              <li key={notice.id}>
                <button ref={index === 0 ? firstNoticeRef : undefined} type="button" onClick={() => { setIsListOpen(false); openNotice(notice.id); }} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-blue-50 focus-visible:bg-blue-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600">
                  <span>
                    <span className="block text-sm font-bold leading-relaxed text-slate-800">{notice.content[lang].title}</span>
                    <span className="mt-1 block text-xs text-slate-500">{t.viewNotice}</span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                </button>
              </li>
            ))}
          </ul>
          {notices.length === 0 && <p className="px-5 py-6 text-sm text-slate-500">{t.empty}</p>}
        </section>
      )}
      </div>

      {notices.map((notice) => (
      <dialog
        key={notice.id}
        ref={(element) => { if (element) dialogRefs.current.set(notice.id, element); else dialogRefs.current.delete(notice.id); }}
        id={`site-notice-${notice.id}`}
        aria-labelledby={`site-notice-title-${notice.id}`}
        aria-describedby={`site-notice-description-${notice.id}`}
        aria-modal="true"
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[2rem] border border-blue-100 bg-white p-6 text-slate-900 shadow-2xl backdrop:bg-slate-900/60 backdrop:backdrop-blur-sm sm:p-8"
        onCancel={(event) => {
          event.preventDefault();
          dismissNotice(notice);
        }}
        onClose={() => {
          // Ignore a queued close event if Strict Mode has already reopened it.
          if ([...dialogRefs.current.values()].some((dialog) => dialog.open)) return;
          restoreScrolling();
          buttonRef.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismissNotice(notice);
        }}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <BellIcon className="h-6 w-6" />
          </span>
          <button type="button" onClick={() => dismissNotice(notice)} aria-label={t.close} className="flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </div>
        <p className="mb-2 text-xs font-bold tracking-wide text-blue-600">{t.notifications}</p>
        <h2 id={`site-notice-title-${notice.id}`} className="text-2xl font-black tracking-tight">{notice.content[lang].title}</h2>
        <div id={`site-notice-description-${notice.id}`} className="mt-5 space-y-3">
          <p className="text-sm leading-relaxed text-slate-600">{notice.content[lang].description}</p>
          <p className="text-xs leading-relaxed text-slate-500">{t.revisit}</p>
        </div>
        <button ref={(element) => { if (element) confirmRefs.current.set(notice.id, element); else confirmRefs.current.delete(notice.id); }} type="button" onClick={() => dismissNotice(notice)} className="mt-7 w-full rounded-2xl bg-blue-600 py-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">{t.confirm}</button>
      </dialog>
      ))}
    </>
  );
}
