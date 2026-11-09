export const UNIT_MINUTES = 30;
export const MAX_UNITS = 4;
export const UNIT_PRICE_CENTS = 930;
export const UNIT_FEE_CENTS = 100;

export function calculateBookingTotalCents(units: number) {
  if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) return null;
  return units * (UNIT_PRICE_CENTS + UNIT_FEE_CENTS);
}

export function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}

export function formatDuration(units: number) {
  return `${units * UNIT_MINUTES} min`;
}

export function toLocalDateTimeInputValue(date: Date) {
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function nextLocalSlot(now = new Date()) {
  const next = new Date(now);
  next.setSeconds(0, 0);
  const remainder = next.getMinutes() % UNIT_MINUTES;
  next.setMinutes(next.getMinutes() + (remainder === 0 ? (now.getSeconds() || now.getMilliseconds() ? UNIT_MINUTES : 0) : UNIT_MINUTES - remainder));
  if (next.getTime() <= now.getTime()) next.setMinutes(next.getMinutes() + UNIT_MINUTES);
  return toLocalDateTimeInputValue(next);
}

export function formatSessionTime(startsAt: string, timeZone?: string) {
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return "Time unavailable";
  const options: Intl.DateTimeFormatOptions = {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  };
  if (timeZone) options.timeZone = timeZone;
  return new Intl.DateTimeFormat(undefined, options).format(date);
}
