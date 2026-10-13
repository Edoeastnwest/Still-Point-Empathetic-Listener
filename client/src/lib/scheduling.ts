export const UNIT_MINUTES = 30;
export const MAX_UNITS = 4;

export function formatDuration(units: number) {
  return `${units * UNIT_MINUTES} min`;
}

export function formatSessionTime(startsAt: string) {
  return new Date(startsAt).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
