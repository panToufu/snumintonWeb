export type EventType = "normal" | "lesson" | "special" | "lightning";

export type ClubEvent = {
  id: string;
  title: string;
  type: EventType;
  start_at: string;
  end_at: string | null;
  color?: string | null;
  location?: string | null;
  max_capacity: number;
  participating_execs?: string[] | null;
  allow_registration?: boolean | null;
  allow_guests?: boolean | null;
  has_afterparty?: boolean | null;
  ask_level?: boolean | null;
  is_attendance_counted?: boolean | null;
  registration_start_at?: string | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps: ClubEvent;
};

export type SelectedClubEvent = ClubEvent & {
  start: string;
  end: string | null;
};

export type AdminCalendarEvent = ClubEvent & {
  start: string;
  end?: string;
  color: string;
};

export type AttendanceEvent = {
  id: string;
  title: string;
  type: EventType;
  start_at: string;
};

export type ClubMember = {
  id: string;
  name: string;
  user_type: string;
};

export type ClubApplication = {
  id: string;
  event_id: string;
  user_name: string;
  user_type: string;
  participation_type?: string | null;
  lesson_choice?: string | null;
  afterparty_join?: boolean | null;
  level?: string | null;
  applied_at?: string | null;
  attendance_status?: string | null;
  is_paid?: boolean | null;
  phone_number?: string | null;
  guest_source?: string | null;
  guest_referrer?: string | null;
  waitlisted?: boolean;
  queueNumber?: number;
};

export type ClubPoll = {
  id: string;
  title: string;
  poll_type: string;
  deadline?: string | null;
  created_at: string;
};

export type AttendanceRanking = ClubMember & {
  count: number;
  attendanceRecord: Record<string, string>;
};
