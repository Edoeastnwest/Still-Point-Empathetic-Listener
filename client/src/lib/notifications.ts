export type NotificationTone = "success" | "info" | "warning";
export type NotificationCategory = "enrollment" | "booking" | "update" | "reminder";

export type ClientNotification = {
  id: string;
  title: string;
  message: string;
  tone: NotificationTone;
  category: NotificationCategory;
  createdAt: string;
  read: boolean;
};

export type NotificationPreferences = {
  inAppEnabled: boolean;
  emailEnabled: false;
  emailAvailable: false;
};

export function unreadNotificationCount(notifications: ClientNotification[]) {
  return notifications.filter((notification) => !notification.read).length;
}
