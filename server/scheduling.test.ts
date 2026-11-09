import { describe, expect, it } from "vitest";
import { calculateBookingTotalCents, formatDuration, formatSessionTime, MAX_UNITS, nextLocalSlot, toLocalDateTimeInputValue, UNIT_MINUTES } from "../client/src/lib/scheduling";

describe("Stillpoint scheduling display helpers", () => {
  it("uses exact $10.30 per 30-minute unit and a four-unit maximum", () => {
    expect(UNIT_MINUTES).toBe(30);
    expect(MAX_UNITS).toBe(4);
    expect(calculateBookingTotalCents(1)).toBe(1030);
    expect(calculateBookingTotalCents(4)).toBe(4120);
    expect(calculateBookingTotalCents(0)).toBeNull();
    expect(calculateBookingTotalCents(5)).toBeNull();
    expect(formatDuration(4)).toBe("120 min");
  });

  it("formats a valid scheduled timestamp in the requested time zone", () => {
    const session = "2026-09-06T14:00:00.000Z";
    expect(formatSessionTime(session, "America/Los_Angeles")).toContain("Sep");
    expect(formatSessionTime(session, "America/Los_Angeles")).toContain("7:00");
  });

  it("converts local inputs without shifting their wall-clock time", () => {
    const local = new Date(2026, 8, 6, 9, 30, 0, 0);
    expect(toLocalDateTimeInputValue(local)).toBe("2026-09-06T09:30");
    expect(nextLocalSlot(new Date(2026, 8, 6, 9, 31, 0, 0))).toBe("2026-09-06T10:00");
    expect(nextLocalSlot(new Date(2026, 8, 6, 9, 30, 1, 0))).toBe("2026-09-06T10:00");
  });
});
