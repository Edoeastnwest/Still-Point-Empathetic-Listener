import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, CreditCard, HeartHandshake, Inbox, RefreshCw } from "lucide-react";
import { useState } from "react";
import { formatDuration, formatSessionTime, type DemoBookingNotification } from "@/lib/scheduling";

const NOTIFICATIONS_KEY = "stillpoint-admin-notifications";

function loadNotifications(): DemoBookingNotification[] {
  try {
    return JSON.parse(window.localStorage.getItem(NOTIFICATIONS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function AdminInbox() {
  const [notifications, setNotifications] = useState<DemoBookingNotification[]>(() => loadNotifications());
  const refresh = () => setNotifications(loadNotifications());

  return (
    <div className="min-h-screen bg-[#f7f4ed] text-[#173d35]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173d35] text-[#f6f1e8]"><HeartHandshake className="h-5 w-5" /></div><div><p className="font-serif text-lg font-semibold">Stillpoint</p><p className="text-[10px] uppercase tracking-[0.22em] text-[#8a9289]">Admin portal</p></div></div>
        <Button variant="outline" onClick={refresh} className="border-[#d8d2c6] bg-white/60 text-[#526258] hover:bg-white"><RefreshCw className="mr-2 h-4 w-4" /> Refresh inbox</Button>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 sm:px-8">
        <div className="border-b border-[#e6e0d5] pb-8 pt-6"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a7257]">Operations</p><h1 className="mt-3 font-serif text-5xl tracking-tight">Booking requests</h1><p className="mt-3 max-w-2xl leading-6 text-[#68716b]">Every paid booking request appears here with the client details, requested time, unit count, payment reference, and final transaction amount.</p></div>
        <div className="mt-8 space-y-4">{notifications.length ? notifications.map((notification) => <Card key={notification.id} className="border-[#e8e2d7] bg-white/80 shadow-[0_14px_40px_rgba(67,73,63,0.06)]"><CardHeader className="flex flex-row items-start justify-between gap-4"><div><div className="flex items-center gap-2"><CardTitle className="font-serif text-2xl text-[#173d35]">{notification.clientName || "Unnamed client"}</CardTitle><Badge className="border-[#cfe1d5] bg-[#f0f6f1] text-[#3c6b5b]">Paid request</Badge></div><CardDescription className="mt-2">{notification.clientEmail || "No email supplied"} · requested {new Date(notification.createdAt).toLocaleString()}</CardDescription></div><span className="font-serif text-2xl text-[#173d35]">${notification.amount.toFixed(2)}</span></CardHeader><CardContent className="grid gap-4 border-t border-[#eee9df] pt-5 sm:grid-cols-3"><div className="flex gap-3"><CalendarDays className="mt-0.5 h-4 w-4 text-[#9a7257]" /><div><p className="text-xs uppercase tracking-[0.15em] text-[#929990]">Session</p><p className="mt-1 text-sm font-medium text-[#34483e]">{formatSessionTime(notification.startsAt)}</p><p className="mt-1 text-sm text-[#768078]">{formatDuration(notification.units)}</p></div></div><div className="flex gap-3"><CreditCard className="mt-0.5 h-4 w-4 text-[#9a7257]" /><div><p className="text-xs uppercase tracking-[0.15em] text-[#929990]">Payment</p><p className="mt-1 text-sm font-medium text-[#34483e]">{notification.paymentId}</p><p className="mt-1 text-sm text-[#768078]">Final · no returns</p></div></div><div><p className="text-xs uppercase tracking-[0.15em] text-[#929990]">Collected details</p><p className="mt-1 text-sm text-[#768078]">Client identity, email, selected time, units, and amount are attached to this request.</p></div></CardContent></Card>) : <Card className="border-dashed border-[#d8d2c6] bg-white/60"><CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center"><Inbox className="h-8 w-8 text-[#9a7257]" /><h2 className="mt-4 font-serif text-2xl text-[#173d35]">No paid requests yet</h2><p className="mt-2 max-w-md text-sm leading-6 text-[#768078]">When a client completes payment and submits a booking request, the full request will appear in this inbox.</p></CardContent></Card>}</div>
      </main>
    </div>
  );
}
