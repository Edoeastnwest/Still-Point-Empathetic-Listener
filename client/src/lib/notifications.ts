export type NotificationTone = "success" | "info" | "warning";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
};

export function notificationStorageKey(identity?: string) {
  return `stillpoint-notifications-${identity ?? "guest"}`;
}

export function createNotification(input: Omit<ClientNotification, "id" | "createdAt" | "read">): ClientNotification {
  return {
    ...input,
    id: `NOTICE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export function loadNotifications(storageKey: string): ClientNotification[] {
  try {
    const saved = window.localStorage.getItem(storageKey);
    return saved ? (JSON.parse(saved) as ClientNotification[]) : [];
  } catch {
    return [];
  }
}

export function saveNotifications(storageKey: string, notifications: ClientNotification[]) {
  window.localStorage.setItem(storageKey, JSON.stringify(notifications));
  window.dispatchEvent(new Event("stillpoint-notifications-changed"));
}

export function addNotification(storageKey: string, notification: ClientNotification) {
  saveNotifications(storageKey, [notification, ...loadNotifications(storageKey)]);
}

export function markNotificationsRead(notifications: ClientNotification[]) {
  return notifications.map((notification) => ({ ...notification, read: true }));
}

export function markAllNotificationsRead(storageKey: string) {
  saveNotifications(storageKey, markNotificationsRead(loadNotifications(storageKey)));
}

export function dismissNotification(storageKey: string, notificationId: string) {
  saveNotifications(storageKey, loadNotifications(storageKey).filter((notification) => notification.id !== notificationId));
}
