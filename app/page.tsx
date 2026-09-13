"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useAppFeedback } from "@/components/AppFeedback";
import type { AttendanceEvent, AttendanceRanking, CalendarEvent, ClubApplication, ClubEvent, ClubMember, ClubPoll, SelectedClubEvent } from "@/lib/club-types";
import { getRegistrationStart } from "@/lib/registration-time";

async function publicRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json() as T & { message?: string };
  if (!response.ok) throw new Error(body.message ?? "요청을 처리하지 못했습니다.");
  return body;
}

const dict = {
  ko: {
    ongoing: "📌 진행 중인 투표 및 행사",
    lesson: "정기 레슨",
    special: "행사", 
    date: "일시:",
    applyView: "신청/보기",
    suggestion: "건의함",
    poll: "투표",
    deadline: "마감:",
    enterText: "",
    submit: "제출",
    attend: "참여",
    absent: "불참",
    checkAttendance: "출석 확인",
    attendanceTitle: "상세 출석부",
    attendanceAuthTitle: "🔒 부원 인증",
    attendanceAuthDesc: "출석부를 보려면 성함을 입력해주세요.",
    attendanceAuthPlaceholder: "",
    close: "닫기 Window", 
    noMembers: "등록된 부원이나 일정이 없습니다.",
    rank: "순위",
    name: "이름",
    total: "총 횟수",
    regular: "정규",
    adminLogin: "👑 임원진 로그인",
    adminDesc: "임원진 전용 페이지입니다. 비밀번호를 입력해주세요.",
    pwPlaceholder: "",
    cancel: "취소",
    enter: "입장",
    infoTab: "정보 및 신청",
    listTab: "신청 현황",
    unspecified: "장소 미지정",
    capacity: "정원",
    persons: "명",
    appName: "신청자 성함",
    namePlaceholder: "",
    memberType: "회원 구분",
    member: "부원",
    ob: "OB",
    guest: "게스트",
    guestPw: "게스트 확인용 비밀번호",
    phoneLabel: "연락처 (게스트 필수)",
    phonePlaceholder: "",
    lessonChoice: "레슨 요일 선택",
    tueThu: "화/목 레슨",
    sat: "토요 레슨",
    afterparty: "뒷풀이 참석 여부",
    join: "참석 🍻",
    decline: "불참",
    applyBtn: "신청하기",
    checking: "확인 중...",
    openAt: "오픈",
    waitlist: "대기",
    noApplicants: "아직 신청자가 없습니다.",
    alertName: "성함을 입력해주세요!",
    alertPhone: "게스트는 연락처를 필수로 입력해야 합니다!",
    alertGuestPw: "게스트 공통 비밀번호가 일치하지 않습니다. 임원진에게 문의해주세요!",
    alertWait: "까지 조금만 기다려주세요!",
    alertNotRegistered: "등록되지 않은 이름입니다. 확인해주세요!",
    alertSuccess: "님, 신청이 완료되었습니다! 🏸",
    alertError: "신청 중 오류가 발생했습니다: ",
    alertAdminFail: "비밀번호가 일치하지 않습니다.",
    participatingExecs: "참여 임원진",
    noEvents: "진행 중인 투표 및 행사가 없습니다.",
    guestPaymentTitle: "💸 게스트비 입금 안내",
    guestPaymentDesc: "게스트비 4,000원을 아래 계좌로 입금해주세요.",
    paymentCompleted: "입금했습니다",
    closed: "마감된 일정입니다", 
    levelAsk: "본인의 실력을 선택해주세요", 
    levelAlert: "실력(레벨)을 선택하셔야 신청이 가능합니다!" 
  },
  en: {
    ongoing: "📌 Ongoing Polls & Events",
    lesson: "Regular Lesson",
    special: "Event",
    date: "Date:",
    applyView: "Apply / View",
    suggestion: "Suggestion Box",
    poll: "Poll",
    deadline: "Deadline:",
    enterText: "",
    submit: "Submit",
    attend: "Attend",
    absent: "Absent",
    checkAttendance: "Check Attendance",
    attendanceTitle: "Detailed Attendance",
    attendanceAuthTitle: "🔒 Member Verification",
    attendanceAuthDesc: "Please enter your registered name to view the attendance list.",
    attendanceAuthPlaceholder: "",
    close: "Close Window",
    noMembers: "No registered members or events.",
    rank: "Rank",
    name: "Name",
    total: "Total",
    regular: "Regular",
    adminLogin: "👑 Executive Team Login",
    adminDesc: "For the executive team only. Please enter the password.",
    pwPlaceholder: "",
    cancel: "Cancel",
    enter: "Enter",
    infoTab: "Info & Apply",
    listTab: "Applicant List",
    unspecified: "Unspecified",
    capacity: "Capacity",
    persons: "",
    appName: "Applicant Name",
    namePlaceholder: "",
    memberType: "Membership",
    member: "Member",
    ob: "OB",
    guest: "Guest",
    guestPw: "Guest Password",
    phoneLabel: "Phone Number (Required for Guests)",
    phonePlaceholder: "",
    lessonChoice: "Select Lesson Day",
    tueThu: "Tue/Thu Lesson",
    sat: "Sat Lesson",
    afterparty: "Afterparty",
    join: "Join 🍻",
    decline: "Decline",
    applyBtn: "Apply Now",
    checking: "Checking...",
    openAt: "Opens at",
    waitlist: "Waitlist",
    noApplicants: "No applicants yet.",
    alertName: "Please enter your name!",
    alertPhone: "Phone number is required for guests!",
    alertGuestPw: "Incorrect guest password. Please ask a club member!",
    alertWait: "Please wait until it opens!",
    alertNotRegistered: "Name not found in the member list. Please check again!",
    alertSuccess: ", your application is complete! 🏸",
    alertError: "Error occurred during application: ",
    alertAdminFail: "Incorrect password.",
    participatingExecs: "Participating Managers",
    noEvents: "There are no ongoing polls or events.",
    guestPaymentTitle: "💸 Guest Fee Transfer",
    guestPaymentDesc: "Please transfer the 4,000 KRW guest fee to the account below.",
    paymentCompleted: "I have transferred",
    closed: "Event Closed", 
    levelAsk: "Please select your skill level", 
    levelAlert: "Skill level selection is required!" 
  }
};

export default function Home() {
  const [lang, setLang] = useState<"ko" | "en">("ko");
  const t = dict[lang]; 
  const { showToast, feedbackUi } = useAppFeedback();

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [polls, setPolls] = useState<ClubPoll[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SelectedClubEvent | null>(null);
  const [applicants, setApplicants] = useState<ClubApplication[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "list">("info");
  
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState<"member" | "ob" | "guest">("member");
  const [guestPw, setGuestPw] = useState("");
  const [phoneNum, setPhoneNum] = useState(""); 
  const [participationType, setParticipationType] = useState("full");
  const [lessonChoice, setLessonChoice] = useState("tue_thu");
  const [afterpartyJoin, setAfterpartyJoin] = useState(false);
  const [userLevel, setUserLevel] = useState(""); 

  const [guestSource, setGuestSource] = useState("인스타");
  const [guestReferrer, setGuestReferrer] = useState("");

  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [rankingMonth, setRankingMonth] = useState(new Date().getMonth() + 1);
  const [rankingYear, setRankingYear] = useState(new Date().getFullYear());
  const [monthlyRanking, setMonthlyRanking] = useState<AttendanceRanking[]>([]);
  const [monthEventsList, setMonthEventsList] = useState<AttendanceEvent[]>([]);

  const [isAttendanceAuthOpen, setIsAttendanceAuthOpen] = useState(false);
  const [attendanceAuthName, setAttendanceAuthName] = useState("");
  const [isAttendanceAuthenticated, setIsAttendanceAuthenticated] = useState(false);

  const [executives, setExecutives] = useState<ClubMember[]>([]);
  const [isGuestPaymentModalOpen, setIsGuestPaymentModalOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // 🔥 서버 시간 동기화
  const [timeOffset, setTimeOffset] = useState<number>(0);

  const trueCurrentTime = new Date(currentTime.getTime() + timeOffset);

  useEffect(() => {
    if (isModalOpen) {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isModalOpen]);

  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isRankingModalOpen || isAttendanceAuthOpen || isGuestPaymentModalOpen;
    if (isAnyModalOpen) {
      window.history.pushState(null, "", window.location.href);
      const handlePopState = () => {
        setIsModalOpen(false);
        setIsRankingModalOpen(false);
        setIsAttendanceAuthOpen(false);
        setIsGuestPaymentModalOpen(false);
      };
      window.addEventListener("popstate", handlePopState);
      return () => window.removeEventListener("popstate", handlePopState);
    }
  }, [isModalOpen, isRankingModalOpen, isAttendanceAuthOpen, isGuestPaymentModalOpen]);

  useEffect(() => {
    const restoreAttendanceAccess = async () => {
      try {
        const { authorized } = await publicRequest<{ authorized: boolean }>("/api/public/attendance/access");
        setIsAttendanceAuthenticated(authorized);
      } catch {
        setIsAttendanceAuthenticated(false);
      }
    };

    void restoreAttendanceAccess();
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const data = await publicRequest<{ events: ClubEvent[]; polls: ClubPoll[]; executives: ClubMember[]; serverTime: string }>("/api/public/bootstrap");
      const calendarEvents: CalendarEvent[] = data.events.map(ev => ({
        id: ev.id, 
        title: ev.title, 
        start: ev.start_at, 
        end: ev.end_at ?? undefined,
        color: ev.type === 'normal' ? '#3b82f6' : ev.type === 'lesson' ? '#8b5cf6' : '#ec4899',
        extendedProps: { ...ev } 
      }));
      setEvents(calendarEvents);
      setPolls(data.polls);
      setExecutives(data.executives);
      setTimeOffset(new Date(data.serverTime).getTime() - Date.now());
    } catch (error) {
      console.error("공개 초기 데이터 조회 실패:", error);
    }
  };

  const fetchApplicants = async (eventId: string) => {
    try {
      const { data } = await publicRequest<{ data: ClubApplication[] }>(`/api/public/applications/${encodeURIComponent(eventId)}`);
      setApplicants(data);
    } catch (error) {
      console.error("신청 명단 조회 실패:", error);
      setApplicants([]);
    }
  };

  const fetchRanking = useCallback(async () => {
    try {
      const { members, events: eventsList, applications: apps } = await publicRequest<{ members: ClubMember[]; events: AttendanceEvent[]; applications: ClubApplication[] }>(`/api/public/attendance?year=${rankingYear}&month=${rankingMonth}`);
      setMonthEventsList(eventsList);
      const ranking = members.map(m => {
        const memberApps = apps.filter(a => a.user_name === m.name) || [];
      let count = 0;
      const attendanceRecord: Record<string, string> = {};
      memberApps.forEach(a => {
        const status = a.attendance_status || 'none';
        attendanceRecord[a.event_id] = status;
        if (status === 'present' || status === 'late') count++;
      });
      return { ...m, count, attendanceRecord };
      });
      ranking.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
      setMonthlyRanking(ranking);
    } catch (error) {
      console.error("출석 데이터 조회 실패:", error);
      setMonthlyRanking([]);
      setMonthEventsList([]);
    }
  }, [rankingMonth, rankingYear]);

  const moveRankingMonth = (direction: -1 | 1) => {
    const nextDate = new Date(rankingYear, rankingMonth - 1 + direction, 1);
    setRankingYear(nextDate.getFullYear());
    setRankingMonth(nextDate.getMonth() + 1);
  };

  useEffect(() => {
    if (isRankingModalOpen) void fetchRanking();
  }, [isRankingModalOpen, fetchRanking]);

  // 🔥 [핵심 보완] 마감/오픈 철통 검증
  const getButtonStatus = () => {
    if (!selectedEvent) return { disabled: true, text: t.checking, style: "bg-gray-200 text-gray-500 cursor-not-allowed" };
    
    const now = trueCurrentTime;

    // FullCalendar가 end 값을 누락시킬 경우를 대비해 DB 원본값(end_at) 사용
    const endTimeString = selectedEvent.end || selectedEvent.end_at || selectedEvent.start_at || selectedEvent.start;
    const eventEnd = new Date(endTimeString);
    // 혹시라도 end_at이 아예 안 적혀있다면 시작 시간 기준 3시간 뒤로 임의 마감 처리
    if (!selectedEvent.end && !selectedEvent.end_at) {
      eventEnd.setHours(eventEnd.getHours() + 3);
    }

    // 마감 차단 로직 (서버 시간 기준)
    if (now.getTime() > eventEnd.getTime()) {
      return {
        disabled: true,
        text: t.closed,
        style: "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300 shadow-none"
      };
    }

    const openTime = getRegistrationStart(selectedEvent, userType);
    if (!openTime) return { disabled: true, text: t.checking, style: "bg-gray-200 text-gray-500 cursor-not-allowed" };

    const isOpen = now.getTime() >= openTime.getTime();
    const timeFormatOptions: Intl.DateTimeFormatOptions = { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", timeZone: "Asia/Seoul" };
    const timeString = openTime.toLocaleString(lang === "ko" ? "ko-KR" : "en-US", timeFormatOptions);
    
    return {
      disabled: !isOpen,
      text: isOpen ? t.applyBtn : `${timeString} ${t.openAt}`,
      style: isOpen ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"
    };
  };

  const status = getButtonStatus();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApplyClick(); 
  };

  const handleAttendanceAuth = async () => {
    if (!attendanceAuthName) return showToast(t.alertName, "error");
    try {
      const { valid } = await publicRequest<{ valid: boolean }>("/api/public/members/verify", {
        method: "POST",
        body: JSON.stringify({ name: attendanceAuthName }),
      });
      if (!valid) return showToast(t.alertNotRegistered, "error");

      setIsAttendanceAuthenticated(true);
      setIsAttendanceAuthOpen(false);
      setAttendanceAuthName("");
      setIsRankingModalOpen(true);
    } catch (error) {
      showToast(t.alertError + (error instanceof Error ? error.message : ""), "error");
    }
  };

  const handleApplyClick = () => {
    if (isSubmitting) return; 
    if (!userName) return showToast(t.alertName, "error");
    if (userType === "guest" && !phoneNum.trim()) return showToast(t.alertPhone, "error");
    if (selectedEvent?.ask_level && !userLevel) return showToast(t.levelAlert, "error");
    
    // 상태에 따른 알럿 분기 처리 (마감되었는지, 대기중인지)
    if (status.disabled) {
      if (status.text === t.closed) return showToast(t.closed, "error");
      return showToast(status.text + " " + t.alertWait, "info");
    }

    if (userType === "guest") {
      setIsGuestPaymentModalOpen(true); 
    } else {
      executeApplication(); 
    }
  };

  const executeApplication = async () => {
    if (isSubmitting) return; 
    setIsSubmitting(true);

    try {
      if (!selectedEvent?.id) return;
      const { application } = await publicRequest<{ application: { user_name: string } }>("/api/public/applications", {
        method: "POST",
        body: JSON.stringify({
          event_id: selectedEvent.id,
          user_name: userName,
          user_type: userType,
          guest_password: userType === "guest" ? guestPw : undefined,
          phone_number: userType === "guest" ? phoneNum : undefined,
          participation_type: participationType,
          lesson_choice: lessonChoice,
          afterparty_join: afterpartyJoin,
          level: userLevel,
          guest_source: guestSource,
          guest_referrer: guestReferrer,
        }),
      });

      showToast(`${application.user_name}${t.alertSuccess}`, "success");
      setIsGuestPaymentModalOpen(false);
      setUserName(""); setGuestPw(""); setPhoneNum(""); setParticipationType("full");
      setLessonChoice("tue_thu"); setAfterpartyJoin(false); setUserLevel("");
      setGuestSource("인스타"); setGuestReferrer("");
      fetchApplicants(selectedEvent.id); setActiveTab("list");
    } catch (error) {
      showToast(t.alertError + (error instanceof Error ? error.message : ""), "error");
    } finally {
      setIsSubmitting(false); 
    }
  };

  const resetAndCloseModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(false);
    setUserName(""); 
    setGuestPw("");
    setPhoneNum("");
    setUserType("member");
    setUserLevel("");
    setGuestSource("인스타");
    setGuestReferrer("");
  };

  const specialEvents = events.filter(ev => ev.extendedProps?.type !== 'normal' && ev.extendedProps?.allow_registration !== false);
  
  type UnifiedListItem =
    | { type: "event"; data: CalendarEvent; id: string }
    | { type: "poll"; data: ClubPoll; id: string };

  const unifiedList: UnifiedListItem[] = [
    ...specialEvents.map((event): UnifiedListItem => ({ type: "event", data: event, id: `event-${event.id}` })),
    ...polls.map((poll): UnifiedListItem => ({ type: "poll", data: poll, id: `poll-${poll.id}` }))
  ].sort((a, b) => {
    // 캘린더 라이브러리 누락 방지용 3중 체크
    const getEventEnd = (ev: CalendarEvent) => {
      if (ev.end) return new Date(ev.end).getTime();
      if (ev.extendedProps?.end_at) return new Date(ev.extendedProps.end_at).getTime();
      return new Date(ev.start).getTime() + (3 * 60 * 60 * 1000);
    };

    const isAClosed = a.type === 'event' 
      ? (trueCurrentTime.getTime() > getEventEnd(a.data))
      : (a.data.deadline && trueCurrentTime.getTime() > new Date(a.data.deadline).getTime());
    
    const isBClosed = b.type === 'event' 
      ? (trueCurrentTime.getTime() > getEventEnd(b.data))
      : (b.data.deadline && trueCurrentTime.getTime() > new Date(b.data.deadline).getTime());

    if (isAClosed !== isBClosed) return isAClosed ? 1 : -1;

    const dateA = a.type === 'event' 
      ? new Date(a.data.start).getTime() 
      : (a.data.deadline ? new Date(a.data.deadline).getTime() : new Date(a.data.created_at).getTime());
    
    const dateB = b.type === 'event' 
      ? new Date(b.data.start).getTime() 
      : (b.data.deadline ? new Date(b.data.deadline).getTime() : new Date(b.data.created_at).getTime());

    return dateA - dateB;
  });

  const hasOngoingItems = unifiedList.length > 0;

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen relative flex flex-col">
      
      <div className="absolute top-6 right-6 md:top-8 md:right-8 flex gap-3 z-50">
        <button onClick={() => setLang(lang === "ko" ? "en" : "ko")} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-full transition-colors shadow-sm">
          {lang === "ko" ? "🌐 EN" : "🌐 KO"}
        </button>
        <a href="/admin/login" className="text-2xl opacity-30 hover:opacity-100 transition-opacity" title="임원진 로그인" aria-label="임원진 로그인">⚙️</a>
      </div>

      <div className="flex items-center justify-center gap-3 my-8">
        <Image src="/logo.png" alt="Snuminton Logo" width={80} height={80} className="w-10 h-10 md:w-20 md:h-20 object-contain drop-shadow-sm" priority />
        <h1 className="text-3xl md:text-4xl font-black text-blue-900 tracking-tighter" style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }}>SNUMINTON</h1>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-gray-100">
        <FullCalendar 
          plugins={[dayGridPlugin, interactionPlugin]} 
          initialView="dayGridMonth" 
          events={events} 
          timeZone="Asia/Seoul"
          height="auto" 
          locale={lang === "ko" ? "ko" : "en"} 
          displayEventTime={true} 
          eventTimeFormat={{ hour: 'numeric', minute: '2-digit', meridiem: false, hour12: false }}
          eventClick={(info) => { 
            const ev = info.event; 
            // 🔥 start, end 누락 방지용 로직
            setSelectedEvent({ 
              ...ev.extendedProps,
              id: ev.id, 
              title: ev.title, 
              start: ev.extendedProps?.start_at || ev.start,
              end: ev.extendedProps?.end_at || ev.end || null
            } as SelectedClubEvent);
            fetchApplicants(ev.id); 
            setActiveTab("info"); 
            setUserType("member"); 
            setIsModalOpen(true); 
          }} 
        />
      </div>

      <div className="mt-16 mb-8 max-w-5xl mx-auto px-2 md:px-0 w-full flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-4 px-1"><h2 className="text-lg font-black text-slate-800">{t.ongoing}</h2></div>
        
        <div className="flex flex-col gap-3 min-h-[250px]">
          {hasOngoingItems ? (
            unifiedList.map((item) => {
              if (item.type === 'event') {
                const ev = item.data;
                const eventEndTime = ev.end ? new Date(ev.end).getTime() : (ev.extendedProps?.end_at ? new Date(ev.extendedProps.end_at).getTime() : new Date(ev.start).getTime() + 3*60*60*1000);
                const isClosed = trueCurrentTime.getTime() > eventEndTime;
                
                return (
                  <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${isClosed ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-md'}`}>
                    <div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-md mb-2 inline-block ${ev.extendedProps.type === 'lesson' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'}`}>{ev.extendedProps.type === 'lesson' ? t.lesson : t.special}</span>
                      <h3 className="font-bold text-slate-900 text-base">{ev.title}</h3>
                      <p className="text-xs text-slate-500 mt-1">
                        {t.date} {new Date(ev.start).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short' })} {new Date(ev.start).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                        {ev.end && ` ~ ${new Date(ev.end).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
                      </p>
                    </div>
                    <button 
                      onClick={() => { setSelectedEvent({ ...ev.extendedProps, id: ev.id, title: ev.title, start: ev.extendedProps.start_at || ev.start, end: ev.extendedProps.end_at || ev.end || null } as SelectedClubEvent); fetchApplicants(ev.id); setActiveTab("info"); setUserType("member"); setIsModalOpen(true); }}
                      className={`w-full md:w-auto px-6 py-2.5 font-bold text-sm rounded-xl transition-colors mt-2 md:mt-0 ${isClosed ? 'bg-slate-200 text-slate-500 hover:bg-slate-300' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                      {isClosed ? t.closed : t.applyView}
                    </button>
                  </div>
                );
              } else {
                const poll = item.data;
                const isPollClosed = poll.deadline && trueCurrentTime.getTime() > new Date(poll.deadline).getTime();
                
                return (
                  <div key={item.id} className={`bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all ${isPollClosed ? 'opacity-60 grayscale-[30%]' : 'hover:shadow-md'}`}>
                    <div>
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-1 rounded-md mb-2 inline-block">{poll.poll_type === 'text' ? t.suggestion : t.poll}</span>
                      <h3 className="font-bold text-slate-900 text-base">{poll.title}</h3>
                      {poll.deadline && <p className="text-xs text-slate-500 mt-1">{t.deadline} {new Date(poll.deadline).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US')}</p>}
                    </div>
                    <div className="w-full md:w-auto flex gap-2 mt-2 md:mt-0">
                      {isPollClosed ? (
                        <span className="px-4 py-2 bg-slate-100 text-slate-400 font-bold text-sm rounded-xl w-full md:w-auto text-center">{t.closed}</span>
                      ) : poll.poll_type === 'text' ? (
                        <><input type="text" placeholder={t.enterText} className="flex-1 md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-300" /><button className="px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-700">{t.submit}</button></>
                      ) : (
                        <><button className="flex-1 md:flex-none px-6 py-2.5 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-100">{t.attend}</button><button className="flex-1 md:flex-none px-6 py-2.5 bg-slate-50 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-100">{t.absent}</button></>
                      )}
                    </div>
                  </div>
                );
              }
            })
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 bg-slate-50/50 py-12">
              <span className="text-2xl mb-3 opacity-60">🍃</span>
              <p className="text-sm font-bold">{t.noEvents}</p>
            </div>
          )}
        </div>
      </div>

      <button onClick={() => { if (isAttendanceAuthenticated) { setIsRankingModalOpen(true); } else { setIsAttendanceAuthOpen(true); } }} className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black text-sm shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2 border border-slate-700">
        {t.checkAttendance}
      </button>

      {isAttendanceAuthOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={() => setIsAttendanceAuthOpen(false)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-xl text-slate-900 mb-2">{t.attendanceAuthTitle}</h3><p className="text-xs text-slate-500 mb-6">{t.attendanceAuthDesc}</p>
            <input type="text" placeholder={t.attendanceAuthPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-bold text-center mb-6 transition-colors" value={attendanceAuthName} onChange={e => setAttendanceAuthName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAttendanceAuth()} autoFocus />
            <div className="flex gap-2"><button onClick={() => setIsAttendanceAuthOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">{t.cancel}</button><button onClick={handleAttendanceAuth} className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">{t.enter}</button></div>
          </div>
        </div>
      )}

      {isRankingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 transition-all" onClick={() => setIsRankingModalOpen(false)}>
          <div className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 text-white p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <button onClick={() => moveRankingMonth(-1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors font-bold">◀</button>
                <h2 className="text-xl font-black tracking-tight">{rankingYear}. {String(rankingMonth).padStart(2, '0')} {t.attendanceTitle}</h2>
                <button onClick={() => moveRankingMonth(1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors font-bold">▶</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-50 p-0 custom-scrollbar">
              <table className="w-full text-xs md:text-sm text-center min-w-max border-collapse">
                <thead>
                  <tr className="bg-white text-slate-500 font-bold border-b-2 border-slate-200">
                    <th className="p-2 md:p-3 sticky left-0 bg-white z-10 w-8 md:w-12 border-r border-slate-100">{t.rank}</th><th className="p-2 md:p-3 sticky left-8 md:left-12 bg-white z-10 w-16 md:w-24 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100">{t.name}</th><th className="p-2 md:p-3 w-12 md:w-16 text-blue-600 bg-blue-50/30 border-r border-slate-100">{t.total}</th>
                    {monthEventsList.map(ev => (
                      <th key={ev.id} className="p-1 md:p-2 min-w-[36px] md:min-w-[45px] border-r border-slate-100 bg-white">
                        <div className="flex flex-col items-center"><span className="text-[8px] md:text-[10px] text-slate-400 font-medium mb-0.5">{ev.type === 'normal' ? t.regular : ev.type === 'lesson' ? t.lesson : t.special}</span><span className="text-slate-800 font-black">{new Date(ev.start_at).getDate()}</span></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRanking.length === 0 ? <tr><td colSpan={100} className="p-10 text-center text-slate-400">{t.noMembers}</td></tr> : monthlyRanking.map((stat, idx) => (
                    <tr key={stat.id} className="hover:bg-slate-50 transition-colors bg-white">
                      <td className="p-2 md:p-3 text-slate-400 font-bold sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-50">{idx + 1}</td><td className="p-2 md:p-3 text-left font-bold text-slate-800 sticky left-8 md:left-12 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50 max-w-[4rem] md:max-w-none truncate">{stat.name}</td><td className="p-2 md:p-3 font-black text-blue-600 bg-blue-50/30 border-r border-slate-50">{stat.count}</td>
                      {monthEventsList.map(ev => {
                        const status = stat.attendanceRecord[ev.id];
                        return <td key={ev.id} className="p-1.5 md:p-2 border-r border-slate-50 text-base">{status === 'present' ? <span title="출석">🟢</span> : status === 'late' ? <span title="지각">🔺</span> : status === 'none' ? <span className="text-red-300 font-bold text-[10px] md:text-xs" title="결석">✕</span> : <span className="text-slate-200 font-light text-[10px] md:text-xs">-</span>}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setIsRankingModalOpen(false)} className="w-full py-5 bg-white text-slate-500 text-sm font-bold border-t border-slate-200 hover:text-slate-800 hover:bg-slate-50 transition-colors uppercase tracking-widest z-20">{t.close}</button>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-0 md:p-6 transition-all" onClick={resetAndCloseModal}>
          <div className="bg-white w-full max-w-5xl rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-[80vh] border border-white/20 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex md:hidden border-b border-slate-100 bg-slate-50/50">
              <button onClick={() => setActiveTab("info")} className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === "info" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-400"}`}>{t.infoTab}</button>
              {selectedEvent?.allow_registration !== false && (
                <button onClick={() => setActiveTab("list")} className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === "list" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-400"}`}>{t.listTab} <span className="ml-1 opacity-60">{applicants.filter(a => a.user_type !== 'ob').length}</span></button>
              )}
            </div>
            <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">
              <div className={`flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar ${activeTab === 'info' ? 'block' : 'hidden md:block'}`}>
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">{selectedEvent?.type === 'normal' ? t.regular : selectedEvent?.type === 'lesson' ? t.lesson : t.special}</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">{selectedEvent?.title}</h2>
                  <div className="grid grid-cols-1 gap-3 text-slate-600">
                    <div className="flex items-center gap-3 text-sm font-medium"><span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">📅</span>{selectedEvent && new Date(selectedEvent.start).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</div>
                    <div className="flex items-center gap-3 text-sm font-medium"><span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">📍</span>{selectedEvent?.location || t.unspecified}</div>
                    {selectedEvent?.allow_registration !== false && (
                      <div className="flex items-center gap-3 text-sm font-medium"><span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">👥</span>{t.capacity} {selectedEvent?.max_capacity}{t.persons}</div>
                    )}
                  </div>

                  {selectedEvent?.participating_execs && selectedEvent.participating_execs.length > 0 && (
                    <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <h4 className="text-[11px] font-bold text-slate-500 mb-2.5 uppercase tracking-wide">👑 {t.participatingExecs}</h4>
                      <div className="flex flex-wrap gap-2">
                        {[...selectedEvent.participating_execs].sort((a, b) => {
                          const roleA = executives.find(e => e.name === a)?.user_type || '임원진';
                          const roleB = executives.find(e => e.name === b)?.user_type || '임원진';
                          const roleOrder: Record<string, number> = { '회장': 1, '부회장': 2, '임원진': 3 };
                          return (roleOrder[roleA] || 4) - (roleOrder[roleB] || 4);
                        }).map((execName: string) => {
                          const execInfo = executives.find(e => e.name === execName);
                          const role = execInfo ? execInfo.user_type : '임원진';
                          
                          let containerStyle = "bg-slate-100 text-slate-700 border-slate-300 shadow-sm"; 
                          if (role === '회장') containerStyle = "bg-blue-600 text-white shadow-sm border-transparent";
                          else if (role === '부회장') containerStyle = "bg-sky-100 text-sky-800 border-sky-200";

                          return (
                            <div key={execName} className={`flex items-center justify-center px-3.5 py-1.5 rounded-xl border text-xs font-black tracking-wide ${containerStyle}`}>
                              {execName}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100">
                  {selectedEvent?.allow_registration === false ? (
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl text-center">
                      <p className="font-bold text-slate-500">참가 신청을 받지 않는 일정입니다.</p>
                    </div>
                  ) : (
                    <>
                      <div className="group">
                        <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">{t.appName}</label>
                        <input type="text" placeholder="" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-semibold" value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={handleKeyDown} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">{t.memberType}</label>
                          <select className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-semibold appearance-none" value={userType} onChange={(e) => setUserType(e.target.value as "member" | "ob" | "guest")}>
                            <option value="member">{t.member}</option>
                            {selectedEvent?.type !== 'special' && <option value="ob">{t.ob}</option>}
                            {selectedEvent?.type !== 'special' && selectedEvent?.allow_guests !== false && <option value="guest">{t.guest}</option>}
                          </select>
                          {selectedEvent?.type !== 'special' && selectedEvent?.allow_guests === false && (
                            <p className="text-[11px] text-rose-500 mt-2 ml-1 font-bold">🚫 이 일정은 게스트 신청을 받지 않습니다.</p>
                          )}
                        </div>
                      </div>

                      {selectedEvent?.ask_level && (
                        <div className="space-y-2 pt-2">
                          <label className="block text-xs font-bold text-slate-400 ml-1">{t.levelAsk}</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setUserLevel("A/B")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${userLevel === 'A/B' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-100 text-slate-400'}`}>상</button>
                            <button onClick={() => setUserLevel("C")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${userLevel === 'C' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-100 text-slate-400'}`}>중</button>
                            <button onClick={() => setUserLevel("D/초심")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${userLevel === 'D/초심' ? 'border-pink-500 bg-pink-50 text-pink-600' : 'border-slate-100 text-slate-400'}`}>하</button>
                          </div>
                        </div>
                      )}

                      {userType === "guest" && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">{t.phoneLabel}</label>
                            <input type="text" placeholder="" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 outline-none focus:border-orange-400 text-slate-900 font-semibold transition-all" value={phoneNum} onKeyDown={handleKeyDown} onChange={(e) => setPhoneNum(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">{t.guestPw}</label>
                            <input type="password" placeholder="" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 outline-none focus:border-orange-400 text-slate-900 font-semibold transition-all" value={guestPw} onKeyDown={handleKeyDown} onChange={(e) => setGuestPw(e.target.value)} />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">신청 경로</label>
                            <select value={guestSource} onChange={(e) => setGuestSource(e.target.value)} className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 outline-none focus:border-orange-400 text-slate-900 font-semibold transition-all appearance-none">
                              <option value="인스타">인스타</option>
                              <option value="홍보 글">홍보 글</option>
                              <option value="부원 소개">부원 소개</option>
                            </select>
                          </div>
                          {guestSource === "부원 소개" && (
                            <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">소개해준 부원 이름</label>
                              <input type="text" placeholder="" className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 outline-none focus:border-orange-400 text-slate-900 font-semibold transition-all" value={guestReferrer} onChange={(e) => setGuestReferrer(e.target.value)} />
                            </div>
                          )}
                        </div>
                      )}
                      {selectedEvent?.type === 'normal' && (
                        <div className="space-y-2 pt-2">
                          <label className="block text-xs font-bold text-slate-400 ml-1 uppercase">Participation Type</label>
                          <div className="grid grid-cols-3 gap-2">
                            <button onClick={() => setParticipationType("full")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'full' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>Full (19-22)</button>
                            <button onClick={() => setParticipationType("partial_7_9")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'partial_7_9' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>Part (19-21)</button>
                            <button onClick={() => setParticipationType("partial_8_10")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'partial_8_10' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>Part (20-22)</button>
                          </div>
                        </div>
                      )}
                      {selectedEvent?.type === 'lesson' && (
                        <div className="space-y-2 pt-2">
                          <label className="block text-xs font-bold text-slate-400 ml-1">{t.lessonChoice}</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setLessonChoice("tue_thu")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${lessonChoice === 'tue_thu' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>{t.tueThu}</button>
                            <button onClick={() => setLessonChoice("sat")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${lessonChoice === 'sat' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>{t.sat}</button>
                          </div>
                        </div>
                      )}
                      {selectedEvent?.has_afterparty && (
                        <div className="space-y-2 pt-2">
                          <label className="block text-xs font-bold text-slate-400 ml-1">{t.afterparty}</label>
                          <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => setAfterpartyJoin(true)} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${afterpartyJoin === true ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>{t.join}</button>
                            <button onClick={() => setAfterpartyJoin(false)} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${afterpartyJoin === false ? 'border-slate-300 bg-slate-50 text-slate-600' : 'border-slate-100 text-slate-400'}`}>{t.decline}</button>
                          </div>
                        </div>
                      )}
                      <button disabled={status.disabled || isSubmitting} onClick={handleApplyClick} className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] mt-2 ${status.style}`}>
                        {isSubmitting ? "처리 중..." : status.text}
                      </button>
                    </>
                  )}
                </div>
              </div>

              {selectedEvent?.allow_registration !== false && (
                <div className={`w-full md:w-[400px] bg-slate-50 p-8 md:p-12 border-l border-slate-100 flex-col h-full overflow-hidden ${activeTab === 'list' ? 'flex' : 'hidden md:flex'}`}>
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-black text-slate-900">{t.listTab}</h3>
                    <span className="bg-white px-3 py-1 rounded-full text-blue-600 text-xs font-black shadow-sm border border-slate-200">
                      {applicants.filter(a => a.user_type !== 'ob').length} / {selectedEvent?.max_capacity}
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                  {applicants.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10"><p className="text-[11px] font-medium">{t.noApplicants}</p></div>
                  ) : (
                    <div className="divide-y divide-white/50 border-t border-slate-100">
                      {(() => {
                        const obApps = applicants.filter(a => a.user_type === 'ob');
                        const regApps = applicants.filter(a => a.user_type !== 'ob');
                        
                        const displayApps = [
                          ...obApps.map(app => ({ 
                            ...app, 
                            displayIndex: '-', 
                            isWaitlisted: false, 
                            waitlistNumber: 0 
                          })),
                          ...regApps.map((app, i) => {
                            const capacity = selectedEvent?.max_capacity ?? 0;
                            const isWaitlisted = i >= capacity;
                            const waitlistNumber = isWaitlisted ? i - capacity + 1 : 0;
                            return { 
                              ...app, 
                              displayIndex: String(i + 1).padStart(2, '0'), 
                              isWaitlisted, 
                              waitlistNumber 
                            };
                          })
                        ];

                        return displayApps.map((app, i) => {
                          let rowColor = "bg-white hover:bg-slate-50 transition-colors"; 
                          let badgeColor = "bg-slate-100 text-slate-400";
                          if (app.user_type === 'guest') { rowColor = "bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors"; badgeColor = "bg-emerald-200 text-emerald-700"; } 
                          else if (app.user_type === 'ob') { rowColor = "bg-blue-50/80 hover:bg-blue-100/80 transition-colors"; badgeColor = "bg-blue-600/20 text-blue-700"; } 
                          else if (app.participation_type !== 'full') { rowColor = "bg-amber-50/80 hover:bg-amber-100/80 transition-colors"; badgeColor = "bg-amber-200 text-amber-700"; }
                          return (
                            <div key={app.id || i} className={`flex justify-between items-center py-2 px-3 group flex-wrap md:flex-nowrap ${rowColor} ${app.isWaitlisted ? 'opacity-40 grayscale hover:opacity-60' : ''}`}>
                              <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden mr-2">
                                <span className="text-[10px] font-black opacity-30 w-4 flex-shrink-0 text-center">{app.displayIndex}</span>
                                <div className="flex items-center gap-1.5 min-w-0 truncate">
                                  <span className="font-bold text-slate-800 text-[12px] truncate leading-none">{app.user_name}</span>
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none flex-shrink-0 scale-90 ${badgeColor}`}>{app.user_type === 'member' || app.user_type === '회장' || app.user_type === '부회장' || app.user_type === '임원진' ? t.member : app.user_type === 'ob' ? t.ob : t.guest}</span>
                                  {app.isWaitlisted && <span className="text-[8px] font-bold bg-slate-700 text-white px-1.5 py-0.5 rounded leading-none flex-shrink-0">{t.waitlist} {app.waitlistNumber}</span>}
                                  {app.lesson_choice === 'tue_thu' && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">{t.tueThu}</span>}
                                  {app.lesson_choice === 'sat' && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">{t.sat}</span>}
                                  {app.afterparty_join && <span className="text-[10px]">🍻</span>}
                                  {app.level && (
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${
                                      app.level === 'A/B' ? 'bg-red-50 text-red-600 border-red-200' :
                                      app.level === 'C' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                      'bg-emerald-50 text-emerald-600 border-emerald-200'
                                    }`}>
                                      {app.level === 'A/B' ? '상' : app.level === 'C' ? '중' : '하'}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ml-auto text-right">
                                {app.participation_type !== 'full' && (
                                  <span className="text-[8px] font-black bg-white/60 text-amber-600 px-1 py-0.5 rounded border border-amber-200 leading-none">
                                    {app.participation_type === 'partial_7_9' ? '19-21' : '20-22'}
                                  </span>
                                )}
                                {app.applied_at && (
                                  <div className="flex items-baseline gap-1 tabular-nums">
                                    <span className="text-[9px] font-medium text-slate-400">{new Date(app.applied_at).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: '2-digit', day: '2-digit' }).replace('.', '/').replace('.', '')}</span>
                                    <span className="text-[10px] font-bold text-slate-500">{new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                  </div>
                </div>
              )}
            </div>
            <button onClick={resetAndCloseModal} className="hidden md:block w-full py-6 bg-white text-slate-400 text-xs font-bold border-t border-slate-100 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">{t.close}</button>
          </div>
        </div>
      )}

      {isGuestPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setIsGuestPaymentModalOpen(false)}>
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col items-center animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center text-2xl mb-4">💸</div>
            <h3 className="font-black text-xl text-slate-900 mb-2">{t.guestPaymentTitle}</h3>
            <div className="text-sm text-slate-600 text-center mb-6 w-full">
              <p className="leading-relaxed mb-4">{t.guestPaymentDesc}</p>
              
              <button 
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText("3333365925467");
                    showToast("계좌번호가 복사되었습니다! 📋", "success");
                  } catch {
                    showToast("계좌번호를 복사하지 못했습니다.", "error");
                  }
                }}
                className="w-full flex items-center justify-between font-black text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-3 rounded-xl transition-all active:scale-95 group"
                title="클릭해서 복사하기"
              >
                <div className="flex-1 flex flex-col items-center justify-center leading-tight">
                  <span className="text-[13px] md:text-sm">카카오뱅크 3333365925467</span>
                  <span className="text-[11px] md:text-xs text-slate-500 font-bold mt-1">예금주: 안진식</span>
                </div>
                <span className="text-slate-400 group-hover:text-blue-500 transition-colors text-lg flex-shrink-0">📋</span>
              </button>
              <p className="text-[10px] text-slate-400 mt-2">박스를 클릭하면 계좌번호가 복사됩니다.</p>
            </div>

            <div className="flex gap-2 w-full">
              <button onClick={() => setIsGuestPaymentModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors">{t.cancel}</button>
              <button disabled={isSubmitting} onClick={executeApplication} className="flex-1 py-3.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/30">{isSubmitting ? "처리 중..." : t.paymentCompleted}</button>
            </div>
          </div>
        </div>
      )}

      {feedbackUi}

      <footer className="mt-auto pt-16 pb-8 text-center text-[10px] md:text-xs text-slate-400 font-medium">
        <p>© 2026 SNUMINTON. | Developed by 이주원</p>
      </footer>

    </main>
  );
}
