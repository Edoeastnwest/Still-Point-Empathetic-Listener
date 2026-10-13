export type NotificationTone = "success" | "info" | "warning";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  createdAt: string;
  read: boolean;
};

export type NotificationPreferences = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

export function unreadNotificationCount(notifications: ClientNotification[]) {
  return notifications.filter((notification) => !notification.read).length;
}
