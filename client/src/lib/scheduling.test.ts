import { describe, expect, it } from "vitest";
import { isReservationAllowed } from "./scheduling";

describe("demo reservation rules", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const future = new Date("2026-09-06T14:00:00.000Z");

  it("allows one to four units in the future", () => {
    expect(isReservationAllowed([], future, 1, now)).toBe(true);
    expect(isReservationAllowed([], future, 4, now)).toBe(true);
  });

  it("rejects reservations outside the one-to-four unit range", () => {
    expect(isReservationAllowed([], future, 0, now)).toBe(false);
    expect(isReservationAllowed([], future, 5, now)).toBe(false);
  });

  it("rejects a second reservation during the rolling 12-hour window", () => {
    const recent = [{ id: "recent", startsAt: "2026-09-06T04:30:00.000Z", units: 2 }];
    expect(isReservationAllowed(recent, future, 1, now)).toBe(false);
  });

  it("allows a new reservation after the rolling 12-hour window", () => {
    const older = [{ id: "older", startsAt: "2026-09-05T23:30:00.000Z", units: 4 }];
    expect(isReservationAllowed(older, future, 2, now)).toBe(true);
  });
});
