import { describe, expect, it } from "vitest";
import { createNotification, markNotificationsRead, notificationStorageKey } from "../client/src/lib/notifications";

describe("client notifications", () => {
  it("creates an unread notification with a stable shape", () => {
    const notification = createNotification({ tone: "success", title: "Session reserved", message: "Your session is confirmed." });
    expect(notification.read).toBe(false);
    expect(notification.id).toMatch(/^NOTICE-/);
    expect(notification.title).toBe("Session reserved");
  });

  it("scopes notification storage by identity", () => {
    expect(notificationStorageKey("client-a")).not.toBe(notificationStorageKey("client-b"));
  });

  it("marks all supplied notifications as read", () => {
    const notifications = [
      createNotification({ tone: "info", title: "One", message: "First" }),
      createNotification({ tone: "warning", title: "Two", message: "Second" }),
    ];
    expect(markNotificationsRead(notifications).every((notification) => notification.read)).toBe(true);
  });
});
