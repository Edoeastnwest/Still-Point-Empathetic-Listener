import { Bell, CheckCheck, Info, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { addNotification, dismissNotification, loadNotifications, markAllNotificationsRead, type ClientNotification } from "@/lib/notifications";

export default function NotificationCenter({ storageKey }: { storageKey: string }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ClientNotification[]>(() => loadNotifications(storageKey));
  const unreadCount = useMemo(() => notifications.filter((notification) => !notification.read).length, [notifications]);

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications(storageKey));
    refresh();
    window.addEventListener("stillpoint-notifications-changed", refresh);
    return () => window.removeEventListener("stillpoint-notifications-changed", refresh);
  }, [storageKey]);

  const markRead = () => {
    markAllNotificationsRead(storageKey);
    setNotifications(loadNotifications(storageKey));
  };

  const remove = (notificationId: string) => {
    dismissNotification(storageKey, notificationId);
    setNotifications(loadNotifications(storageKey));
  };

  return <div className="relative">
    <Button aria-label="Open notifications" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} className="relative h-9 w-9 rounded-xl text-[#68716b] hover:bg-[#f4f1ea] hover:text-[#173d35]"><Bell className="h-4 w-4" />{unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9a7257] px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</Button>
    {open ? <div className="absolute right-0 top-11 z-50 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdfa] shadow-[0_20px_60px_rgba(67,73,63,0.16)]"><div className="flex items-center justify-between border-b border-[#eee9df] px-4 py-3"><div><p className="font-serif text-lg text-[#173d35]">Notifications</p><p className="text-xs text-[#929990]">{unreadCount ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "You’re all caught up"}</p></div>{unreadCount ? <Button variant="ghost" size="sm" onClick={markRead} className="text-xs text-[#587365] hover:bg-[#f0f6f1]"><CheckCheck className="mr-1.5 h-3.5 w-3.5" /> Mark all read</Button> : null}</div><div className="max-h-[min(60vh,420px)] overflow-y-auto">{notifications.length ? notifications.map((notification) => <div key={notification.id} className={`flex gap-3 border-b border-[#f1ece4] px-4 py-4 last:border-b-0 ${notification.read ? "opacity-65" : "bg-[#fffaf5]"}`}><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${notification.tone === "success" ? "bg-[#f0f6f1] text-[#4e866f]" : notification.tone === "warning" ? "bg-[#fff4ed] text-[#9a7257]" : "bg-[#eef3f5] text-[#58727b]"}`}><Info className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#34483e]">{notification.title}</p><button aria-label={`Dismiss ${notification.title}`} onClick={() => remove(notification.id)} className="rounded-md p-0.5 text-[#a2aaa2] hover:bg-[#f4f1ea] hover:text-[#173d35]"><X className="h-3.5 w-3.5" /></button></div><p className="mt-1 text-sm leading-5 text-[#768078]">{notification.message}</p><p className="mt-2 text-[11px] text-[#a2aaa2]">{new Date(notification.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></div>) : <div className="px-5 py-10 text-center"><Bell className="mx-auto h-6 w-6 text-[#c3b5a7]" /><p className="mt-3 text-sm text-[#768078]">No notifications yet.</p></div>}</div></div> : null}
  </div>;
}
