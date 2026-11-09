import { useMemo, useState } from "react";
import { Bell, CheckCheck, Info, LoaderCircle, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { unreadNotificationCount } from "@/lib/notifications";
import { toast } from "sonner";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const utils = trpc.useUtils();
  const notifications = trpc.stillpoint.notifications.list.useQuery(undefined, { retry: false, refetchOnWindowFocus: true });
  const preferences = trpc.stillpoint.notifications.preferences.useQuery(undefined, { retry: false });
  const rows = notifications.data ?? [];
  const unread = unreadNotificationCount(rows);
  const prefs = preferences.data;
  const markRead = trpc.stillpoint.notifications.markAllRead.useMutation({
    onSuccess: async () => { await utils.stillpoint.notifications.list.invalidate(); },
    onError: async (error) => { toast.error(error.message || "Notifications could not be marked read."); await utils.stillpoint.notifications.list.invalidate(); },
  });
  const dismiss = trpc.stillpoint.notifications.dismiss.useMutation({
    onSuccess: async () => { await utils.stillpoint.notifications.list.invalidate(); },
    onError: async (error) => { toast.error(error.message || "This notification could not be dismissed."); await utils.stillpoint.notifications.list.invalidate(); },
  });
  const savePreferences = trpc.stillpoint.notifications.savePreferences.useMutation({
    onSuccess: async (result) => {
      utils.stillpoint.notifications.preferences.setData(undefined, result);
      await utils.stillpoint.notifications.list.invalidate();
      toast.success(result.inAppEnabled ? "In-app alerts are on." : "In-app alerts are off.");
    },
    onError: (error) => toast.error(error.message || "Your notification preference was not saved."),
  });
  const unreadLabel = useMemo(() => unread > 99 ? "99+ unread" : `${unread} unread`, [unread]);

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="icon" aria-label={`Notifications${unread ? `, ${unreadLabel}` : ", none unread"}`} aria-haspopup="dialog" aria-expanded={open} className="relative min-h-11 min-w-11 rounded-xl border-[#d8d2c6] bg-[#fffdfa] text-[#34483e] hover:bg-[#f5f1e8] focus-visible:ring-[#587365]">
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 ? <span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9a7257] px-1 text-[10px] font-bold leading-none text-white">{unread > 99 ? "99+" : unread}</span> : null}
      </Button>
    </PopoverTrigger>
    <PopoverContent role="dialog" aria-label="Notifications" align="end" sideOffset={10} className="w-[calc(100vw-2rem)] max-w-md overflow-hidden rounded-2xl border-[#e6e0d5] bg-[#fffdfa] p-0 text-[#34483e] shadow-[0_24px_80px_rgba(24,45,35,0.2)]">
      <div className="flex items-center justify-between gap-3 border-b border-[#eee9df] px-4 py-4 sm:px-5">
        <div><p className="font-serif text-xl text-[#173d35]">Your notifications</p><p className="mt-1 text-xs text-[#536057]">{unreadLabel}</p></div>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label="Notification settings" aria-expanded={showPreferences} onClick={() => setShowPreferences((value) => !value)} className="min-h-11 min-w-11 rounded-xl text-[#536057] hover:bg-[#f5f1e8]"><Settings2 aria-hidden="true" className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Mark all notifications as read" onClick={() => markRead.mutate()} disabled={unread === 0 || markRead.isPending || notifications.isLoading} className="min-h-11 min-w-11 rounded-xl text-[#536057] hover:bg-[#f5f1e8]"><CheckCheck aria-hidden="true" className="h-4 w-4" /></Button>
        </div>
      </div>
      {showPreferences ? <div className="space-y-3 border-b border-[#eee9df] bg-[#faf7f0] px-4 py-4 sm:px-5"><div><p className="text-sm font-semibold text-[#34483e]">Delivery preferences</p><p className="mt-1 text-xs leading-5 text-[#536057]">Choose which notices appear in this app. Email delivery is not connected in this prototype.</p></div>{preferences.isError ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 text-sm text-[#774b35]"><span>Preference could not be loaded.</span><Button type="button" variant="outline" size="sm" onClick={() => preferences.refetch()} className="min-h-10 border-[#c9b7aa]">Retry</Button></div> : preferences.isLoading || !prefs ? <p role="status" className="text-sm text-[#536057]">Loading saved preferences…</p> : <><label htmlFor="in-app-alerts" className="flex min-h-11 cursor-pointer items-center justify-between gap-4 text-sm text-[#34483e]"><span>In-app alerts</span><Switch id="in-app-alerts" checked={prefs.inAppEnabled} disabled={savePreferences.isPending} onCheckedChange={(checked) => savePreferences.mutate({ inAppEnabled: checked })} aria-label="In-app alerts" /></label><p className="text-xs text-[#536057]">Email alerts <span className="ml-1 inline-flex rounded-full bg-[#eee9df] px-2 py-0.5 font-medium text-[#536057]">Not available in demo</span></p></>}</div> : null}
      <div className="max-h-[min(60vh,480px)] overflow-y-auto" aria-live="polite" aria-busy={notifications.isLoading}>
        {notifications.isLoading ? <div role="status" className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-[#536057]"><LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />Loading notifications…</div>
          : notifications.isError ? <div className="px-5 py-8 text-center"><p role="alert" className="text-sm text-[#774b35]">Notifications are temporarily unavailable.</p><Button type="button" variant="outline" onClick={() => notifications.refetch()} className="mt-3 min-h-11 border-[#c9b7aa] text-[#774b35]">Retry</Button></div>
            : rows.length ? <ul className="divide-y divide-[#f1ece4]">{rows.map((notification) => <li key={notification.id} className={`flex gap-3 px-4 py-4 sm:px-5 ${notification.read ? "bg-white" : "bg-[#fffaf5]"}`}><span aria-hidden="true" className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.tone === "success" ? "bg-[#edf5ef] text-[#315d49]" : notification.tone === "warning" ? "bg-[#fff4ed] text-[#774b35]" : "bg-[#eef3f5] text-[#445a66]"}`}><Info className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="break-words text-sm font-semibold text-[#34483e]">{notification.title}</p><Button type="button" variant="ghost" size="icon" aria-label={`Dismiss ${notification.title}`} onClick={() => dismiss.mutate({ id: notification.id })} disabled={dismiss.isPending} className="-mr-2 -mt-2 min-h-11 min-w-11 shrink-0 rounded-xl text-[#536057] hover:bg-[#f4f1ea]"><X aria-hidden="true" className="h-4 w-4" /></Button></div><p className="mt-1 break-words text-sm leading-5 text-[#46564d]">{notification.message}</p><p className="mt-2 text-xs text-[#58645b]">{new Date(notification.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p></div></li>)}</ul>
              : <div className="px-5 py-10 text-center"><Bell aria-hidden="true" className="mx-auto h-6 w-6 text-[#825c43]" /><p className="mt-3 text-sm text-[#46564d]">{prefs?.inAppEnabled === false ? "In-app notifications are turned off." : "No notifications yet."}</p></div>}
      </div>
    </PopoverContent>
  </Popover>;
}
