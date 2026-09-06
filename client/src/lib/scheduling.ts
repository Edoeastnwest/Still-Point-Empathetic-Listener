export const UNIT_MINUTES = 30;
export const MIN_UNITS = 1;
export const MAX_UNITS = 4;
export const BOOKING_WINDOW_HOURS = 12;

export function getDemoStorageKey(identity?: string) {
  return `empathetic-listening-demo-${identity ?? "guest"}`;
}

export function canStartEnrollment(isAuthenticated: boolean, acceptedTerms: boolean) {
  return isAuthenticated && acceptedTerms;
}

export function canAccessDashboard(isAuthenticated: boolean, enrolled: boolean) {
  return isAuthenticated && enrolled;
}

export type DemoReservation = {
  id: string;
  startsAt: string;
  createdAt: string;
  units: number;
};

export function hasActiveBookingWindow(reservations: DemoReservation[], now = new Date()) {
  return reservations.some((reservation) => {
    const createdAt = new Date(reservation.createdAt).getTime();
    const hoursSinceBooking = (now.getTime() - createdAt) / (1000 * 60 * 60);
    return hoursSinceBooking >= 0 && hoursSinceBooking < BOOKING_WINDOW_HOURS;
  });
}

export function hasReservationConflict(reservations: DemoReservation[], startsAt: Date) {
  return reservations.some((reservation) => new Date(reservation.startsAt).getTime() === startsAt.getTime());
}

export function isReservationAllowed(
  reservations: DemoReservation[],
  startsAt: Date,
  units: number,
  now = new Date(),
) {
  if (units < MIN_UNITS || units > MAX_UNITS) return false;
  if (hasActiveBookingWindow(reservations, now)) return false;
  if (hasReservationConflict(reservations, startsAt)) return false;
  return startsAt.getTime() > now.getTime();
}

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
