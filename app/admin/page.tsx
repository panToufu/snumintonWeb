"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../supabase"; 

export default function AdminPage() {
  const router = useRouter();
  
  const [adminTab, setAdminTab] = useState<"calendar" | "daily" | "monthly" | "members" | "register" | "special" | "executives" | "fees">("daily"); 
  
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState<string>("");
  const [selectedEventDate, setSelectedEventDate] = useState<Date | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  
  const [members, setMembers] = useState<any[]>([]);
  const [bulkMemberNames, setBulkMemberNames] = useState("");
  const [newMemberType, setNewMemberType] = useState("member");

  const [newExecName, setNewExecName] = useState(""); 
  const [newExecRole, setNewExecRole] = useState("임원진");

  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  
  const [monthlyRanking, setMonthlyRanking] = useState<any[]>([]);
  const [monthEventsList, setMonthEventsList] = useState<any[]>([]);

  const [regYear, setRegYear] = useState(new Date().getFullYear());
  const [regMonth, setRegMonth] = useState(new Date().getMonth() + 1);
  const [regDates, setRegDates] = useState<string[]>([]); 
  const [regLocation, setRegLocation] = useState("구체");
  const [regCapacity, setRegCapacity] = useState(50);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editEventId, setEditEventId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState(50);
  const [editCountAttendance, setEditCountAttendance] = useState(true);
  const [editExecs, setEditExecs] = useState<string[]>([]);

  const [isEditAppModalOpen, setIsEditAppModalOpen] = useState(false);
  const [editAppTarget, setEditAppTarget] = useState<any>(null);

  // 🔥 행사 등록 상태 
  const [spEventTitle, setSpEventTitle] = useState("");
  const [spEventStartDate, setSpEventStartDate] = useState(""); 
  const [spEventEndDate, setSpEventEndDate] = useState("");     
  const [spEventLocation, setSpEventLocation] = useState("");
  const [spEventCapacity, setSpEventCapacity] = useState(50);
  const [spEventAfterparty, setSpEventAfterparty] = useState(false);
  const [spEventAllowRegistration, setSpEventAllowRegistration] = useState(true);
  const [spEventRegistrationStart, setSpEventRegistrationStart] = useState(""); // 🔥 신청 시작 시간 추가

  const executives = members
    .filter(m => ['회장', '부회장', '임원진'].includes(m.user_type))
    .sort((a, b) => {
      const roleOrder: Record<string, number> = { '회장': 1, '부회장': 2, '임원진': 3 };
      return (roleOrder[a.user_type] || 4) - (roleOrder[b.user_type] || 4);
    });

  useEffect(() => {
    fetchEvents();
    fetchMembers();
  }, []);

  useEffect(() => {
    if (adminTab === "monthly") calculateRanking();
  }, [adminTab, currentMonth, currentYear, members]);

  useEffect(() => {
    if (adminTab === "register") {
      const daysInMonth = new Date(regYear, regMonth, 0).getDate();
      const defaultDates: string[] = [];
      for (let i = 1; i <= daysInMonth; i++) {
        const date = new Date(regYear, regMonth - 1, i);
        const dayOfWeek = date.getDay(); 
        if (dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 6) {
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, '0');
          const dd = String(date.getDate()).padStart(2, '0');
          defaultDates.push(`${yyyy}-${mm}-${dd}`);
        }
      }
      setRegDates(defaultDates);
    }
  }, [regYear, regMonth, adminTab]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*").order("start_at", { ascending: false });
    if (data) {
      const formattedEvents = data.map(ev => ({ 
        ...ev, 
        start: ev.start_at, 
        end: ev.end_at, 
        id: ev.id,
        color: ev.type === 'normal' ? '#3b82f6' : ev.type === 'lesson' ? '#8b5cf6' : '#ec4899'
      }));
      setEvents(formattedEvents);
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("name", { ascending: true });
    if (data) setMembers(data);
  };

  const fetchApplicants = async (eventId: string) => {
    const { data } = await supabase.from("applications").select("*").eq("event_id", eventId).order("applied_at", { ascending: true });
    if (data) {
      const currentEventCapacity = events.find(e => e.id === eventId)?.max_capacity || 50;

      let currentSpot = 0;
      const processedApps = data.map(app => {
        if (app.user_type !== 'ob') {
          currentSpot++; 
        }
        return { 
          ...app, 
          waitlisted: currentSpot > currentEventCapacity,
          queueNumber: currentSpot 
        };
      });

      setApplicants(processedApps);
    }
  };

  const handleEventClickForEdit = (info: any) => {
    const ev = info.event;
    setEditEventId(ev.id); 
    setEditTitle(ev.title); 
    setEditLocation(ev.extendedProps.location || "");
    setEditCapacity(ev.extendedProps.max_capacity || 50); 
    setEditCountAttendance(ev.extendedProps.is_attendance_counted ?? true);
    setEditExecs(ev.extendedProps.participating_execs || []);
    setIsEditModalOpen(true);
  };

  const handleUpdateEvent = async () => {
    const { error } = await supabase.from("events").update({ 
      title: editTitle, 
      location: editLocation, 
      max_capacity: editCapacity, 
      is_attendance_counted: editCountAttendance,
      participating_execs: editExecs 
    }).eq("id", editEventId);
    
    if (error) alert("수정 중 오류가 발생했습니다: " + error.message);
    else { alert("일정 정보가 성공적으로 수정되었습니다! ✅"); setIsEditModalOpen(false); fetchEvents(); }
  };

  const handleDeleteEvent = async () => {
    if (!confirm("정말 이 일정을 삭제하시겠습니까?\n(신청자 명단도 함께 모두 삭제됩니다!)")) return;
    await supabase.from("applications").delete().eq("event_id", editEventId);
    const { error } = await supabase.from("events").delete().eq("id", editEventId);
    if (!error) { alert("일정이 삭제되었습니다. 🗑️"); setIsEditModalOpen(false); fetchEvents(); }
  };

  const handleAddMembers = async () => {
    if (!bulkMemberNames.trim()) return alert("이름을 입력해주세요.");
    const namesArray = bulkMemberNames.split("\n").map(name => name.trim()).filter(name => name !== "");
    if (namesArray.length === 0) return alert("유효한 이름이 없습니다.");
    const payload = namesArray.map(name => ({ name: name, user_type: newMemberType }));
    const { error } = await supabase.from("members").insert(payload);
    if (error) alert("오류: " + error.message);
    else { setBulkMemberNames(""); fetchMembers(); alert(`${namesArray.length}명 추가 완료!`); }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm("정말 이 부원을 삭제하시겠습니까?")) return;
    await supabase.from("members").delete().eq("id", id);
    fetchMembers();
  };

  const handleAddExecutive = async () => {
    if (!newExecName.trim()) return alert("임명할 부원의 이름을 입력해주세요.");
    const searchName = newExecName.replace(/\s/g, '').toLowerCase();
    const matchedMember = members.find(m => m.name.replace(/\s/g, '').toLowerCase() === searchName);
    if (!matchedMember) return alert("입력하신 이름이 전체 명단에 없습니다.");
    if (['회장', '부회장', '임원진'].includes(matchedMember.user_type)) return alert(`이미 [${matchedMember.user_type}] 직책을 가지고 있는 부원입니다!`);

    const { error } = await supabase.from("members").update({ user_type: newExecRole }).eq("id", matchedMember.id);
    if (error) alert("오류: " + error.message);
    else { setNewExecName(""); setNewExecRole("임원진"); fetchMembers(); alert(`${matchedMember.name} 님이 ${newExecRole}(으)로 임명되었습니다! 🎉`); }
  };

  const handleDeleteExecutive = async (id: string, name: string) => {
    if (!confirm(`${name} 님을 임원진에서 해임하고 일반 부원으로 되돌리시겠습니까?`)) return;
    const { error } = await supabase.from("members").update({ user_type: 'member' }).eq("id", id);
    if (error) alert("오류: " + error.message);
    else fetchMembers();
  };

  const updateAttendanceStatus = async (appId: string, status: string) => {
    const { error } = await supabase.from("applications").update({ attendance_status: status }).eq("id", appId);
    if (!error && selectedEventId) fetchApplicants(selectedEventId);
    else if (error) alert("상태 업데이트 오류: " + error.message);
  };

  const togglePaymentStatus = async (appId: string, currentStatus: boolean) => {
    const { error } = await supabase.from("applications").update({ is_paid: !currentStatus }).eq("id", appId);
    if (!error && selectedEventId) fetchApplicants(selectedEventId);
    else if (error) alert("결제 상태 업데이트 오류: " + error.message);
  };

  const handleSaveAppEdit = async () => {
    const { error } = await supabase.from("applications").update({
      participation_type: editAppTarget.participation_type,
      lesson_choice: editAppTarget.lesson_choice,
      afterparty_join: editAppTarget.afterparty_join
    }).eq("id", editAppTarget.id);

    if (error) alert("수정 오류: " + error.message);
    else {
      setIsEditAppModalOpen(false);
      if (selectedEventId) fetchApplicants(selectedEventId);
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("이 신청 내역을 삭제하시겠습니까?")) return;
    await supabase.from("applications").delete().eq("id", appId);
    if (selectedEventId) fetchApplicants(selectedEventId);
  };

  const calculateRanking = async () => {
    if (members.length === 0) return;
    
    const activeMembers = members.filter(m => m.user_type !== 'ob');

    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();
    const { data: monthEvents } = await supabase.from("events").select("id, start_at, title, type, is_attendance_counted").gte("start_at", startDate).lt("start_at", endDate).order("start_at", { ascending: true });
    const eventsList = (monthEvents || []).filter(e => e.is_attendance_counted !== false);
    setMonthEventsList(eventsList);
    const eventIds = eventsList.map(e => e.id);
    
    if (eventIds.length === 0) { setMonthlyRanking(activeMembers.map(m => ({ ...m, count: 0, attendanceRecord: {} }))); return; }
    const { data: apps } = await supabase.from("applications").select("user_name, event_id, attendance_status").in("event_id", eventIds);
    
    const ranking = activeMembers.map(m => {
      const memberApps = apps?.filter(a => a.user_name === m.name) || [];
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
  };

  const toggleRegDate = (dateStr: string) => {
    setRegDates(prev => prev.includes(dateStr) ? prev.filter(d => d !== dateStr) : [...prev, dateStr]);
  };

  const handleBulkRegister = async () => {
    if (regDates.length === 0) return alert("선택된 날짜가 없습니다.");
    if (!confirm(`총 ${regDates.length}개의 정기운동을 등록하시겠습니까?\n(기본 시간: 19:00 ~ 22:00)`)) return;
    
    const payload = regDates.map(dateStr => {
      const startAt = new Date(`${dateStr}T19:00:00+09:00`).toISOString();
      const endAt = new Date(`${dateStr}T22:00:00+09:00`).toISOString();

      return { 
        title: "정기운동", type: "normal", 
        start_at: startAt, end_at: endAt, 
        location: regLocation, max_capacity: regCapacity, 
        participating_execs: [], allow_registration: true, color: '#3b82f6'
      }; 
    });
    
    const { error } = await supabase.from("events").insert(payload);
    if (error) alert("등록 중 오류가 발생했습니다: " + error.message);
    else { alert(`${regDates.length}개 등록 완료!`); fetchEvents(); setAdminTab("calendar"); } 
  };

  // 🔥 행사 등록 로직 (신청 시작 시간 포함)
  const handleRegisterSpecialEvent = async () => {
    if (!spEventTitle.trim()) return alert("행사 제목을 입력해주세요.");
    if (!spEventStartDate || !spEventEndDate) return alert("행사의 시작 시간과 종료 시간을 모두 설정해주세요.");
    if (spEventAllowRegistration && !spEventRegistrationStart) return alert("참가 신청을 언제부터 받을지(신청 시작 시간) 설정해주세요.");
    
    if (!confirm(`'${spEventTitle}' 행사를 등록하시겠습니까?`)) return;

    const startAt = new Date(spEventStartDate).toISOString();
    const endAt = new Date(spEventEndDate).toISOString();
    const regStartAt = (spEventAllowRegistration && spEventRegistrationStart) ? new Date(spEventRegistrationStart).toISOString() : null;
    
    const payload = { 
      title: spEventTitle, 
      type: "special", 
      start_at: startAt, 
      end_at: endAt,
      location: spEventLocation || "장소 미정", 
      max_capacity: spEventAllowRegistration ? spEventCapacity : 0, 
      has_afterparty: spEventAllowRegistration ? spEventAfterparty : false,
      is_attendance_counted: false, 
      participating_execs: [],
      allow_registration: spEventAllowRegistration,
      registration_start_at: regStartAt, // 🔥 신청 오픈 시간 DB 저장
      color: '#ec4899' // 🔥 핑크색 무조건 고정
    };
    
    const { error } = await supabase.from("events").insert([payload]);
    
    if (error) alert("행사 등록 중 오류가 발생했습니다: " + error.message);
    else { 
      alert(`행사 등록 완료! 🎉`); 
      setSpEventTitle("");
      setSpEventStartDate("");
      setSpEventEndDate("");
      setSpEventRegistrationStart("");
      setSpEventLocation("");
      setSpEventCapacity(50);
      setSpEventAfterparty(false);
      setSpEventAllowRegistration(true);
      fetchEvents(); 
      setAdminTab("calendar"); 
    } 
  };

  const getCalendarCells = () => {
    const firstDayOfWeek = new Date(regYear, regMonth - 1, 1).getDay(); 
    const daysInMonth = new Date(regYear, regMonth, 0).getDate();
    return [...Array.from({ length: firstDayOfWeek }, () => null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  };

  const getRoleBadge = (role: string) => {
    if (role === '회장') return <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-black shadow-sm">회장</span>;
    if (role === '부회장') return <span className="text-[10px] bg-sky-100 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded font-black">부회장</span>;
    if (role === '임원진') return <span className="text-[10px] bg-slate-500 text-white px-1.5 py-0.5 rounded font-black shadow-sm">임원진</span>;
    if (role === 'ob') return <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded font-bold uppercase">OB</span>;
    return <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">부원</span>;
  };

  const currentSelectedEventObj = events.find(e => e.id === selectedEventId);

  const attendanceDisplayList = applicants.filter(app => app.user_type !== 'ob' && app.user_type !== 'guest');
  const guestFeeList = applicants.filter(app => app.user_type === 'guest');
  const absenceFeeList = applicants.filter(app => app.attendance_status === 'absent' && app.user_type !== 'guest');

  return (
    <div className="min-h-screen bg-slate-50 p-2 md:p-8">
      <style dangerouslySetInnerHTML={{__html: `
        .fc .fc-toolbar-title { font-size: 1.1rem !important; font-weight: 900; }
        .fc .fc-button { padding: 0.3em 0.6em; font-size: 0.8rem; }
        @media (max-width: 768px) {
          .fc .fc-event { padding: 1px; margin-bottom: 1px !important; }
          .fc .fc-event-title { font-size: 0.6rem !important; font-weight: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .fc .fc-daygrid-day-number { font-size: 0.7rem !important; padding: 2px; }
          .fc .fc-daygrid-event-harness { margin-top: 1px !important; }
        }
      `}} />

      <div className="max-w-[1400px] mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[85vh] flex flex-col relative">
        <div className="bg-slate-900 text-white">
          <div className="p-4 md:p-6 pb-4 flex justify-between items-center">
            <div>
              <h1 className="text-xl md:text-2xl font-black tracking-tight">👑 스누민턴 운영진</h1>
              <p className="text-slate-300 text-xs md:text-sm mt-1">동아리 일정 및 출석 관리</p>
            </div>
            <button onClick={() => router.push('/')} className="px-3 py-2 md:px-5 md:py-2.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-xl text-xs md:text-sm font-bold transition-colors flex items-center gap-2 border border-slate-700">
              🏠 <span className="hidden md:inline">메인 홈으로</span>
            </button>
          </div>
          
          <div className="flex px-4 md:px-6 gap-4 md:gap-6 text-xs md:text-sm font-bold border-t border-slate-700 overflow-x-auto custom-scrollbar">
            <button onClick={() => setAdminTab("daily")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "daily" ? "border-blue-400 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>📝 현장 출석 체크</button>
            <button onClick={() => setAdminTab("fees")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "fees" ? "border-indigo-400 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>💰 결제/회비 확인</button>
            <button onClick={() => setAdminTab("calendar")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "calendar" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>📅 일정 관리</button>
            <button onClick={() => setAdminTab("monthly")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "monthly" ? "border-blue-400 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>📊 월별 출석부</button>
            <button onClick={() => setAdminTab("members")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "members" ? "border-emerald-400 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>👥 부원 명단</button>
            <button onClick={() => setAdminTab("executives")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "executives" ? "border-rose-400 text-rose-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>👑 임원진 관리</button>
            <button onClick={() => setAdminTab("register")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "register" ? "border-purple-400 text-purple-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>🚀 정기운동 등록</button>
            <button onClick={() => setAdminTab("special")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "special" ? "border-pink-400 text-pink-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>🎈 행사 등록</button>
          </div>
        </div>

        <div className="flex flex-1 flex-col md:flex-row min-h-0 bg-slate-50">
          
          {adminTab === "daily" && (
            <>
              <div className="w-full md:w-[55%] border-b md:border-b-0 md:border-r border-slate-200 p-3 md:p-6 overflow-y-auto bg-white custom-scrollbar">
                <div className="mb-2 md:mb-4"><h2 className="font-bold text-slate-800 text-sm md:text-base">출석 체크용 캘린더</h2></div>
                <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={events} height="auto" locale="ko" displayEventTime={false} headerToolbar={{ left: 'title', center: '', right: 'prev,next' }} eventClick={(info) => { setSelectedEventId(info.event.id); setSelectedEventTitle(info.event.title); setSelectedEventDate(info.event.start); fetchApplicants(info.event.id); }} />
              </div>
              <div className="w-full md:w-[45%] p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {!selectedEventId ? (
                  <div className="h-40 md:h-full flex flex-col items-center justify-center text-slate-400"><span className="text-3xl md:text-4xl mb-2 md:mb-4">👆</span><p className="font-medium text-sm">달력에서 일정을 선택해주세요.</p></div>
                ) : (
                  <div>
                    <div className="flex justify-between items-end mb-4 md:mb-6">
                      <div>
                        <span className="text-[10px] md:text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded mb-1 md:mb-2 inline-block">{selectedEventDate && new Date(selectedEventDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                        <h2 className="text-lg md:text-xl font-black text-slate-900">{selectedEventTitle} 출석부</h2>
                      </div>
                      <span className="text-xs md:text-sm font-bold text-slate-600 bg-white border border-slate-200 px-2 md:px-3 py-1.5 rounded-xl shadow-sm">출석관리 {attendanceDisplayList.length}명</span>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {attendanceDisplayList.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">출석 체크할 부원이 없습니다.</div> : attendanceDisplayList.map((app, i) => {
                          const status = app.attendance_status || 'none';
                          
                          let partialText = "";
                          if (app.participation_type === 'partial_7_9') partialText = "부분참 (19-21)";
                          if (app.participation_type === 'partial_8_10') partialText = "부분참 (20-22)";

                          if (app.waitlisted) {
                            return (
                              <div key={app.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 md:p-3.5 bg-slate-50 opacity-60">
                                <div className="flex items-center gap-2 md:gap-3 min-w-0 w-full md:w-auto">
                                  <span className="text-[10px] md:text-xs font-black text-slate-400 w-4 md:w-5">-</span>
                                  <span className="font-bold text-slate-500 text-xs md:text-sm truncate line-through">{app.user_name}</span>
                                  <span className="text-[8px] md:text-[10px] bg-slate-200 text-slate-400 px-1 md:px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">{app.user_type}</span>
                                  {partialText && <span className="text-[8px] md:text-[10px] bg-slate-200 text-slate-400 border border-slate-300 px-1 md:px-1.5 py-0.5 rounded font-bold flex-shrink-0">{partialText}</span>}
                                  <span className="text-[10px] font-bold text-slate-400 ml-1">(정원 초과)</span>
                                </div>
                                <div className="flex gap-1 md:gap-1.5 mt-2 md:mt-0 w-full md:w-auto justify-end">
                                  <button onClick={() => { setEditAppTarget(app); setIsEditAppModalOpen(true); }} className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-lg transition-colors text-xs md:text-sm flex-shrink-0" title="신청 정보 수정">✏️</button>
                                  <button onClick={() => handleDeleteApplication(app.id)} className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-xs md:text-sm flex-shrink-0" title="신청 삭제">✕</button>
                                </div>
                              </div>
                            );
                          }
                          
                          const presentClass = status === 'present' ? 'bg-emerald-100 text-emerald-700 border-emerald-300 shadow-inner z-10 font-black' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50';
                          const lateClass = status === 'late' ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-inner z-10 font-black' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50';
                          const absentClass = status === 'absent' ? 'bg-red-100 text-red-700 border-red-300 shadow-inner z-10 font-black' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50';
                          const noneClass = status === 'none' ? 'bg-slate-200 text-slate-700 border-slate-300 shadow-inner z-10 font-black' : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50';

                          return (
                            <div key={app.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 md:p-3.5 hover:bg-slate-50 transition-colors gap-2 md:gap-0">
                              <div className="flex items-center gap-2 md:gap-3 min-w-0 w-full md:w-auto">
                                <span className="text-[10px] md:text-xs font-black text-slate-400 w-4 md:w-5">{app.queueNumber}</span>
                                <span className="font-bold text-slate-800 text-xs md:text-sm truncate">{app.user_name}</span>
                                <span className="text-[8px] md:text-[10px] bg-slate-100 text-slate-500 px-1 md:px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">{app.user_type}</span>
                                {partialText && <span className="text-[8px] md:text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1 md:px-1.5 py-0.5 rounded font-bold flex-shrink-0">{partialText}</span>}
                              </div>
                              
                              <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto justify-end">
                                <div className="flex rounded-lg overflow-hidden shadow-sm border border-slate-200">
                                  <button onClick={() => updateAttendanceStatus(app.id, 'present')} className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold transition-all border-r ${presentClass}`}>출석</button>
                                  <button onClick={() => updateAttendanceStatus(app.id, 'late')} className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold transition-all border-r ${lateClass}`}>지각</button>
                                  <button onClick={() => updateAttendanceStatus(app.id, 'absent')} className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold transition-all border-r ${absentClass}`}>불참</button>
                                  <button onClick={() => updateAttendanceStatus(app.id, 'none')} className={`px-2 md:px-3 py-1.5 text-[10px] md:text-xs font-bold transition-all ${noneClass}`}>대기</button>
                                </div>
                                <button onClick={() => { setEditAppTarget(app); setIsEditAppModalOpen(true); }} className="p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-500 rounded-lg transition-colors text-xs md:text-sm flex-shrink-0 ml-1" title="신청 정보 수정">✏️</button>
                                <button onClick={() => handleDeleteApplication(app.id)} className="p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors text-xs md:text-sm flex-shrink-0" title="신청 삭제">✕</button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {adminTab === "fees" && (
            <>
              <div className="w-full md:w-[55%] border-b md:border-b-0 md:border-r border-slate-200 p-3 md:p-6 overflow-y-auto bg-white custom-scrollbar">
                <div className="mb-2 md:mb-4"><h2 className="font-bold text-slate-800 text-sm md:text-base">결제 확인용 캘린더</h2></div>
                <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={events} height="auto" locale="ko" displayEventTime={false} headerToolbar={{ left: 'title', center: '', right: 'prev,next' }} eventClick={(info) => { setSelectedEventId(info.event.id); setSelectedEventTitle(info.event.title); setSelectedEventDate(info.event.start); fetchApplicants(info.event.id); }} />
              </div>
              <div className="w-full md:w-[45%] p-4 md:p-6 overflow-y-auto custom-scrollbar bg-slate-50/50">
                {!selectedEventId ? (
                  <div className="h-40 md:h-full flex flex-col items-center justify-center text-slate-400"><span className="text-3xl md:text-4xl mb-2 md:mb-4">👆</span><p className="font-medium text-sm">달력에서 일정을 선택해주세요.</p></div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-end mb-4 border-b border-slate-200 pb-4">
                      <div>
                        <span className="text-[10px] md:text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded mb-1 md:mb-2 inline-block">{selectedEventDate && new Date(selectedEventDate).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                        <h2 className="text-lg md:text-xl font-black text-slate-900">{selectedEventTitle} 결제 확인</h2>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                        <span className="text-lg">💸</span> <span>게스트비 확인</span>
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">{guestFeeList.length}명</span>
                      </h3>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {guestFeeList.length === 0 ? <div className="p-4 text-center text-slate-400 text-xs">게스트 신청자가 없습니다.</div> : guestFeeList.map(app => (
                          <div key={app.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{app.user_name}</span>
                              <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">게스트</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                              <span className={`text-xs font-bold ${app.is_paid ? 'text-indigo-600' : 'text-slate-400'}`}>{app.is_paid ? '입금 완료' : '미납'}</span>
                              <input type="checkbox" checked={app.is_paid || false} onChange={() => togglePaymentStatus(app.id, app.is_paid)} className="w-4 h-4 accent-indigo-500 rounded" />
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="font-black text-slate-800 mb-3 flex items-center gap-2 mt-8">
                        <span className="text-lg">❌</span> <span>불참비 확인</span>
                        <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full">{absenceFeeList.length}명</span>
                      </h3>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        {absenceFeeList.length === 0 ? <div className="p-4 text-center text-slate-400 text-xs">불참비 대상자가 없습니다.</div> : absenceFeeList.map(app => (
                          <div key={app.id} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-800 text-sm">{app.user_name}</span>
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold">{app.user_type}</span>
                            </div>
                            <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                              <span className={`text-xs font-bold ${app.is_paid ? 'text-indigo-600' : 'text-slate-400'}`}>{app.is_paid ? '입금 완료' : '미납'}</span>
                              <input type="checkbox" checked={app.is_paid || false} onChange={() => togglePaymentStatus(app.id, app.is_paid)} className="w-4 h-4 accent-indigo-500 rounded" />
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-400 mt-3 text-center">※ '📝 현장 출석 체크' 탭에서 불참(❌)으로 체크된 부원만 이곳에 표시됩니다.</p>
                    </div>

                  </div>
                )}
              </div>
            </>
          )}

          {adminTab === "calendar" && (
            <div className="w-full p-2 md:p-8 overflow-y-auto">
              <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 w-full max-w-5xl mx-auto">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-black text-slate-800">전체 일정 관리</h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-1">달력에서 일정을 클릭하여 수정/삭제하세요.</p>
                  </div>
                </div>
                <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" events={events} height="auto" locale="ko" displayEventTime={false} headerToolbar={{ left: 'title', center: '', right: 'prev,next' }} eventClick={handleEventClickForEdit} />
              </div>
            </div>
          )}

          {adminTab === "monthly" && (
            <div className="w-full p-3 md:p-8 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div className="max-w-full mx-auto">
                <div className="flex items-center justify-between mb-4 md:mb-6 bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-100">
                  <button onClick={() => setCurrentMonth(prev => prev === 1 ? 12 : prev - 1)} className="p-1 md:p-2 hover:bg-slate-100 rounded-lg font-bold text-sm md:text-base">◀</button>
                  <div className="text-center"><h2 className="text-lg md:text-2xl font-black text-slate-800">{currentYear}년 {currentMonth}월 상세 출석부</h2></div>
                  <button onClick={() => setCurrentMonth(prev => prev === 12 ? 1 : prev + 1)} className="p-1 md:p-2 hover:bg-slate-100 rounded-lg font-bold text-sm md:text-base">▶</button>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-x-auto custom-scrollbar">
                  <table className="w-full text-xs md:text-sm text-center min-w-max border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-500 font-bold border-b border-slate-200">
                        <th className="p-2 md:p-3 sticky left-0 bg-slate-100 z-10 w-8 md:w-16 border-r border-slate-200">순위</th><th className="p-2 md:p-3 sticky left-8 md:left-16 bg-slate-100 z-10 w-16 md:w-24 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-200">이름</th><th className="p-2 md:p-3 w-12 md:w-20 text-blue-600 border-r border-slate-200">총 횟수</th>
                        {monthEventsList.map(ev => (
                          <th key={ev.id} className="p-1.5 md:p-2 min-w-[36px] md:min-w-[50px] border-r border-slate-100 bg-white">
                            <div className="flex flex-col items-center"><span className="text-[8px] md:text-[10px] text-slate-400 font-medium">{ev.type === 'normal' ? '정규' : ev.type === 'lesson' ? '레슨' : '행사'}</span><span className="text-slate-800 font-black">{new Date(ev.start_at).getDate()}일</span></div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyRanking.map((stat, idx) => (
                        <tr key={stat.id} className="hover:bg-slate-50 transition-colors bg-white">
                          <td className="p-2 md:p-3 text-slate-400 font-bold sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-50">{idx + 1}</td><td className="p-2 md:p-3 text-left font-bold text-slate-800 sticky left-8 md:left-16 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50 truncate max-w-[4rem] md:max-w-none">{stat.name}</td><td className="p-2 md:p-3 font-black text-blue-600 bg-blue-50/30 border-r border-slate-50">{stat.count}</td>
                          {monthEventsList.map(ev => {
                            const status = stat.attendanceRecord[ev.id];
                            return <td key={ev.id} className="p-1.5 md:p-3 border-r border-slate-50 text-sm md:text-base">{status === 'present' ? "🟢" : status === 'late' ? "🔺" : status === 'absent' ? <span className="text-red-400 font-bold text-[10px] md:text-xs">❌</span> : <span className="text-slate-200 font-light text-[10px] md:text-xs">-</span>}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {monthlyRanking.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">등록된 부원 명단이 없습니다.</div>}
                </div>
              </div>
            </div>
          )}

          {adminTab === "members" && (
            <div className="w-full p-4 md:p-10 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col gap-3">
                  <h3 className="font-black text-slate-800 text-base md:text-lg">새 부원 일괄 추가</h3>
                  <textarea value={bulkMemberNames} onChange={(e) => setBulkMemberNames(e.target.value)} placeholder="엑셀 복붙..." className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl outline-none text-sm" />
                  <div className="flex gap-2 justify-end items-center mt-2">
                    <select value={newMemberType} onChange={(e) => setNewMemberType(e.target.value)} className="px-3 py-2 border rounded-xl text-sm font-bold"><option value="member">부원</option><option value="ob">OB</option></select>
                    <button onClick={handleAddMembers} className="px-4 py-2 bg-emerald-500 text-white font-black rounded-xl hover:bg-emerald-600 text-sm">등록</button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 bg-slate-100 font-bold text-slate-600 text-sm flex justify-between"><span>전체 명단 ({members.length}명)</span><span className="text-xs text-slate-400 font-normal">※ 임원진 뱃지가 함께 표시됩니다.</span></div>
                  <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {members.map(m => (
                      <div key={m.id} className="flex justify-between items-center p-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3"><span className="font-bold text-sm text-slate-800">{m.name}</span>{getRoleBadge(m.user_type)}</div>
                        <button onClick={() => handleDeleteMember(m.id)} className="text-xs text-red-400 hover:text-red-600 px-2 py-1 transition-colors">삭제</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === "executives" && (
            <div className="w-full p-4 md:p-10 overflow-y-auto bg-slate-50 custom-scrollbar">
              <div className="max-w-3xl mx-auto">
                <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-col gap-3">
                  <h3 className="font-black text-slate-800 text-base md:text-lg">새 임원진 임명</h3>
                  <p className="text-xs text-slate-500">전체 부원 명단에 있는 사람만 임원진으로 임명할 수 있습니다.</p>
                  <div className="flex flex-col md:flex-row gap-3 mt-1">
                    <input type="text" value={newExecName} onChange={(e) => setNewExecName(e.target.value)} placeholder="부원 이름 검색 (예: 홍길동)" className="flex-1 px-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-rose-400 text-sm font-bold bg-white" onKeyDown={e => e.key === 'Enter' && handleAddExecutive()} />
                    <div className="flex gap-2">
                      <select value={newExecRole} onChange={(e) => setNewExecRole(e.target.value)} className="w-full md:w-auto px-4 py-3 border-2 border-slate-100 focus:border-rose-400 rounded-xl text-sm font-bold outline-none bg-white">
                        <option value="회장">회장</option><option value="부회장">부회장</option><option value="임원진">일반 임원진</option>
                      </select>
                      <button onClick={handleAddExecutive} className="w-full md:w-24 px-4 py-3 bg-rose-500 text-white font-black rounded-xl hover:bg-rose-600 text-sm shadow-sm transition-colors whitespace-nowrap">임명하기</button>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  <div className="p-4 bg-slate-100 font-bold text-slate-600 text-sm flex justify-between items-center"><span>현재 학기 임원진 명단</span><span className="text-xs text-slate-400 font-medium">총 {executives.length}명</span></div>
                  <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto custom-scrollbar">
                    {executives.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">임명된 임원진이 없습니다.</div> : executives.map((exec) => (
                        <div key={exec.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3"><span className="font-bold text-slate-800 text-base">{exec.name}</span>{getRoleBadge(exec.user_type)}</div>
                          <button onClick={() => handleDeleteExecutive(exec.id, exec.name)} className="text-xs text-slate-400 hover:text-red-500 px-3 py-1.5 hover:bg-red-50 rounded-lg transition-colors font-bold border border-slate-200 hover:border-red-200 bg-white">해임</button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {adminTab === "register" && (
            <div className="w-full p-4 md:p-8 overflow-y-auto bg-slate-50 flex flex-col md:flex-row gap-6 md:gap-8">
              <div className="flex-1 bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4 md:mb-8">
                  <button onClick={() => setRegMonth(prev => prev === 1 ? 12 : prev - 1)} className="p-2 hover:bg-slate-100 rounded-lg font-bold">◀</button>
                  <h2 className="text-lg md:text-2xl font-black text-slate-800 tracking-tight">{regYear}년 {regMonth}월 등록</h2>
                  <button onClick={() => setRegMonth(prev => prev === 12 ? 1 : prev + 1)} className="p-2 hover:bg-slate-100 rounded-lg font-bold">▶</button>
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2 text-center mb-2">
                  <div className="font-bold text-red-400 text-xs md:text-sm">일</div><div className="font-bold text-slate-400 text-xs md:text-sm">월</div><div className="font-bold text-blue-600 text-xs md:text-sm">화</div><div className="font-bold text-slate-400 text-xs md:text-sm">수</div><div className="font-bold text-blue-600 text-xs md:text-sm">목</div><div className="font-bold text-slate-400 text-xs md:text-sm">금</div><div className="font-bold text-blue-600 text-xs md:text-sm">토</div>
                </div>
                <div className="grid grid-cols-7 gap-1 md:gap-2">
                  {getCalendarCells().map((day, idx) => {
                    if (!day) return <div key={`blank-${idx}`} className="p-2 md:p-4"></div>;
                    const dateStr = `${regYear}-${String(regMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isSelected = regDates.includes(dateStr);
                    return (
                      <button key={dateStr} onClick={() => toggleRegDate(dateStr)} className={`aspect-square flex flex-col items-center justify-center rounded-xl md:rounded-2xl text-base md:text-lg font-bold transition-all border-2 ${isSelected ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm' : 'bg-white border-slate-100 text-slate-600 hover:border-purple-200'}`}>
                        {day}
                        {isSelected && <span className="hidden md:inline-block text-[10px] mt-1 bg-purple-500 text-white px-2 py-0.5 rounded-full">등록</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="w-full md:w-80 flex flex-col gap-4 md:gap-6">
                <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200">
                  <h3 className="font-black text-base md:text-lg text-slate-800 mb-4 md:mb-6">⚙️ 공통 설정</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">📍 장소</label>
                      <input type="text" value={regLocation} onChange={(e) => setRegLocation(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 font-bold text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5">👥 정원 (명)</label>
                      <input type="number" value={regCapacity} onChange={(e) => setRegCapacity(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-purple-400 font-bold text-sm" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-900 p-5 md:p-6 rounded-3xl shadow-xl text-white flex flex-col justify-center items-center text-center">
                  <span className="text-slate-400 text-xs md:text-sm font-bold mb-1 md:mb-2">선택된 날짜</span>
                  <div className="text-3xl md:text-4xl font-black mb-4 md:mb-6 text-purple-400">{regDates.length}일</div>
                  <button onClick={handleBulkRegister} disabled={regDates.length === 0} className="w-full py-3.5 md:py-4 bg-purple-500 text-white font-black rounded-xl hover:bg-purple-600 transition-colors disabled:opacity-50 shadow-lg shadow-purple-500/30 text-sm md:text-base">일괄 등록하기 🚀</button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================= */}
          {/* 🎈 행사 등록 탭 (롤백 + 신청 시간 추가) */}
          {/* ======================================= */}
          {adminTab === "special" && (
            <div className="w-full p-4 md:p-8 overflow-y-auto bg-slate-50 flex justify-center items-start">
              <div className="w-full max-w-2xl bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200">
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight mb-8 flex items-center gap-2">
                  <span className="text-2xl">🎈</span> 행사 등록
                </h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">📝 행사 제목</label>
                    <input type="text" value={spEventTitle} onChange={(e) => setSpEventTitle(e.target.value)} placeholder="예: 2026 1학기 개강총회" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">⏰ 시작 날짜 및 시간</label>
                      <input type="datetime-local" value={spEventStartDate} onChange={(e) => setSpEventStartDate(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">⏰ 종료 날짜 및 시간</label>
                      <input type="datetime-local" value={spEventEndDate} onChange={(e) => setSpEventEndDate(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2">📍 장소 (선택)</label>
                    <input type="text" value={spEventLocation} onChange={(e) => setSpEventLocation(e.target.value)} placeholder="예: 서울대학교 체육관" className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                  </div>

                  {/* 🔥 참가 신청 받기 토글 */}
                  <div className="flex items-center justify-between p-5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer mt-4 hover:border-pink-300 transition-colors" onClick={() => setSpEventAllowRegistration(!spEventAllowRegistration)}>
                    <div>
                      <div className="font-bold text-sm text-slate-800">✅ 참가 신청 받기</div>
                      <div className="text-[11px] text-slate-500 mt-1">해제 시 신청을 받지 않고 달력에 단순 공지로만 띄웁니다.</div>
                    </div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${spEventAllowRegistration ? 'bg-pink-500' : 'bg-slate-300'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${spEventAllowRegistration ? 'left-7' : 'left-1'}`} />
                    </div>
                  </div>

                  {/* 참가 신청을 받을 때만 정원, 뒤풀이 옵션, 신청 시작 시간 설정창을 보여줌 */}
                  {spEventAllowRegistration && (
                    <div className="space-y-6 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">⏰ 참가 신청 시작 시간</label>
                        <input type="datetime-local" value={spEventRegistrationStart} onChange={(e) => setSpEventRegistrationStart(e.target.value)} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                        <p className="text-[10px] text-slate-400 mt-1">설정한 시간 전에는 부원들이 신청 버튼을 누를 수 없습니다.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-2">👥 정원 (명)</label>
                          <input type="number" value={spEventCapacity} onChange={(e) => setSpEventCapacity(Number(e.target.value))} className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-pink-400 font-bold text-sm transition-colors" />
                        </div>
                        
                        <div className="flex flex-col justify-end">
                          <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer hover:border-pink-300 transition-colors h-[50px]" onClick={() => setSpEventAfterparty(!spEventAfterparty)}>
                            <div className="font-bold text-sm text-slate-800">🍻 뒤풀이 조사 추가</div>
                            <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${spEventAfterparty ? 'bg-pink-500' : 'bg-slate-300'}`}>
                              <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${spEventAfterparty ? 'left-6' : 'left-1'}`} />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={handleRegisterSpecialEvent} className="w-full py-4 bg-pink-500 text-white font-black rounded-xl hover:bg-pink-600 transition-colors shadow-lg shadow-pink-500/30 text-sm md:text-base mt-6">
                    행사 등록하기 🚀
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ========================================= */}
        {/* 달력용 일정 수정 모달 */}
        {/* ========================================= */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[150] p-4" onClick={() => setIsEditModalOpen(false)}>
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 flex flex-col gap-4 md:gap-5 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center border-b border-slate-100 pb-3 md:pb-4">
                <h3 className="font-black text-lg md:text-xl text-slate-800">⚙️ 일정 상세 설정</h3>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">×</button>
              </div>
              
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">일정 제목 (선택)</label><input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">📍 장소 변경</label><input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 text-sm" /></div>
              <div><label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">👥 정원 수정 (명)</label><input type="number" value={editCapacity} onChange={(e) => setEditCapacity(Number(e.target.value))} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-slate-800 text-sm" /></div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">👑 참여 임원진 선택 (신청 정원에 미포함)</label>
                {executives.length === 0 ? (
                  <p className="text-xs text-slate-400 ml-1">등록된 임원진이 없습니다.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {executives.map(exec => {
                      const isSelected = editExecs.includes(exec.name);
                      return (
                        <button
                          key={exec.id}
                          onClick={() => setEditExecs(prev => isSelected ? prev.filter(n => n !== exec.name) : [...prev, exec.name])}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${isSelected ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}
                        >
                          {exec.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer" onClick={() => setEditCountAttendance(!editCountAttendance)}>
                <div><div className="font-bold text-xs md:text-sm text-slate-800">출석부 통계 반영</div><div className="text-[9px] md:text-[10px] text-slate-500 mt-0.5">이 일정을 월별 출석 횟수에 포함합니다.</div></div>
                <div className={`w-10 md:w-12 h-5 md:h-6 rounded-full transition-colors relative ${editCountAttendance ? 'bg-amber-400' : 'bg-slate-300'}`}><div className={`w-3.5 h-3.5 md:w-4 md:h-4 bg-white rounded-full absolute top-[3px] md:top-1 transition-all ${editCountAttendance ? 'left-[22px] md:left-7' : 'left-1'}`} /></div>
              </div>
              <div className="flex gap-2 md:gap-3 mt-2 md:mt-4">
                <button onClick={handleDeleteEvent} className="px-4 py-3 bg-red-50 text-red-500 font-bold text-sm rounded-xl hover:bg-red-100 transition-colors border border-red-100 whitespace-nowrap">🗑️ 삭제</button>
                <button onClick={handleUpdateEvent} className="flex-1 py-3 bg-amber-400 text-amber-900 font-black text-sm rounded-xl hover:bg-amber-500 transition-colors shadow-lg shadow-amber-400/30">수정 저장</button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* 개별 신청 정보 수정 팝업 모달 */}
        {/* ========================================= */}
        {isEditAppModalOpen && editAppTarget && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setIsEditAppModalOpen(false)}>
            <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 flex flex-col gap-4 md:gap-5 animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-black text-lg text-slate-800 border-b border-slate-100 pb-3">
                <span className="text-blue-600">{editAppTarget.user_name}</span> 님의 신청 정보
              </h3>

              {currentSelectedEventObj?.type === 'normal' && (
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">참여 시간 (정참/부분참)</label>
                   <select 
                     value={editAppTarget.participation_type || 'full'} 
                     onChange={e => setEditAppTarget({...editAppTarget, participation_type: e.target.value})} 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-sm"
                   >
                     <option value="full">정참 (19-22)</option>
                     <option value="partial_7_9">부분참 (19-21)</option>
                     <option value="partial_8_10">부분참 (20-22)</option>
                   </select>
                 </div>
              )}

              {currentSelectedEventObj?.type === 'lesson' && (
                 <div>
                   <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-1">레슨 요일 변경</label>
                   <select 
                     value={editAppTarget.lesson_choice || 'tue_thu'} 
                     onChange={e => setEditAppTarget({...editAppTarget, lesson_choice: e.target.value})} 
                     className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-bold text-sm"
                   >
                     <option value="tue_thu">화/목 레슨</option>
                     <option value="sat">토요 레슨</option>
                   </select>
                 </div>
              )}

              {currentSelectedEventObj?.has_afterparty && (
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer mt-2" onClick={() => setEditAppTarget({...editAppTarget, afterparty_join: !editAppTarget.afterparty_join})}>
                    <div className="font-bold text-sm text-slate-800">뒷풀이 참석 여부</div>
                    <div className={`w-12 h-6 rounded-full transition-colors relative ${editAppTarget.afterparty_join ? 'bg-blue-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${editAppTarget.afterparty_join ? 'left-7' : 'left-1'}`} /></div>
                 </div>
              )}

              <div className="flex gap-2 mt-4">
                 <button onClick={() => setIsEditAppModalOpen(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-200 transition-colors">취소</button>
                 <button onClick={handleSaveAppEdit} className="flex-1 py-3.5 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30">수정 완료</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}