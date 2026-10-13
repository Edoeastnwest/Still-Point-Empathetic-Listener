import { describe, expect, it } from "vitest";
import { calculateBookingTotalCents, isSlotAligned, isWithinRollingBookingWindow, reservationOverlaps } from "./stillpoint";

describe("Stillpoint booking policy", () => {
  it("calculates $9.30 session price plus $1 service fee per 30-minute unit", () => {
    expect(calculateBookingTotalCents(1)).toBe(1030);
    expect(calculateBookingTotalCents(4)).toBe(4120);
    expect(calculateBookingTotalCents(0)).toBeNull();
    expect(calculateBookingTotalCents(5)).toBeNull();
  });

  it("detects any overlapping interval while allowing adjacent sessions", () => {
    const existingStart = new Date("2026-10-14T10:00:00.000Z");
    const existingEnd = new Date("2026-10-14T11:00:00.000Z");
    expect(reservationOverlaps(existingStart, existingEnd, new Date("2026-10-14T10:30:00.000Z"), new Date("2026-10-14T11:00:00.000Z"))).toBe(true);
    expect(reservationOverlaps(existingStart, existingEnd, new Date("2026-10-14T11:00:00.000Z"), new Date("2026-10-14T11:30:00.000Z"))).toBe(false);
  });

  it("requires starts to align to 30-minute boundaries", () => {
    expect(isSlotAligned(new Date("2026-10-14T10:00:00.000Z"))).toBe(true);
    expect(isSlotAligned(new Date("2026-10-14T10:30:00.000Z"))).toBe(true);
    expect(isSlotAligned(new Date("2026-10-14T10:15:00.000Z"))).toBe(false);
    expect(isSlotAligned(new Date("2026-10-14T14:00:00.000Z"), 240)).toBe(true);
    expect(isSlotAligned(new Date("2026-10-14T14:15:00.000Z"), 240)).toBe(false);
  });

  it("enforces one booking per rolling 12-hour period and allows the boundary", () => {
    const now = new Date("2026-10-14T12:00:00.000Z");
    expect(isWithinRollingBookingWindow(new Date("2026-10-14T00:00:00.001Z"), now)).toBe(true);
    expect(isWithinRollingBookingWindow(new Date("2026-10-14T00:00:00.000Z"), now)).toBe(false);
    expect(isWithinRollingBookingWindow(new Date("2026-10-14T12:01:00.000Z"), now)).toBe(false);
  });
});
