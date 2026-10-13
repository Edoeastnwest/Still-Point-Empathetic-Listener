import { Bell, CheckCheck, Info, Settings2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { unreadNotificationCount } from "@/lib/notifications";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const utils = trpc.useUtils();
  const notifications = trpc.stillpoint.notifications.list.useQuery();
  const preferences = trpc.stillpoint.notifications.preferences.useQuery();
  const savePreferences = trpc.stillpoint.notifications.savePreferences.useMutation({
    onSuccess: async () => { await utils.stillpoint.notifications.invalidate(); },
  });
  const markRead = trpc.stillpoint.notifications.markAllRead.useMutation({
    onSuccess: async () => { await utils.stillpoint.notifications.list.invalidate(); },
  });
  const dismiss = trpc.stillpoint.notifications.dismiss.useMutation({
    onSuccess: async () => { await utils.stillpoint.notifications.list.invalidate(); },
  });
  const rows = notifications.data ?? [];
  const unreadCount = unreadNotificationCount(rows);
  const prefs = preferences.data ?? { inAppEnabled: true, emailEnabled: false };
  const updatePreference = (key: "inAppEnabled" | "emailEnabled", value: boolean) => {
    savePreferences.mutate({ ...prefs, [key]: value });
  };

  return <div className="relative">
    <Button aria-label="Open notifications" aria-expanded={open} variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} className="relative h-9 w-9 rounded-xl text-[#68716b] hover:bg-[#f4f1ea] hover:text-[#173d35]"><Bell className="h-4 w-4" />{unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#9a7257] px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span> : null}</Button>
    {open ? <div className="absolute right-0 top-11 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-[#e6e0d5] bg-[#fffdfa] shadow-[0_20px_60px_rgba(67,73,63,0.16)]">
      <div className="flex items-center justify-between border-b border-[#eee9df] px-4 py-3"><div><p className="font-serif text-lg text-[#173d35]">Notifications</p><p className="text-xs text-[#929990]">{notifications.isLoading ? "Checking for updates…" : unreadCount ? `${unreadCount} unread update${unreadCount > 1 ? "s" : ""}` : "You’re all caught up"}</p></div><div className="flex items-center gap-1">{unreadCount > 0 ? <Button variant="ghost" size="sm" onClick={() => markRead.mutate()} disabled={markRead.isPending} className="text-xs text-[#587365] hover:bg-[#f0f6f1]"><CheckCheck className="mr-1 h-3.5 w-3.5" /> Read all</Button> : null}<Button aria-label="Notification preferences" variant="ghost" size="icon" onClick={() => setShowPreferences((value) => !value)} className="h-8 w-8 text-[#68716b]"><Settings2 className="h-4 w-4" /></Button></div></div>
      {showPreferences ? <div className="space-y-3 border-b border-[#eee9df] bg-[#faf7f0] px-4 py-4"><p className="text-sm font-semibold text-[#34483e]">Delivery preferences</p><label className="flex items-center justify-between gap-4 text-sm text-[#68716b]"><span>In-app alerts</span><input aria-label="In-app alerts" type="checkbox" checked={prefs.inAppEnabled} disabled={preferences.isLoading || savePreferences.isPending} onChange={(event) => updatePreference("inAppEnabled", event.target.checked)} className="h-4 w-4 accent-[#173d35]" /></label><label className="flex items-center justify-between gap-4 text-sm text-[#68716b]"><span>Email alerts <span className="block text-xs text-[#929990]">Preference saved; delivery is not connected in this demo.</span></span><input aria-label="Email alerts" type="checkbox" checked={prefs.emailEnabled} disabled={preferences.isLoading || savePreferences.isPending} onChange={(event) => updatePreference("emailEnabled", event.target.checked)} className="h-4 w-4 accent-[#173d35]" /></label></div> : null}
      <div className="max-h-[min(60vh,420px)] overflow-y-auto">{notifications.isError ? <p className="px-5 py-8 text-center text-sm text-[#8a5d46]">Notifications are temporarily unavailable. Please try again.</p> : rows.length ? rows.map((notification) => <div key={notification.id} className={`flex gap-3 border-b border-[#f1ece4] px-4 py-4 last:border-b-0 ${notification.read ? "opacity-65" : "bg-[#fffaf5]"}`}><div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${notification.tone === "success" ? "bg-[#f0f6f1] text-[#4e866f]" : notification.tone === "warning" ? "bg-[#fff4ed] text-[#9a7257]" : "bg-[#eef3f5] text-[#58727b]"}`}><Info className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold text-[#34483e]">{notification.title}</p><button aria-label={`Dismiss ${notification.title}`} onClick={() => dismiss.mutate({ id: notification.id })} className="rounded-md p-0.5 text-[#a2aaa2] hover:bg-[#f4f1ea] hover:text-[#173d35]"><X className="h-3.5 w-3.5" /></button></div><p className="mt-1 text-sm leading-5 text-[#768078]">{notification.message}</p><p className="mt-2 text-[11px] text-[#a2aaa2]">{new Date(notification.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></div>) : <div className="px-5 py-10 text-center"><Bell className="mx-auto h-6 w-6 text-[#c3b5a7]" /><p className="mt-3 text-sm text-[#768078]">{prefs.inAppEnabled ? "No notifications yet." : "In-app notifications are turned off."}</p></div>}</div>
    </div> : null}
  </div>;
}
