export type RegistrationEvent = {
  start_at: string;
  registration_start_at?: string | null;
};

const KOREA_UTC_OFFSET_MS = 9 * 60 * 60 * 1000;

function koreaDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function getRegistrationStart(event: RegistrationEvent, userType: string) {
  if (event.registration_start_at) {
    const configuredStart = new Date(event.registration_start_at);
    if (!Number.isNaN(configuredStart.getTime())) return configuredStart;
  }

  const eventStart = new Date(event.start_at);
  if (Number.isNaN(eventStart.getTime())) return null;

  const { year, month, day } = koreaDateParts(eventStart);
  const isGuest = userType === "guest";
  const openingHour = isGuest ? 15 : 23;
  const daysBeforeEvent = isGuest ? 1 : 2;

  return new Date(
    Date.UTC(year, month - 1, day - daysBeforeEvent, openingHour) - KOREA_UTC_OFFSET_MS,
  );
}
