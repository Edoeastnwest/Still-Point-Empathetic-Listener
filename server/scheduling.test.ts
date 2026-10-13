import { describe, expect, it } from "vitest";
import { formatDuration, formatSessionTime, MAX_UNITS, UNIT_MINUTES } from "../client/src/lib/scheduling";

describe("Stillpoint scheduling display helpers", () => {
  it("uses 30-minute units and limits sessions to four units", () => {
    expect(UNIT_MINUTES).toBe(30);
    expect(MAX_UNITS).toBe(4);
    expect(formatDuration(4)).toBe("120 min");
  });

  it("formats a valid scheduled timestamp for local display", () => {
    expect(formatSessionTime("2026-09-06T14:00:00.000Z")).toContain("Sep");
    expect(formatSessionTime("2026-09-06T14:00:00.000Z")).toContain("6");
  });
});
