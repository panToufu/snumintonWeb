const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1000;

export type AttendanceRange = {
  startAt: string;
  endAt: string;
};

function parseKoreaDate(value: string | null) {
  if (!value || !DATE_PATTERN.test(value)) return null;

  const [year, month, day] = value.split("-").map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Resolves either a calendar month or an inclusive, user-selected date range
 * into the corresponding Korea Standard Time boundaries.
 */
export function getAttendanceRange(searchParams: URLSearchParams): AttendanceRange | null {
  const startDate = searchParams.get("start_date");
  const endDate = searchParams.get("end_date");

  if (startDate || endDate) {
    const start = parseKoreaDate(startDate);
    const end = parseKoreaDate(endDate);
    if (!start || !end || end.getTime() < start.getTime() || end.getTime() - start.getTime() > 365 * DAY_MS) return null;

    return {
      startAt: start.toISOString(),
      endAt: new Date(end.getTime() + DAY_MS).toISOString(),
    };
  }

  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!Number.isInteger(year) || year < 2020 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) return null;

  const monthText = String(month).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = parseKoreaDate(`${year}-${monthText}-01`);
  const end = parseKoreaDate(`${year}-${monthText}-${String(lastDay).padStart(2, "0")}`);
  if (!start || !end) return null;

  return {
    startAt: start.toISOString(),
    endAt: new Date(end.getTime() + DAY_MS).toISOString(),
  };
}

export function koreaDateInputValue(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
