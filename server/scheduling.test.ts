import { describe, expect, it } from "vitest";
import { calculateReservationTotal, canAccessDashboard, canStartEnrollment, createBookingNotification, getDemoStorageKey, hasReservationConflict, isPaymentValidForUnits, isReservationAllowed } from "../client/src/lib/scheduling";

describe("demo reservation rules", () => {
  const now = new Date("2026-09-06T12:00:00.000Z");
  const future = new Date("2026-09-06T14:00:00.000Z");

  it("calculates $10.30 for one 30-minute block", () => {
    expect(calculateReservationTotal(1)).toEqual({ minutes: 30, listeningCharge: 9.3, blockCharge: 1, total: 10.3 });
  });

  it("calculates the additional block fee for multiple units", () => {
    expect(calculateReservationTotal(4).total).toBe(41.2);
  });

  it("accepts payment only when the paid units and amount match", () => {
    const paidForTwo = { id: "DEMO-2", amount: 20.6, units: 2, paidAt: now.toISOString() };
    expect(isPaymentValidForUnits(paidForTwo, 2)).toBe(true);
    expect(isPaymentValidForUnits(paidForTwo, 1)).toBe(false);
  });

  it("creates an admin notification with the paid booking details", () => {
    const notification = createBookingNotification({ clientName: "A Client", clientEmail: "client@example.com", startsAt: future.toISOString(), units: 1, amount: 10.3, paymentId: "DEMO-1" });
    expect(notification).toMatchObject({ clientName: "A Client", units: 1, amount: 10.3, paymentId: "DEMO-1" });
    expect(notification.id).toMatch(/^NOTICE-/);
    expect(notification.createdAt).toBeTruthy();
  });

  it("allows one to four units in the future", () => {
    expect(isReservationAllowed([], future, 1, now)).toBe(true);
    expect(isReservationAllowed([], future, 4, now)).toBe(true);
  });

  it("rejects reservations outside the one-to-four unit range", () => {
    expect(isReservationAllowed([], future, 0, now)).toBe(false);
    expect(isReservationAllowed([], future, 5, now)).toBe(false);
  });

  it("rejects a second reservation when an earlier booking has a future session time", () => {
    const recentBooking = [{
      id: "recent",
      startsAt: "2026-09-10T04:30:00.000Z",
      createdAt: "2026-09-06T04:30:00.000Z",
      units: 2,
    }];
    expect(isReservationAllowed(recentBooking, future, 1, now)).toBe(false);
  });

  it("rejects a session time that is already reserved", () => {
    const reservation = [{
      id: "taken",
      startsAt: future.toISOString(),
      createdAt: "2026-09-05T23:30:00.000Z",
      units: 1,
    }];
    expect(hasReservationConflict(reservation, future)).toBe(true);
  });

  it("gates enrollment behind sign-in and terms acceptance", () => {
    expect(canStartEnrollment(false, true)).toBe(false);
    expect(canStartEnrollment(true, false)).toBe(false);
    expect(canStartEnrollment(true, true)).toBe(true);
  });

  it("only allows enrolled authenticated clients into the dashboard", () => {
    expect(canAccessDashboard(false, true)).toBe(false);
    expect(canAccessDashboard(true, false)).toBe(false);
    expect(canAccessDashboard(true, true)).toBe(true);
  });

  it("keeps demo enrollment storage isolated by identity", () => {
    expect(getDemoStorageKey("client-a")).not.toBe(getDemoStorageKey("client-b"));
    expect(getDemoStorageKey()).toContain("guest");
  });

  it("allows a new reservation after the rolling 12-hour window", () => {
    const olderBooking = [{
      id: "older",
      startsAt: "2026-09-05T23:30:00.000Z",
      createdAt: "2026-09-05T23:30:00.000Z",
      units: 4,
    }];
    expect(isReservationAllowed(olderBooking, future, 2, now)).toBe(true);
  });
});
