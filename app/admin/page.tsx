"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../../supabase"; 

export default function AdminPage() {
  const router = useRouter();
  
  const [adminTab, setAdminTab] = useState<"calendar" | "daily" | "monthly" | "members" | "register" | "executives">("daily"); 
  
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

  // 🔥 직책별 순위(회장 1순위, 부회장 2순위, 임원진 3순위)를 매겨서 정렬합니다.
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
      const formattedEvents = data.map(ev => ({ ...ev, start: ev.start_at, id: ev.id }));
      setEvents(formattedEvents);
    }
  };

  const fetchMembers = async () => {
    const { data } = await supabase.from("members").select("*").order("name", { ascending: true });
    if (data) setMembers(data);
  };

  const fetchApplicants = async (eventId: string) => {
    const { data } = await supabase.from("applications").select("*").eq("event_id", eventId).order("applied_at", { ascending: true });
    if (data) setApplicants(data);
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

  const cycleAttendance = async (appId: string, currentStatus: string) => {
    let nextStatus = 'present';
    if (currentStatus === 'present') nextStatus = 'late';
    if (currentStatus === 'late') nextStatus = 'none';
    const { error } = await supabase.from("applications").update({ attendance_status: nextStatus }).eq("id", appId);
    if (!error && selectedEventId) fetchApplicants(selectedEventId);
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!confirm("이 신청 내역을 삭제하시겠습니까?")) return;
    await supabase.from("applications").delete().eq("id", appId);
    if (selectedEventId) fetchApplicants(selectedEventId);
  };

  const calculateRanking = async () => {
    if (members.length === 0) return;
    const startDate = new Date(currentYear, currentMonth - 1, 1).toISOString();
    const endDate = new Date(currentYear, currentMonth, 1).toISOString();
    const { data: monthEvents } = await supabase.from("events").select("id, start_at, title, type, is_attendance_counted").gte("start_at", startDate).lt("start_at", endDate).order("start_at", { ascending: true });
    const eventsList = (monthEvents || []).filter(e => e.is_attendance_counted !== false);
    setMonthEventsList(eventsList);
    const eventIds = eventsList.map(e => e.id);
    if (eventIds.length === 0) { setMonthlyRanking(members.map(m => ({ ...m, count: 0, attendanceRecord: {} }))); return; }
    const { data: apps } = await supabase.from("applications").select("user_name, event_id, attendance_status").in("event_id", eventIds);
    const ranking = members.map(m => {
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
    if (!confirm(`총 ${regDates.length}개의 정기운동을 등록하시겠습니까?`)) return;
    const payload = regDates.map(dateStr => {
      const startAt = new Date(`${dateStr}T19:00:00+09:00`).toISOString();
      return { title: "정기운동", type: "normal", start_at: startAt, location: regLocation, max_capacity: regCapacity, participating_execs: [] }; 
    });
    const { error } = await supabase.from("events").insert(payload);
    if (error) alert("등록 중 오류가 발생했습니다: " + error.message);
    else { alert(`${regDates.length}개 등록 완료!`); fetchEvents(); setAdminTab("calendar"); } 
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
            <button onClick={() => setAdminTab("calendar")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "calendar" ? "border-amber-400 text-amber-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>📅 일정 수정/삭제</button>
            <button onClick={() => setAdminTab("monthly")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "monthly" ? "border-blue-400 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>📊 월별 상세 출석부</button>
            <button onClick={() => setAdminTab("members")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "members" ? "border-emerald-400 text-emerald-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>👥 부원 명단 관리</button>
            <button onClick={() => setAdminTab("executives")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "executives" ? "border-rose-400 text-rose-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>👑 임원진 관리</button>
            <button onClick={() => setAdminTab("register")} className={`py-4 border-b-2 whitespace-nowrap transition-all ${adminTab === "register" ? "border-purple-400 text-purple-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}>🚀 정기운동 일괄등록</button>
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
                      <span className="text-xs md:text-sm font-bold text-slate-600 bg-white border border-slate-200 px-2 md:px-3 py-1.5 rounded-xl shadow-sm">총 {applicants.length}명</span>
                    </div>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      {applicants.length === 0 ? <div className="p-8 text-center text-slate-400 text-sm">신청자가 없습니다.</div> : applicants.map((app, i) => {
                          const status = app.attendance_status || 'none';
                          let btnClass = "bg-slate-100 text-slate-400 hover:bg-slate-200";
                          let btnText = "출석 대기";
                          if (status === 'present') { btnClass = "bg-emerald-100 text-emerald-700 border-emerald-200 shadow-inner"; btnText = "🟢 출석 완료"; }
                          else if (status === 'late') { btnClass = "bg-amber-100 text-amber-700 border-amber-200 shadow-inner"; btnText = "🔺 지각 처리"; }
                          return (
                            <div key={app.id} className="flex items-center justify-between p-3 md:p-3.5 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                                <span className="text-[10px] md:text-xs font-black text-slate-300 w-3 md:w-4">{i + 1}</span><span className="font-bold text-slate-800 text-xs md:text-sm truncate max-w-[60px] md:max-w-none">{app.user_name}</span>
                                <span className="text-[8px] md:text-[10px] bg-slate-100 text-slate-500 px-1 md:px-1.5 py-0.5 rounded uppercase font-bold flex-shrink-0">{app.user_type}</span>
                                {app.participation_type !== 'full' && <span className="text-[8px] md:text-[10px] bg-amber-50 text-amber-600 border border-amber-200 px-1 md:px-1.5 py-0.5 rounded font-bold flex-shrink-0">부분참</span>}
                              </div>
                              <div className="flex items-center gap-1 md:gap-1.5 flex-shrink-0">
                                <button onClick={() => cycleAttendance(app.id, status)} className={`w-20 md:w-24 py-1.5 md:py-2 text-[10px] md:text-xs font-bold rounded-xl border transition-all active:scale-95 ${btnClass}`}>{btnText}</button>
                                <button onClick={() => handleDeleteApplication(app.id)} className="p-1.5 text-red-300 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors text-xs md:text-sm">✕</button>
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
                            return <td key={ev.id} className="p-1.5 md:p-3 border-r border-slate-50 text-sm md:text-base">{status === 'present' ? "🟢" : status === 'late' ? "🔺" : status === 'none' ? <span className="text-red-300 font-bold text-[10px] md:text-xs">✕</span> : <span className="text-slate-200 font-light text-[10px] md:text-xs">-</span>}</td>;
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
        </div>

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
                    {/* 🔥 체크박스 리스트가 회장->부회장->임원진 순으로 나옵니다 */}
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

      </div>
    </div>
  );
}