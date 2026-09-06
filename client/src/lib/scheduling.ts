export const UNIT_MINUTES = 30;
export const MIN_UNITS = 1;
export const MAX_UNITS = 4;
export const BOOKING_WINDOW_HOURS = 12;
export const PRICE_PER_MINUTE = 0.31;
export const BLOCK_FEE = 1;

export function getDemoStorageKey(identity?: string) {
  return `empathetic-listening-demo-${identity ?? "guest"}`;
}

export function canStartEnrollment(isAuthenticated: boolean, acceptedTerms: boolean) {
  return isAuthenticated && acceptedTerms;
}

export function canAccessDashboard(isAuthenticated: boolean, enrolled: boolean) {
  return isAuthenticated && enrolled;
}

export type DemoPayment = {
  id: string;
  amount: number;
  units: number;
  paidAt: string;
};

export type DemoBookingNotification = {
  id: string;
  clientName: string;
  clientEmail: string;
  startsAt: string;
  units: number;
  amount: number;
  paymentId: string;
  createdAt: string;
};

export function isPaymentValidForUnits(payment: DemoPayment | undefined, units: number) {
  return Boolean(payment && payment.units === units && payment.amount === calculateReservationTotal(units).total);
}

export function createBookingNotification(input: Omit<DemoBookingNotification, "id" | "createdAt">): DemoBookingNotification {
  return { ...input, id: `NOTICE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`, createdAt: new Date().toISOString() };
}

export function calculateReservationTotal(units: number) {
  const minutes = units * UNIT_MINUTES;
  const listeningCharge = Number((minutes * PRICE_PER_MINUTE).toFixed(2));
  const blockCharge = Number((units * BLOCK_FEE).toFixed(2));
  return {
    minutes,
    listeningCharge,
    blockCharge,
    total: Number((listeningCharge + blockCharge).toFixed(2)),
  };
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
