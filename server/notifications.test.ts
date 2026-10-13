import { describe, expect, it } from "vitest";
import { unreadNotificationCount, type ClientNotification } from "../client/src/lib/notifications";

function notification(id: string, read: boolean): ClientNotification {
  return { id, title: `Notice ${id}`, message: "Stillpoint update", tone: "info", createdAt: "2026-10-13T12:00:00.000Z", read };
}

describe("database-backed client notification view model", () => {
  it("counts only unread notifications", () => {
    expect(unreadNotificationCount([notification("one", false), notification("two", true), notification("three", false)])).toBe(2);
  });

  it("returns zero for an empty or fully read notification list", () => {
    expect(unreadNotificationCount([])).toBe(0);
    expect(unreadNotificationCount([notification("one", true)])).toBe(0);
  });
});
