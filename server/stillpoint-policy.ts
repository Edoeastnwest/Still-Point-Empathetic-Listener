import type { StillpointReservationStatus } from "../drizzle/schema";

const allowedTransitions: Record<StillpointReservationStatus, readonly StillpointReservationStatus[]> = {
  requested: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function canTransitionReservation(from: StillpointReservationStatus, to: StillpointReservationStatus) {
  return from === to || allowedTransitions[from].includes(to);
}

export function isValidIanaTimeZone(value: string) {
  if (value.length < 1 || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function formatDateTimeInTimeZone(value: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(value);
  } catch {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(value) + " UTC";
  }
}
