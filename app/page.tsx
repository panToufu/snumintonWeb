"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // 🔥 페이지 이동을 위한 도구 추가
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { supabase } from "../supabase"; // 경로 주의

export default function Home() {
  const router = useRouter(); // 🔥 라우터 초기화

  // 기존 상태 변수들
  const [events, setEvents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"info" | "list">("info");
  
  const [userName, setUserName] = useState("");
  const [userType, setUserType] = useState("member");
  const [guestPw, setGuestPw] = useState("");
  const [participationType, setParticipationType] = useState("full");
  const [lessonChoice, setLessonChoice] = useState("tue_thu");
  const [afterpartyJoin, setAfterpartyJoin] = useState(false);

  // 출석 랭킹 상태
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [rankingMonth, setRankingMonth] = useState(new Date().getMonth() + 1);
  const [rankingYear, setRankingYear] = useState(new Date().getFullYear());
  const [monthlyRanking, setMonthlyRanking] = useState<any[]>([]);
  const [monthEventsList, setMonthEventsList] = useState<any[]>([]); 

  // 🔥 관리자 로그인 모달 상태
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");

  useEffect(() => { 
    fetchEvents(); 
    fetchPolls(); 
  }, []);

  useEffect(() => {
    if (isRankingModalOpen) {
      fetchRanking();
    }
  }, [isRankingModalOpen, rankingMonth, rankingYear]);

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    if (data) {
      setEvents(data.map(ev => ({
        id: ev.id, title: ev.title, start: ev.start_at, extendedProps: { ...ev }
      })));
    }
  };

  const fetchPolls = async () => {
    const { data } = await supabase.from("polls").select("*").order("created_at", { ascending: false });
    if (data) setPolls(data);
  };

  const fetchApplicants = async (eventId: string) => {
    const { data } = await supabase.from("applications")
      .select("*").eq("event_id", eventId).order("applied_at", { ascending: true });
    if (data) setApplicants(data);
  };

  const fetchRanking = async () => {
    const { data: membersData } = await supabase.from("members").select("*");
    const membersList = membersData || [];

    const startDate = new Date(rankingYear, rankingMonth - 1, 1).toISOString();
    const endDate = new Date(rankingYear, rankingMonth, 1).toISOString();

    const { data: monthEvents } = await supabase
      .from("events")
      .select("id, start_at, title, type")
      .gte("start_at", startDate)
      .lt("start_at", endDate)
      .order("start_at", { ascending: true });
      
    const eventsList = monthEvents || [];
    setMonthEventsList(eventsList); 

    const eventIds = eventsList.map(e => e.id);

    if (eventIds.length === 0) {
      setMonthlyRanking(membersList.map(m => ({ ...m, count: 0, attendanceRecord: {} })).sort((a, b) => a.name.localeCompare(b.name)));
      return;
    }

    const { data: apps } = await supabase
      .from("applications")
      .select("user_name, event_id, attendance_status")
      .in("event_id", eventIds);

    const ranking = membersList.map(m => {
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

  const getButtonStatus = () => {
    if (!selectedEvent) return { disabled: true, text: "확인 중..." };
    const now = new Date();
    const eventStart = new Date(selectedEvent.start);
    const openTime = new Date(eventStart);

    if (userType === "member" || userType === "ob") {
      openTime.setDate(openTime.getDate() - 2);
      openTime.setHours(23, 0, 0, 0);
    } else {
      openTime.setDate(openTime.getDate() - 1);
      openTime.setHours(15, 0, 0, 0);
    }

    const isOpen = now >= openTime;
    const timeString = openTime.toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" });
    return {
      disabled: !isOpen,
      text: isOpen ? "신청하기" : `${timeString} 오픈`,
      style: isOpen ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"
    };
  };

  const status = getButtonStatus();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleApply();
  };

  const handleApply = async () => {
    if (!userName) return alert("성함을 입력해주세요!");
    if (userType === "guest" && guestPw !== "5678") {
      return alert("게스트 공통 비밀번호가 일치하지 않습니다. 동아리원에게 문의해주세요!");
    }
    const status = getButtonStatus();
    if (status.disabled) return alert(status.text + "까지 조금만 기다려주세요!");

    if (userType === "member" || userType === "ob") {
      const { data: memberData } = await supabase
        .from("members")
        .select("id")
        .eq("name", userName)
        .eq("user_type", userType)
        .single();
      
      if (!memberData) {
        return alert(`등록되지 않은 ${userType === 'member' ? '부원' : 'OB'} 이름입니다. 이름을 다시 확인하거나 운영진에게 문의해주세요!`);
      }
    }

    const { error } = await supabase.from("applications").insert([
      {
        event_id: selectedEvent.id,
        user_name: userName,
        user_type: userType,
        guest_password: userType === "guest" ? guestPw : null,
        participation_type: selectedEvent?.type === 'normal' ? participationType : 'full',
        lesson_choice: selectedEvent?.type === 'lesson' ? lessonChoice : null,
        afterparty_join: selectedEvent?.has_afterparty ? afterpartyJoin : false,
      },
    ]);

    if (error) {
      alert("신청 중 오류가 발생했습니다: " + error.message);
    } else {
      alert(`${userName}님, 신청이 완료되었습니다! 🏸`);
      setUserName(""); setGuestPw(""); setParticipationType("full");
      setLessonChoice("tue_thu"); setAfterpartyJoin(false); 
      fetchApplicants(selectedEvent.id); 
      setActiveTab("list"); 
    }
  };

  const resetAndCloseModal = () => {
    setSelectedEvent(null);
    setIsModalOpen(false);
  };

  // 🔥 관리자 로그인 처리 함수
  const handleAdminLogin = () => {
    if (adminPwInput === "4321") {
      setIsAdminAuthOpen(false);
      setAdminPwInput("");
      router.push("/admin"); // /admin 페이지로 이동!
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setAdminPwInput(""); // 틀리면 입력창 비우기
    }
  };

  const specialEvents = events.filter(ev => ev.extendedProps?.type !== 'normal');

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen relative pb-24">
      
      {/* 🔥 [추가됨] 관리자 페이지 진입 톱니바퀴 버튼 (우측 상단) */}
      <button 
        onClick={() => setIsAdminAuthOpen(true)}
        className="absolute top-6 right-6 md:top-8 md:right-8 text-2xl opacity-30 hover:opacity-100 transition-opacity z-50 cursor-pointer"
        title="운영진 페이지"
      >
        ⚙️
      </button>

      <h1 className="text-3xl font-black text-center my-8 text-blue-900 tracking-tight">SNUMINTON</h1>

      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-lg border border-gray-100">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          locale="ko"
          displayEventTime={false}
          eventClick={(info) => {
            const ev = info.event;
            setSelectedEvent({ id: ev.id, title: ev.title, start: ev.start, ...ev.extendedProps });
            fetchApplicants(ev.id);
            setActiveTab("info");
            setIsModalOpen(true);
          }}
        />
      </div>

      <div className="mt-12 mb-10 max-w-5xl mx-auto px-2 md:px-0">
        <div className="flex items-center justify-between mb-4 px-1">
          <h2 className="text-lg font-black text-slate-800">📌 진행 중인 투표 및 행사</h2>
        </div>
        <div className="flex flex-col gap-3">
          {specialEvents.map((ev, idx) => (
            <div key={`special-${idx}`} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md mb-2 inline-block ${ev.extendedProps.type === 'lesson' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {ev.extendedProps.type === 'lesson' ? '정기 레슨' : '특별 행사'}
                </span>
                <h3 className="font-bold text-slate-900 text-base">{ev.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  일시: {new Date(ev.start).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedEvent({ id: ev.id, title: ev.title, start: ev.start, ...ev.extendedProps });
                  fetchApplicants(ev.id);
                  setActiveTab("info");
                  setIsModalOpen(true);
                }}
                className="w-full md:w-auto px-6 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors mt-2 md:mt-0"
              >
                신청/보기
              </button>
            </div>
          ))}

          {polls.map((poll) => (
            <div key={poll.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
              <div>
                <span className="text-[10px] font-bold bg-purple-100 text-purple-600 px-2 py-1 rounded-md mb-2 inline-block">
                  {poll.poll_type === 'text' ? '건의함' : '투표'}
                </span>
                <h3 className="font-bold text-slate-900 text-base">{poll.title}</h3>
                {poll.deadline && <p className="text-xs text-slate-500 mt-1">마감: {new Date(poll.deadline).toLocaleString()}</p>}
              </div>
              <div className="w-full md:w-auto flex gap-2 mt-2 md:mt-0">
                {poll.poll_type === 'text' ? (
                  <>
                    <input type="text" placeholder="내용을 적어주세요" className="flex-1 md:w-64 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-purple-300" />
                    <button className="px-4 py-2 bg-purple-600 text-white font-bold text-sm rounded-xl hover:bg-purple-700">제출</button>
                  </>
                ) : (
                  <>
                    <button className="flex-1 md:flex-none px-6 py-2.5 bg-blue-50 text-blue-600 font-bold text-sm rounded-xl hover:bg-blue-100">참여</button>
                    <button className="flex-1 md:flex-none px-6 py-2.5 bg-slate-50 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-100">불참</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 출석 확인 플로팅 버튼 */}
      <button 
        onClick={() => setIsRankingModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-full font-black text-sm shadow-xl hover:bg-slate-800 hover:-translate-y-1 transition-all flex items-center gap-2 border border-slate-700"
      >
        출석 확인
      </button>

      {/* 출석 확인(랭킹) 모달 팝업 */}
      {isRankingModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 md:p-6 transition-all"
          onClick={() => setIsRankingModalOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-900 text-white p-5 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                <button onClick={() => setRankingMonth(prev => prev === 1 ? 12 : prev - 1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors font-bold">◀</button>
                <h2 className="text-xl font-black tracking-tight">{rankingYear}년 {rankingMonth}월 상세 출석부</h2>
                <button onClick={() => setRankingMonth(prev => prev === 12 ? 1 : prev + 1)} className="w-10 h-10 flex items-center justify-center bg-slate-800 rounded-full hover:bg-slate-700 transition-colors font-bold">▶</button>
              </div>
              <p className="text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-full">
                🟢 출석 | 🔺 지각 | ✕ 불참 | - 미신청
              </p>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-auto bg-slate-50 custom-scrollbar p-0">
              <table className="w-full text-sm text-center min-w-[max-content] border-collapse">
                <thead>
                  <tr className="bg-white text-slate-500 font-bold border-b-2 border-slate-200">
                    <th className="p-3 sticky left-0 bg-white z-10 w-12 border-r border-slate-100">순위</th>
                    <th className="p-3 sticky left-12 bg-white z-10 w-24 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100">이름</th>
                    <th className="p-3 w-16 text-blue-600 bg-blue-50/30 border-r border-slate-100">총 횟수</th>
                    
                    {monthEventsList.map(ev => (
                      <th key={ev.id} className="p-2 min-w-[45px] border-r border-slate-100 bg-white">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] text-slate-400 font-medium mb-0.5">
                            {ev.type === 'normal' ? '정규' : ev.type === 'lesson' ? '레슨' : '행사'}
                          </span>
                          <span className="text-slate-800 font-black text-xs">{new Date(ev.start_at).getDate()}일</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {monthlyRanking.length === 0 ? (
                    <tr>
                      <td colSpan={100} className="p-10 text-center text-slate-400">등록된 부원이나 일정이 없습니다.</td>
                    </tr>
                  ) : (
                    monthlyRanking.map((stat, idx) => (
                      <tr key={stat.id} className="hover:bg-slate-50 transition-colors bg-white">
                        <td className="p-3 text-slate-400 font-bold sticky left-0 bg-white/95 backdrop-blur-sm z-10 border-r border-slate-50">{idx + 1}</td>
                        <td className="p-3 text-left font-bold text-slate-800 sticky left-12 bg-white/95 backdrop-blur-sm z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] border-r border-slate-50">
                          {stat.name}
                        </td>
                        <td className="p-3 font-black text-blue-600 bg-blue-50/30 border-r border-slate-50">{stat.count}</td>
                        
                        {monthEventsList.map(ev => {
                          const status = stat.attendanceRecord[ev.id];
                          return (
                            <td key={ev.id} className="p-2 border-r border-slate-50 text-base">
                              {status === 'present' ? (
                                <span title="출석">🟢</span>
                              ) : status === 'late' ? (
                                <span title="지각">🔺</span>
                              ) : status === 'none' ? (
                                <span className="text-red-300 font-bold text-xs" title="결석">✕</span>
                              ) : (
                                <span className="text-slate-200 font-light text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <button 
              onClick={() => setIsRankingModalOpen(false)}
              className="w-full py-5 bg-white text-slate-500 text-sm font-bold border-t border-slate-200 hover:text-slate-800 hover:bg-slate-50 transition-colors uppercase tracking-widest z-20"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 🔥 [추가됨] 운영진 로그인 모달 팝업 */}
      {isAdminAuthOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] p-4"
          onClick={() => setIsAdminAuthOpen(false)}
        >
          <div 
            className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-slate-100 animate-in fade-in zoom-in duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-black text-xl text-slate-900 mb-2">👑 운영진 로그인</h3>
            <p className="text-xs text-slate-500 mb-6">관리자 전용 페이지입니다. 비밀번호를 입력해주세요.</p>
            
            <input
              type="password"
              placeholder="비밀번호 4자리"
              className="w-full bg-slate-50 border-2 border-slate-100 p-4 rounded-xl outline-none focus:border-blue-500 text-slate-900 font-bold tracking-widest text-center mb-6 transition-colors"
              value={adminPwInput}
              onChange={(e) => setAdminPwInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
              autoFocus
            />
            
            <div className="flex gap-2">
              <button 
                onClick={() => setIsAdminAuthOpen(false)} 
                className="flex-1 py-3.5 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button 
                onClick={handleAdminLogin} 
                className="flex-1 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
              >
                입장
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 기존 일정 상세/신청 모달 */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center z-[100] p-0 md:p-6 transition-all"
          onClick={resetAndCloseModal}
        >
          {/* ... (기존 신청 모달 내용과 동일) ... */}
          <div 
            className="bg-white w-full max-w-5xl rounded-t-[2rem] md:rounded-[2rem] overflow-hidden shadow-2xl flex flex-col h-[85vh] md:h-[80vh] border border-white/20 animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            
            <div className="flex md:hidden border-b border-slate-100 bg-slate-50/50">
              <button onClick={() => setActiveTab("info")} className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === "info" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-400"}`}>
                정보 및 신청
              </button>
              <button onClick={() => setActiveTab("list")} className={`flex-1 py-5 text-sm font-bold transition-all ${activeTab === "list" ? "text-blue-600 border-b-2 border-blue-600 bg-white" : "text-slate-400"}`}>
                신청 현황 <span className="ml-1 opacity-60">{applicants.length}</span>
              </button>
            </div>

            <div className="flex flex-col md:flex-row overflow-hidden flex-1 min-h-0">
              
              <div className={`flex-1 p-8 md:p-12 overflow-y-auto custom-scrollbar ${activeTab === 'info' ? 'block' : 'hidden md:block'}`}>
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider">
                      {selectedEvent?.type === 'normal' ? 'Regular' : selectedEvent?.type === 'lesson' ? 'Lesson' : 'Special'}
                    </span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight mb-4">
                    {selectedEvent?.title}
                  </h2>
                  <div className="grid grid-cols-1 gap-3 text-slate-600">
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">📅</span>
                      {new Date(selectedEvent?.start).toLocaleString('ko-KR', { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">📍</span>
                      {selectedEvent?.location || "장소 미지정"}
                    </div>
                    <div className="flex items-center gap-3 text-sm font-medium">
                      <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg">👥</span>
                      정원 {selectedEvent?.max_capacity}명
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-8 border-t border-slate-100">
                  <div className="group">
                    <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">신청자 성함</label>
                    <input 
                      type="text" placeholder="이름을 입력하세요" 
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-semibold"
                      value={userName} onChange={(e) => setUserName(e.target.value)} onKeyDown={handleKeyDown}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 ml-1">회원 구분</label>
                      <select 
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-semibold appearance-none"
                        value={userType} onChange={(e) => setUserType(e.target.value)}
                      >
                        <option value="member">부원</option>
                        <option value="ob">OB</option>
                        <option value="guest">게스트</option>
                      </select>
                    </div>
                  </div>

                  {userType === "guest" && (
                    <input 
                      type="password" placeholder="게스트 확인용 비밀번호" 
                      className="w-full bg-orange-50 border-2 border-orange-100 rounded-2xl p-4 outline-none focus:border-orange-400 text-slate-900 font-semibold transition-all" 
                      value={guestPw} onKeyDown={handleKeyDown} onChange={(e) => setGuestPw(e.target.value)}
                    />
                  )}

                  {selectedEvent?.type === 'normal' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-400 ml-1 uppercase">Participation Type</label>
                      <div className="grid grid-cols-3 gap-2">
                        <button onClick={() => setParticipationType("full")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'full' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>정참 (19-22)</button>
                        <button onClick={() => setParticipationType("partial_7_9")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'partial_7_9' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>부분 (19-21)</button>
                        <button onClick={() => setParticipationType("partial_8_10")} className={`py-2 text-[11px] font-bold rounded-xl border-2 transition-all ${participationType === 'partial_8_10' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>부분 (20-22)</button>
                      </div>
                    </div>
                  )}

                  {selectedEvent?.type === 'lesson' && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-400 ml-1">레슨 요일 선택</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setLessonChoice("tue_thu")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${lessonChoice === 'tue_thu' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>화/목 레슨</button>
                        <button onClick={() => setLessonChoice("sat")} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${lessonChoice === 'sat' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-400'}`}>토요 레슨</button>
                      </div>
                    </div>
                  )}

                  {selectedEvent?.has_afterparty && (
                    <div className="space-y-2 pt-2">
                      <label className="block text-xs font-bold text-slate-400 ml-1">뒷풀이 참석 여부 (필수)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setAfterpartyJoin(true)} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${afterpartyJoin === true ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-100 text-slate-400'}`}>참석 🍻</button>
                        <button onClick={() => setAfterpartyJoin(false)} className={`py-3 text-sm font-bold rounded-xl border-2 transition-all ${afterpartyJoin === false ? 'border-slate-300 bg-slate-50 text-slate-600' : 'border-slate-100 text-slate-400'}`}>불참</button>
                      </div>
                    </div>
                  )}

                  <button 
                    disabled={status.disabled} 
                    className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 transition-all active:scale-[0.98] ${status.style}`}
                    onClick={handleApply}
                  >
                    {status.text}
                  </button>
                </div>
              </div>

              <div className={`w-full md:w-[400px] bg-slate-50 p-8 md:p-12 border-l border-slate-100 flex-col h-full overflow-hidden ${activeTab === 'list' ? 'flex' : 'hidden md:flex'}`}>
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-900">신청 현황</h3>
                  <span className="bg-white px-3 py-1 rounded-full text-blue-600 text-xs font-black shadow-sm border border-slate-200">
                    {applicants.length} / {selectedEvent?.max_capacity}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-0">
                {applicants.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 py-10">
                    <p className="text-[11px] font-medium">아직 신청자가 없습니다.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/50 border-t border-slate-100">
                    {applicants.map((app, i) => {
                      const isWaitlisted = selectedEvent?.max_capacity && i >= selectedEvent.max_capacity;
                      const waitlistNumber = isWaitlisted ? i - selectedEvent.max_capacity + 1 : 0;

                      let rowColor = "bg-white hover:bg-slate-50 transition-colors"; 
                      let badgeColor = "bg-slate-100 text-slate-400";

                      if (app.user_type === 'guest') {
                        rowColor = "bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors";
                        badgeColor = "bg-emerald-200 text-emerald-700";
                      } else if (app.user_type === 'ob') {
                        rowColor = "bg-blue-50/80 hover:bg-blue-100/80 transition-colors";
                        badgeColor = "bg-blue-600/20 text-blue-700"; 
                      } else if (app.participation_type !== 'full') {
                        rowColor = "bg-amber-50/80 hover:bg-amber-100/80 transition-colors";
                        badgeColor = "bg-amber-200 text-amber-700";
                      }

                      return (
                        <div key={i} className={`flex justify-between items-center py-2 px-3 group flex-wrap md:flex-nowrap ${rowColor} ${isWaitlisted ? 'opacity-40 grayscale hover:opacity-60' : ''}`}>
                          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden mr-2">
                            <span className="text-[10px] font-black opacity-30 w-4 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                            <div className="flex items-center gap-1.5 min-w-0 truncate">
                              <span className="font-bold text-slate-800 text-[12px] truncate leading-none">{app.user_name}</span>
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase leading-none flex-shrink-0 scale-90 ${badgeColor}`}>{app.user_type}</span>
                              {isWaitlisted && <span className="text-[8px] font-bold bg-slate-700 text-white px-1.5 py-0.5 rounded leading-none flex-shrink-0">대기 {waitlistNumber}</span>}
                              
                              {app.lesson_choice === 'tue_thu' && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">화/목</span>}
                              {app.lesson_choice === 'sat' && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-1 py-0.5 rounded">토요</span>}
                              {app.afterparty_join && <span className="text-[10px]">🍻</span>}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap ml-auto text-right">
                            {app.participation_type !== 'full' && (
                              <span className="text-[8px] font-black bg-white/60 text-amber-600 px-1 py-0.5 rounded border border-amber-200 leading-none">
                                {app.participation_type === 'partial_7_9' ? '19-21' : '20-22'}
                              </span>
                            )}
                            <div className="flex items-baseline gap-1 tabular-nums">
                              <span className="text-[9px] font-medium text-slate-400">
                                {new Date(app.applied_at).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' }).replace('.', '/').replace('.', '')}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500">
                                {new Date(app.applied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
            </div>

            <button onClick={resetAndCloseModal} className="hidden md:block w-full py-6 bg-white text-slate-400 text-xs font-bold border-t border-slate-100 hover:text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-widest">
              Close Window
            </button>
          </div>
        </div>
      )}
    </main>
  );
}