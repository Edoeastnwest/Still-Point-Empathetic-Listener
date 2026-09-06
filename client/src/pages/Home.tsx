import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CalendarDays, Check, Clock3, HeartHandshake, LockKeyhole, LogOut, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { canAccessDashboard, canStartEnrollment, formatDuration, formatSessionTime, getDemoStorageKey, hasReservationConflict, isReservationAllowed, type DemoReservation } from "@/lib/scheduling";
import NotificationCenter from "@/components/NotificationCenter";
import { addNotification, createNotification } from "@/lib/notifications";

const STORAGE_KEY = "empathetic-listening-demo";

function loadDemoState(storageKey = STORAGE_KEY): { enrolled: boolean; reservations: DemoReservation[] } {
  try {
    const saved = window.localStorage.getItem(storageKey);
    const parsed = saved ? JSON.parse(saved) : { enrolled: false, reservations: [] };
    return {
      enrolled: Boolean(parsed.enrolled),
      reservations: (parsed.reservations ?? []).map((reservation: DemoReservation) => ({
        ...reservation,
        createdAt: reservation.createdAt ?? new Date().toISOString(),
      })),
    };
  } catch {
    return { enrolled: false, reservations: [] };
  }
}

function saveDemoState(state: { enrolled: boolean; reservations: DemoReservation[] }, storageKey = STORAGE_KEY) {
  window.localStorage.setItem(storageKey, JSON.stringify(state));
}

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#173d35] text-[#f6f1e8] shadow-[0_8px_24px_rgba(23,61,53,0.18)]">
        <HeartHandshake className="h-5 w-5" strokeWidth={1.8} />
      </div>
      <div>
        <p className="font-serif text-lg font-semibold leading-none tracking-tight text-[#173d35]">Stillpoint</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#8a9289]">Empathetic listening</p>
      </div>
    </div>
  );
}

function TopBar({ onSignOut, isAuthenticated, notificationKey }: { onSignOut: () => void; isAuthenticated: boolean; notificationKey: string }) {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
      <BrandMark />
      <div className="flex items-center gap-3">
        {isAuthenticated ? <NotificationCenter storageKey={notificationKey} /> : null}
        <Badge className="hidden border-[#d8e4dd] bg-[#f0f6f1] px-3 py-1.5 text-[#3c6b5b] sm:inline-flex">Demo environment</Badge>
        {isAuthenticated ? (
          <Button variant="ghost" size="sm" onClick={onSignOut} className="text-[#6e756f] hover:bg-[#f4f1ea] hover:text-[#173d35]">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function Onboarding({ onEnrolled, onSignIn, isAuthenticated, storageKey, notificationKey }: { onEnrolled: () => void; onSignIn: () => void; isAuthenticated: boolean; storageKey: string; notificationKey: string }) {
  const [accepted, setAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);

  const enroll = () => {
    if (!isAuthenticated) {
      toast.error("Please sign in before starting demo enrollment.");
      onSignIn();
      return;
    }
    if (!canStartEnrollment(isAuthenticated, accepted)) {
      toast.error(isAuthenticated ? "Please acknowledge the demo enrollment terms to continue." : "Please sign in before starting demo enrollment.");
      return;
    }
    setProcessing(true);
    window.setTimeout(() => {
      saveDemoState({ enrolled: true, reservations: [] }, storageKey);
      addNotification(notificationKey, createNotification({ tone: "success", title: "Enrollment payment recorded", message: "Your one-time $9.99 demo enrollment payment was recorded. Paid transactions are final." }));
      addNotification(notificationKey, createNotification({ tone: "success", title: "Welcome to Stillpoint", message: "Your demo enrollment is active. Your private listening dashboard is ready." }));
      setProcessing(false);
      toast.success("Demo enrollment confirmed. Welcome to Stillpoint.");
      onEnrolled();
    }, 650);
  };

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-12 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-20 lg:pt-12">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#173d35] px-7 py-10 text-[#f6f1e8] shadow-[0_24px_80px_rgba(23,61,53,0.18)] sm:px-12 sm:py-14">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#8ba99b]/20" />
        <div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#8ba99b]/15" />
        <div className="relative max-w-xl">
          <Badge className="mb-8 border-[#7da796]/30 bg-[#31594f] text-[#dcebe1]">A quieter place to land</Badge>
          <h1 className="max-w-lg font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl">Make room for what you’re carrying.</h1>
          <p className="mt-7 max-w-md text-base leading-7 text-[#c7d8ce] sm:text-lg">Reserve a gentle, focused listening session with a trained empathetic listener. No fixing. No performing. Just a little more space to be heard.</p>
          <div className="mt-12 grid gap-5 border-t border-[#aac1b5]/20 pt-7 text-sm text-[#c7d8ce] sm:grid-cols-2">
            <div className="flex gap-3"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#b8d6c5]" /><span>30-minute sessions, reserved in private units.</span></div>
            <div className="flex gap-3"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#b8d6c5]" /><span>Your profile and reservations stay yours.</span></div>
          </div>
        </div>
      </section>

      <section className="max-w-md lg:justify-self-end">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a7257]">Client enrollment</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight text-[#173d35]">Begin gently.</h2>
          <p className="mt-3 leading-6 text-[#68716b]">Create your demo client profile in under a minute, then you’ll go straight to your private dashboard.</p>
        </div>

        <Card className="border-[#e8e2d7] bg-white/80 shadow-[0_20px_60px_rgba(67,73,63,0.08)] backdrop-blur">
          <CardHeader className="pb-4">
            <div className="mb-3 flex items-center justify-between"><CardTitle className="font-serif text-2xl text-[#173d35]">One-time enrollment</CardTitle><span className="font-serif text-2xl text-[#173d35]">$9.99</span></div>
            <CardDescription className="leading-6 text-[#768078]">A sandbox payment step for this prototype. No live card is charged.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 rounded-2xl bg-[#faf7f0] p-4 text-sm leading-6 text-[#656e67]">
              <div className="flex gap-3"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-[#4e866f]" /><p><strong className="font-semibold text-[#34483e]">Demo-only enrollment.</strong> This flow is for product exploration and verification design.</p></div>
              <div className="flex gap-3"><Check className="mt-1 h-4 w-4 shrink-0 text-[#4e866f]" /><p>The $9.99 one-time enrollment fee is <strong className="font-semibold text-[#34483e]">nonrefundable</strong>.</p></div>
            </div>
            <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-5 text-[#68716b]">
              <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} className="mt-1 h-4 w-4 accent-[#173d35]" />
              <span>I understand this is a demo enrollment and the one-time $9.99 fee is nonrefundable.</span>
            </label>
            <Button onClick={enroll} disabled={processing} className="mt-6 h-12 w-full rounded-xl bg-[#173d35] text-base text-white shadow-[0_12px_24px_rgba(23,61,53,0.18)] hover:bg-[#28574b]">{processing ? "Confirming demo enrollment…" : "Confirm demo enrollment"}</Button>
            {!isAuthenticated ? <Button variant="ghost" onClick={onSignIn} className="mt-2 w-full text-[#68716b] hover:bg-[#f4f1ea] hover:text-[#173d35]">Already have an account? Sign in</Button> : null}
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs leading-5 text-[#929990]">By continuing, you’re exploring a prototype experience rather than purchasing a live service.</p>
      </section>
    </main>
  );
}

function Dashboard({ onSignOut, storageKey, notificationKey }: { onSignOut: () => void; storageKey: string; notificationKey: string }) {
  const [state, setState] = useState<{ enrolled: boolean; reservations: DemoReservation[] }>(() => loadDemoState(storageKey));
  const [units, setUnits] = useState(1);
  const [date, setDate] = useState(() => {
    const next = new Date(Date.now() + 60 * 60 * 1000);
    next.setMinutes(Math.ceil(next.getMinutes() / 30) * 30, 0, 0);
    return next.toISOString().slice(0, 16);
  });

  const nextReservation = state.reservations[0];
  const selectedStart = useMemo(() => new Date(date), [date]);
  const canBook = useMemo(() => isReservationAllowed(state.reservations, selectedStart, units), [selectedStart, state.reservations, units]);
  const hasBookingWindowLock = state.reservations.some((reservation) => (Date.now() - new Date(reservation.createdAt).getTime()) < 12 * 60 * 60 * 1000);
  const selectedTimeTaken = hasReservationConflict(state.reservations, selectedStart);
  const book = () => {
    if (!canBook) {
      toast.error(selectedTimeTaken ? "That session time is already reserved." : state.reservations.length ? "You already have a reservation within the 12-hour booking window." : "Choose a future time and between 1 and 4 units.");
      return;
    }
      const reservation = { id: crypto.randomUUID(), startsAt: new Date(date).toISOString(), createdAt: new Date().toISOString(), units };
    const next = { ...state, reservations: [reservation, ...state.reservations] };
    setState(next);
    saveDemoState(next, storageKey);
    addNotification(notificationKey, createNotification({ tone: "success", title: "Session reserved", message: `Your ${formatDuration(units)} listening session request has been recorded.` }));
    toast.success("Your listening session is reserved.");
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 pb-16 sm:px-8">
      <div className="flex flex-col gap-6 border-b border-[#e6e0d5] pb-8 pt-5 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a7257]">Your private space</p><h1 className="mt-3 font-serif text-5xl tracking-tight text-[#173d35]">Welcome back.</h1><p className="mt-3 text-[#68716b]">A little room to check in, reserve time, and arrive as you are.</p></div>
        <Badge className="w-fit border-[#cfe1d5] bg-[#f0f6f1] px-3 py-1.5 text-[#3c6b5b]"><span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#4e866f]" /> Enrollment active</Badge>
      </div>

      <div className="grid gap-6 pt-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card className="border-[#e8e2d7] bg-[#173d35] text-[#f6f1e8] shadow-[0_20px_60px_rgba(23,61,53,0.14)]"><CardContent className="p-7"><div className="flex items-start justify-between"><div><p className="text-sm text-[#bad0c2]">Enrollment status</p><h2 className="mt-2 font-serif text-3xl">Ready when you are.</h2></div><Sparkles className="h-5 w-5 text-[#b8d6c5]" /></div><div className="mt-8 flex items-end justify-between border-t border-[#aac1b5]/20 pt-5"><span className="text-sm text-[#bad0c2]">One-time enrollment</span><span className="font-serif text-2xl">$9.99</span></div><p className="mt-4 text-xs leading-5 text-[#bad0c2]">Demo-only • Nonrefundable enrollment fee</p></CardContent></Card>
          <Card className="border-[#e8e2d7] bg-white/75 shadow-[0_16px_50px_rgba(67,73,63,0.06)]"><CardHeader><CardTitle className="font-serif text-2xl text-[#173d35]">Your next session</CardTitle><CardDescription>Keep this time just for you.</CardDescription></CardHeader><CardContent>{nextReservation ? <div className="rounded-2xl bg-[#faf7f0] p-5"><div className="flex items-center gap-3 text-[#4e866f]"><CalendarDays className="h-5 w-5" /><span className="text-sm font-semibold">Reserved</span></div><p className="mt-4 font-serif text-2xl text-[#173d35]">{formatSessionTime(nextReservation.startsAt)}</p><p className="mt-2 text-sm text-[#768078]">{formatDuration(nextReservation.units)} of quiet listening time</p></div> : <div className="rounded-2xl border border-dashed border-[#d8d2c6] p-5 text-sm leading-6 text-[#768078]">No sessions reserved yet. When you’re ready, choose a time to begin.</div>}</CardContent></Card>
        </div>

        <Card className="border-[#e8e2d7] bg-white/80 shadow-[0_20px_60px_rgba(67,73,63,0.06)]"><CardHeader className="border-b border-[#eee9df] pb-5"><div className="flex items-start justify-between"><div><CardTitle className="font-serif text-3xl text-[#173d35]">Reserve a listening session</CardTitle><CardDescription className="mt-2 max-w-lg leading-6">Choose one to four 30-minute units. For this demo, you can make one reservation in each rolling 12-hour period.</CardDescription></div><UsersRound className="hidden h-6 w-6 text-[#9a7257] sm:block" /></div></CardHeader><CardContent className="space-y-6 pt-6"><div className="grid gap-5 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="session-date" className="text-[#46564d]">Start time</Label><Input id="session-date" type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="h-12 rounded-xl border-[#ded8cd] bg-[#fcfaf6] focus-visible:ring-[#739b86]" /><p className={`text-xs ${selectedTimeTaken ? "text-[#9a7257]" : "text-[#6b8b79]"}`}>{selectedTimeTaken ? "Unavailable · already reserved" : "Available · private slot"}</p></div><div className="space-y-2"><Label htmlFor="session-units" className="text-[#46564d]">Session length</Label><select id="session-units" value={units} onChange={(event) => setUnits(Number(event.target.value))} className="h-12 w-full rounded-xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm text-[#34483e] outline-none focus:ring-2 focus:ring-[#739b86]">{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} unit{value > 1 ? "s" : ""} · {formatDuration(value)}</option>)}</select></div></div><div className={`flex items-start gap-3 rounded-2xl p-4 text-sm leading-6 ${hasBookingWindowLock ? "bg-[#fff4ed] text-[#8a5d46]" : "bg-[#f0f6f1] text-[#587365]"}`}><Clock3 className={`mt-1 h-4 w-4 shrink-0 ${hasBookingWindowLock ? "text-[#9a7257]" : "text-[#4e866f]"}`} /><p>{hasBookingWindowLock ? "A reservation is already active in your 12-hour window. New times will unlock automatically when the window resets." : "Each unit is 30 minutes. You can reserve one session in each rolling 12-hour period."}</p></div><Button onClick={book} disabled={hasBookingWindowLock} className="h-12 w-full rounded-xl bg-[#9a7257] text-white shadow-[0_10px_22px_rgba(154,114,87,0.18)] hover:bg-[#815b45]">Reserve {formatDuration(units)}</Button></CardContent></Card>
      </div>

      <section className="mt-10"><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#9a7257]">Reservation history</p><h2 className="mt-2 font-serif text-3xl text-[#173d35]">Upcoming sessions</h2></div><span className="text-sm text-[#929990]">{state.reservations.length} reserved</span></div>{state.reservations.length ? <div className="space-y-3">{state.reservations.map((reservation) => <div key={reservation.id} className="flex flex-col gap-3 rounded-2xl border border-[#e8e2d7] bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5eee7] text-[#9a7257]"><CalendarDays className="h-5 w-5" /></div><div><p className="font-medium text-[#34483e]">{formatSessionTime(reservation.startsAt)}</p><p className="mt-1 text-sm text-[#8a9289]">{formatDuration(reservation.units)} • empathetic listening</p></div></div><Badge className="w-fit border-[#cfe1d5] bg-[#f0f6f1] text-[#3c6b5b]">Confirmed</Badge></div>)}</div> : <div className="rounded-2xl border border-dashed border-[#d8d2c6] bg-white/50 p-8 text-center text-sm text-[#768078]">Your upcoming reservations will appear here.</div>}</section>
    </main>
  );
}

export default function Home() {
  const { user, logout, isAuthenticated } = useAuth();
  const storageKey = getDemoStorageKey(user?.openId ?? user?.email ?? undefined);
  const [enrolled, setEnrolled] = useState(() => loadDemoState(storageKey).enrolled);
  useEffect(() => {
    setEnrolled(loadDemoState(storageKey).enrolled);
  }, [storageKey]);
  const signIn = () => startLogin();
  const notificationKey = `${storageKey}-updates`;
  return <div className="min-h-screen bg-[#f7f4ed] text-[#173d35]"><TopBar onSignOut={logout} isAuthenticated={isAuthenticated} notificationKey={notificationKey} />{canAccessDashboard(isAuthenticated, enrolled) ? <Dashboard onSignOut={logout} storageKey={storageKey} notificationKey={notificationKey} /> : <Onboarding onEnrolled={() => setEnrolled(true)} onSignIn={signIn} isAuthenticated={isAuthenticated} storageKey={storageKey} notificationKey={notificationKey} />}<footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 border-t border-[#e6e0d5] px-5 py-6 text-xs leading-5 text-[#929990] sm:flex-row sm:items-center sm:justify-between sm:px-8"><span>Stillpoint · empathetic listening prototype</span><span>{user?.email ? `Signed in as ${user.email}` : "Demo access · no live payment processing"}</span></footer></div>;
}
