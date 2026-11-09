import { describe, expect, it } from "vitest";
import { calculateBookingTotalCents, isSlotAligned, isWithinBookingWindow, localInputMatchesDate, reservationOverlaps } from "./stillpoint";
import { canTransitionReservation, formatDateTimeInTimeZone, isValidIanaTimeZone } from "./stillpoint-policy";

describe("Stillpoint booking policy", () => {
  it("calculates $9.30 listening time plus $1 per 30-minute unit", () => {
    expect(calculateBookingTotalCents(1)).toBe(1030);
    expect(calculateBookingTotalCents(4)).toBe(4120);
    expect(calculateBookingTotalCents(0)).toBeNull();
    expect(calculateBookingTotalCents(5)).toBeNull();
  });

  it("detects overlapping intervals while allowing adjacent sessions", () => {
    const start = new Date("2026-10-14T10:00:00.000Z");
    const end = new Date("2026-10-14T11:00:00.000Z");
    expect(reservationOverlaps(start, end, new Date("2026-10-14T10:30:00.000Z"), new Date("2026-10-14T11:00:00.000Z"))).toBe(true);
    expect(reservationOverlaps(start, end, new Date("2026-10-14T11:00:00.000Z"), new Date("2026-10-14T11:30:00.000Z"))).toBe(false);
  });

  it("aligns slots using local timezone rules rather than the server timezone", () => {
    expect(isSlotAligned(new Date("2026-10-14T14:00:00.000Z"), "America/New_York")).toBe(true);
    expect(isSlotAligned(new Date("2026-10-14T14:15:00.000Z"), "America/New_York")).toBe(false);
    expect(isSlotAligned(new Date("2026-10-14T14:00:00.500Z"), "America/New_York")).toBe(false);
    expect(isSlotAligned(new Date("2026-10-14T14:00:00.000Z"), "Not/AZone")).toBe(false);
  });

  it("checks that the submitted local wall time matches the absolute timestamp across DST", () => {
    expect(localInputMatchesDate(new Date("2026-03-08T10:00:00.000Z"), "2026-03-08T03:00", "America/Los_Angeles")).toBe(true);
    expect(localInputMatchesDate(new Date("2026-03-08T10:30:00.000Z"), "2026-03-08T02:30", "America/Los_Angeles")).toBe(false);
  });

  it("validates time zones and formats a timestamp explicitly in the selected zone", () => {
    expect(isValidIanaTimeZone("America/Los_Angeles")).toBe(true);
    expect(isValidIanaTimeZone("Definitely/NotAZone")).toBe(false);
    expect(formatDateTimeInTimeZone(new Date("2026-09-06T14:00:00.000Z"), "America/Los_Angeles")).toContain("7:00 AM");
  });

  it("enforces a strict rolling 12-hour window", () => {
    const now = new Date("2026-10-14T12:00:00.000Z");
    expect(isWithinBookingWindow(new Date("2026-10-14T00:00:00.001Z"), now)).toBe(true);
    expect(isWithinBookingWindow(new Date("2026-10-14T00:00:00.000Z"), now)).toBe(false);
    expect(isWithinBookingWindow(new Date("2026-10-14T12:01:00.000Z"), now)).toBe(false);
    expect(isWithinBookingWindow(new Date("2026-10-15T12:00:00.000Z"), now)).toBe(false);
  });

  it("allows only valid, idempotent reservation state transitions", () => {
    expect(canTransitionReservation("requested", "confirmed")).toBe(true);
    expect(canTransitionReservation("requested", "cancelled")).toBe(true);
    expect(canTransitionReservation("confirmed", "completed")).toBe(true);
    expect(canTransitionReservation("confirmed", "cancelled")).toBe(true);
    expect(canTransitionReservation("completed", "cancelled")).toBe(false);
    expect(canTransitionReservation("cancelled", "confirmed")).toBe(false);
    expect(canTransitionReservation("completed", "completed")).toBe(true);
  });
});
