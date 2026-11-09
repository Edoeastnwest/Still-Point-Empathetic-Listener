import { useCallback, useMemo, useState } from "react";
import { CalendarDays, Check, Clock3, HeartHandshake, LockKeyhole, LogOut, ShieldCheck, Sparkles, UsersRound, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StillpointShell from "@/components/StillpointShell";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { calculateBookingTotalCents, formatDuration, formatMoney, formatSessionTime, nextLocalSlot, UNIT_FEE_CENTS, UNIT_PRICE_CENTS } from "@/lib/scheduling";
import type { RouterOutputs } from "@/lib/trpc-types";
import { toast } from "sonner";

type DashboardData = RouterOutputs["stillpoint"]["profile"]["dashboard"];
type Reservation = DashboardData["reservations"][number];
type HistoryFilter = "upcoming" | "past" | "all";

const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

function BrandHero() {
  return <section aria-labelledby="welcome-heading" className="relative overflow-hidden rounded-[2rem] bg-[#173d35] px-7 py-10 text-[#f6f1e8] shadow-[0_24px_80px_rgba(23,61,53,0.18)] sm:px-12 sm:py-14">
    <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full border border-[#8ba99b]/20" />
    <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full border border-[#8ba99b]/15" />
    <div className="relative max-w-2xl">
      <Badge className="mb-7 border-[#7da796]/30 bg-[#31594f] text-[#e2eee6]">A quieter place to land</Badge>
      <h1 id="welcome-heading" className="max-w-lg font-serif text-5xl leading-[0.98] tracking-tight sm:text-7xl">Make room for what you’re carrying.</h1>
      <p className="mt-7 max-w-xl text-base leading-7 text-[#d8e5dc] sm:text-lg">Reserve a gentle, focused listening session with a trained empathetic listener. No fixing. No performing. Just a little more space to be heard.</p>
      <div className="mt-10 grid gap-5 border-t border-[#aac1b5]/25 pt-6 text-sm text-[#d8e5dc] sm:grid-cols-2">
        <div className="flex gap-3"><Clock3 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c7ddcf]" /><span>30-minute sessions, reserved in private units.</span></div>
        <div className="flex gap-3"><LockKeyhole aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[#c7ddcf]" /><span>Your profile and reservations stay yours.</span></div>
      </div>
    </div>
  </section>;
}

function Onboarding({ isAuthenticated }: { isAuthenticated: boolean }) {
  const utils = trpc.useUtils();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const enroll = trpc.stillpoint.profile.enroll.useMutation({
    onSuccess: async ({ created }) => {
      setIdempotencyKey(crypto.randomUUID());
      await utils.stillpoint.profile.dashboard.invalidate();
      await utils.stillpoint.notifications.list.invalidate();
      toast.success(created ? "Demo enrollment is active. Your dashboard is ready." : "Your enrollment is already active.");
    },
    onError: (error) => toast.error(error.message || "Enrollment could not be completed. Please retry."),
  });
  const beginEnrollment = () => {
    if (!isAuthenticated) { startLogin(); return; }
    if (!termsAccepted) { toast.error("Please acknowledge the demo enrollment terms to continue."); return; }
    enroll.mutate({ termsAccepted: true, demoPaymentConfirmed: true, idempotencyKey });
  };

  return <main id="main-content" tabIndex={-1} className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pb-12 pt-5 sm:px-8 sm:pb-16 sm:pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-16">
    <BrandHero />
    <section aria-labelledby="enrollment-heading" className="w-full max-w-md lg:justify-self-end">
      <div className="mb-7"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#825c43]">Client enrollment</p><h2 id="enrollment-heading" className="mt-3 font-serif text-4xl tracking-tight text-[#173d35]">Begin gently.</h2><p className="mt-3 leading-6 text-[#536057]">Create your demo client profile, then go straight to your private dashboard.</p></div>
      <Card className="border-[#e8e2d7] bg-white/90 shadow-[0_20px_60px_rgba(67,73,63,0.08)]">
        <CardHeader className="pb-4"><div className="mb-3 flex items-center justify-between gap-3"><CardTitle className="font-serif text-2xl text-[#173d35]">One-time enrollment</CardTitle><span className="font-serif text-2xl text-[#173d35]">$9.99</span></div><CardDescription className="leading-6 text-[#536057]">Demo-only confirmation. No live card is charged or saved.</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-3 rounded-2xl bg-[#faf7f0] p-4 text-sm leading-6 text-[#46564d]"><div className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#3b745d]" /><p><strong className="font-semibold text-[#34483e]">Prototype only.</strong> This step records a simulated enrollment event.</p></div><div className="flex gap-3"><Check aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#3b745d]" /><p>The displayed one-time $9.99 enrollment fee is marked nonrefundable for demo-flow testing; there is no live payment.</p></div></div>
          <label className="mt-5 flex min-h-11 cursor-pointer items-start gap-3 rounded-lg text-sm leading-5 text-[#46564d]"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#173d35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#587365]" /><span>I understand this is a demo enrollment and acknowledge the fee terms.</span></label>
          <Button onClick={beginEnrollment} disabled={enroll.isPending} className="mt-4 min-h-12 w-full rounded-xl bg-[#173d35] text-base text-white shadow-[0_12px_24px_rgba(23,61,53,0.18)] hover:bg-[#28574b]">{enroll.isPending ? "Recording demo enrollment…" : isAuthenticated ? "Confirm demo enrollment" : "Sign in to begin"}</Button>
          {enroll.isError ? <p role="alert" className="mt-3 text-sm text-[#8a5d46]">{enroll.error.message} The enrollment can be safely retried.</p> : null}
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs leading-5 text-[#58645b]">This prototype does not accept card details or process live payments.</p>
    </section>
  </main>;
}

function BookingCard({
  data,
  reservations,
  onRefresh,
}: {
  data: DashboardData;
  reservations: Reservation[];
  onRefresh: () => Promise<unknown>;
}) {
  const utils = trpc.useUtils();
  const [units, setUnits] = useState(1);
  const [startLocal, setStartLocal] = useState(() => nextLocalSlot());
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [cancelReservation, setCancelReservation] = useState<Reservation | null>(null);
  const startsAt = useMemo(() => {
    if (!startLocal) return null;
    const parsed = new Date(startLocal);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }, [startLocal]);
  const startsAtIso = startsAt?.toISOString() ?? "";
  const localStart = startLocal;
  const amountCents = calculateBookingTotalCents(units) ?? 0;
  const availability = trpc.stillpoint.booking.availability.useQuery({
    startsAt: startsAtIso || new Date(0).toISOString(),
    localStart: localStart || "1970-01-01T00:00",
    timeZone,
    units,
  }, {
    enabled: Boolean(data.enrolled && startsAt && startLocal),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });
  const resetConfirmation = () => {
    setPaymentConfirmed(false);
    setIdempotencyKey(crypto.randomUUID());
  };
  const booking = trpc.stillpoint.booking.create.useMutation({
    onSuccess: async (result) => {
      setPaymentConfirmed(false);
      setIdempotencyKey(crypto.randomUUID());
      await Promise.all([utils.stillpoint.profile.dashboard.invalidate(), utils.stillpoint.notifications.list.invalidate(), availability.refetch()]);
      toast.success(result.created ? `Session request recorded · ${formatMoney(result.amountCents)} simulated demo payment.` : "Your booking request was already recorded.");
    },
    onError: async (error) => {
      toast.error(error.message || "Booking could not be submitted. Your demo confirmation remains available for a safe retry.");
      await availability.refetch();
    },
  });
  const cancellation = trpc.stillpoint.booking.cancel.useMutation({
    onSuccess: async ({ changed, deliveredInApp }) => {
      setCancelReservation(null);
      await Promise.all([utils.stillpoint.profile.dashboard.invalidate(), utils.stillpoint.notifications.list.invalidate(), availability.refetch()]);
      toast.success(changed ? deliveredInApp ? "Session cancelled. A notice was added to your inbox." : "Session cancelled. In-app notices are turned off." : "This session was already cancelled.");
    },
    onError: (error) => toast.error(error.message || "This session could not be cancelled."),
  });
  const windowEnd = useMemo(() => {
    const eligible = reservations.reduce<number | null>((latest, reservation) => {
      const created = new Date(reservation.createdAt).getTime();
      return latest === null || created > latest ? created : latest;
    }, null);
    return eligible === null ? null : eligible + 12 * 60 * 60 * 1000;
  }, [reservations]);
  const bookingLocked = windowEnd !== null && windowEnd > Date.now();
  const unlockLabel = windowEnd ? new Date(windowEnd).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
  const availabilityMessage = availability.isLoading
    ? "Checking this time against all current requests…"
    : availability.isError
      ? "Availability could not be checked. Retry before confirming."
      : availability.data?.withinWindow
        ? `Your rolling 12-hour booking window is active${unlockLabel ? ` until ${unlockLabel}` : ""}.`
        : availability.data?.timeZoneValid === false
          ? "Choose a valid local time on the hour or half-hour."
          : availability.data?.conflict
            ? "This time overlaps an existing request or is in the past. Choose another slot."
            : availability.data?.available
              ? `Available · shown in ${timeZone}. Availability is rechecked when you submit.`
              : "Choose a future time to check availability.";
  const canConfirmDemoPayment = Boolean(availability.data?.available) && !availability.isFetching && !availability.isError && !bookingLocked;
  const visibleSessions = useMemo(() => [...reservations].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()), [reservations]);
  const upcoming = visibleSessions.filter((item) => (item.status === "requested" || item.status === "confirmed") && new Date(item.startsAt).getTime() >= Date.now());
  const nextSession = upcoming[0];
  const completedSessionCount = reservations.filter((item) => item.status === "completed").length;
  const updateDate = (value: string) => { setStartLocal(value); resetConfirmation(); };

  return <>
    <div className="grid gap-6 pt-8 lg:grid-cols-[0.78fr_1.22fr]">
      <div className="space-y-6">
        <Card className="border-[#e8e2d7] bg-[#173d35] text-[#f6f1e8] shadow-[0_20px_60px_rgba(23,61,53,0.14)]"><CardContent className="p-6 sm:p-7"><div className="flex items-start justify-between"><div><p className="text-sm text-[#d1e0d6]">Enrollment status</p><h2 className="mt-2 font-serif text-3xl">Ready when you are.</h2></div><Sparkles aria-hidden="true" className="h-5 w-5 text-[#d1e0d6]" /></div><div className="mt-7 flex items-end justify-between border-t border-[#aac1b5]/25 pt-5"><span className="text-sm text-[#d1e0d6]">One-time enrollment</span><span className="font-serif text-2xl">{formatMoney(data.enrollmentFeeCents)}</span></div><p className="mt-4 text-xs leading-5 text-[#d1e0d6]">Demo event recorded · no live charge · nonrefundable demo terms</p></CardContent></Card>
        <Card className="border-[#e8e2d7] bg-white/90 shadow-[0_16px_50px_rgba(67,73,63,0.06)]"><CardHeader><CardTitle className="font-serif text-2xl text-[#173d35]">Your next session</CardTitle><CardDescription className="text-[#536057]">A quick view of what is ahead.</CardDescription></CardHeader><CardContent>{nextSession ? <div className="rounded-2xl bg-[#faf7f0] p-5"><div className="flex items-center gap-3 text-[#315d49]"><CalendarDays aria-hidden="true" className="h-5 w-5" /><span className="text-sm font-semibold">{nextSession.status === "confirmed" ? "Confirmed" : "Request received"}</span></div><p className="mt-4 font-serif text-2xl text-[#173d35]">{formatSessionTime(nextSession.startsAt, nextSession.timeZone)}</p><p className="mt-2 text-sm text-[#536057]">{formatDuration(nextSession.units)} of listening time</p></div> : <div className="rounded-2xl border border-dashed border-[#c8c4b9] p-5 text-sm leading-6 text-[#536057]">No upcoming sessions yet. When you’re ready, choose a time to begin.</div>}<div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[#f7f4ed] p-3"><p className="text-xs text-[#536057]">Upcoming</p><p className="mt-1 text-xl font-semibold text-[#173d35]">{upcoming.length}</p></div><div className="rounded-xl bg-[#f7f4ed] p-3"><p className="text-xs text-[#536057]">Completed</p><p className="mt-1 text-xl font-semibold text-[#173d35]">{completedSessionCount}</p></div></div></CardContent></Card>
      </div>
      <Card className="border-[#e8e2d7] bg-white/95 shadow-[0_20px_60px_rgba(67,73,63,0.06)]"><CardHeader className="border-b border-[#eee9df] pb-5"><CardTitle className="font-serif text-3xl text-[#173d35]">Reserve a listening session</CardTitle><CardDescription className="mt-2 max-w-lg leading-6 text-[#536057]">Choose one to four 30-minute units. One request may be made in each rolling 12-hour period.</CardDescription></CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="session-date" className="text-[#34483e]">Start time <span className="text-[#536057]">({timeZone})</span></Label><Input id="session-date" type="datetime-local" min={nextLocalSlot()} step={1800} value={startLocal} onChange={(event) => updateDate(event.target.value)} aria-describedby="session-time-help" aria-invalid={Boolean(startsAt && startsAt.getTime() < Date.now())} className="min-h-12 rounded-xl border-[#ded8cd] bg-[#fcfaf6] text-[#34483e] focus-visible:ring-[#739b86]" /><p id="session-time-help" role={availability.isError || availability.data?.timeZoneValid === false ? "alert" : "status"} aria-live={availability.isError || availability.data?.timeZoneValid === false ? "assertive" : "polite"} className={`min-h-10 text-xs leading-5 ${availability.isError || availability.data?.conflict || availability.data?.withinWindow ? "text-[#8a5d46]" : "text-[#315d49]"}`}>{availabilityMessage}</p>{availability.isError ? <Button type="button" variant="outline" size="sm" onClick={() => availability.refetch()} className="min-h-10 border-[#bdc9c0] text-[#34483e]">Retry availability check</Button> : null}</div>
            <div className="space-y-2"><Label htmlFor="session-units" className="text-[#34483e]">Session length</Label><select id="session-units" value={units} onChange={(event) => { setUnits(Number(event.target.value)); resetConfirmation(); }} className="min-h-12 w-full rounded-xl border border-[#ded8cd] bg-[#fcfaf6] px-3 text-sm text-[#34483e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#587365]">{[1, 2, 3, 4].map((value) => <option key={value} value={value}>{value} unit{value > 1 ? "s" : ""} · {formatDuration(value)}</option>)}</select><p className="text-xs leading-5 text-[#536057]">Maximum 4 units (2 hours) per request.</p></div>
          </div>
          <div className="rounded-2xl bg-[#faf7f0] p-4 sm:p-5"><div className="flex justify-between gap-4 text-sm text-[#46564d]"><span>Listening time · {formatMoney(UNIT_PRICE_CENTS)} × {units}</span><span>{formatMoney(units * UNIT_PRICE_CENTS)}</span></div><div className="mt-2 flex justify-between gap-4 text-sm text-[#46564d]"><span>Per-30-minute-block fee · {formatMoney(UNIT_FEE_CENTS)} × {units}</span><span>{formatMoney(units * UNIT_FEE_CENTS)}</span></div><div className="mt-3 flex justify-between gap-4 border-t border-[#e8e2d7] pt-3 font-semibold text-[#173d35]"><span>Demo payment total</span><span>{formatMoney(amountCents)}</span></div><p className="mt-2 text-xs leading-5 text-[#536057]">Sandbox simulation only—no live card is charged or saved. Provider processing fees may vary in a future live service. Demo transactions are final and nonrefundable.</p></div>
          {bookingLocked ? <div className="flex items-start gap-3 rounded-2xl bg-[#fff4ed] p-4 text-sm leading-6 text-[#774b35]" role="status"><Clock3 aria-hidden="true" className="mt-1 h-4 w-4 shrink-0" /><p>Your rolling booking window is active. A cancelled request still counts toward the 12-hour limit; the next request is allowed after {unlockLabel}.</p></div> : null}
          {paymentConfirmed ? <div className="space-y-3" aria-live="polite"><div className="rounded-xl border border-[#b5d1c0] bg-[#edf5ef] px-4 py-3 text-sm text-[#315d49]"><p className="font-semibold">Simulated payment confirmed · {formatMoney(amountCents)}</p><p className="mt-1">{startsAt ? formatSessionTime(startsAt.toISOString(), timeZone) : "Choose a valid time"} · {formatDuration(units)} · no live payment occurred.</p></div><div className="grid gap-2 sm:grid-cols-2"><Button type="button" onClick={() => { setPaymentConfirmed(false); }} disabled={booking.isPending} variant="outline" className="min-h-12 border-[#bdc9c0] text-[#34483e]">Change selection</Button><Button type="button" onClick={() => booking.mutate({ startsAt: startsAtIso, localStart, timeZone, units, demoPaymentConfirmed: true, idempotencyKey })} disabled={booking.isPending || !canConfirmDemoPayment} className="min-h-12 rounded-xl bg-[#173d35] text-white hover:bg-[#28574b]">{booking.isPending ? "Submitting request…" : "Submit booking request"}</Button></div>{booking.isError ? <p role="alert" className="text-sm text-[#8a5d46]">{booking.error.message} Retry safely or change the slot.</p> : null}</div> : <Button type="button" onClick={() => { if (!canConfirmDemoPayment) return; setPaymentConfirmed(true); toast.success("Simulation confirmed. Your booking request has not been submitted yet."); }} disabled={!canConfirmDemoPayment} className="min-h-12 w-full rounded-xl bg-[#8a5d46] text-white shadow-[0_10px_22px_rgba(138,93,70,0.18)] hover:bg-[#815b45]">Confirm simulated payment · {formatMoney(amountCents)}</Button>}
          <p className="text-xs text-[#58645b]">Confirming the simulation does not create a booking. Submit the request in the next step to reserve the slot.</p>
        </CardContent>
      </Card>
    </div>

    <section aria-labelledby="sessions-heading" className="mt-10">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#825c43]">Your schedule</p><h2 id="sessions-heading" className="mt-2 font-serif text-3xl text-[#173d35]">Sessions</h2></div><p className="text-sm text-[#536057]" aria-live="polite">{upcoming.length} upcoming · {reservations.length} total records</p></div>
      <SessionHistory reservations={visibleSessions} onCancel={setCancelReservation} />
    </section>

    <AlertDialog open={Boolean(cancelReservation)} onOpenChange={(open) => { if (!open && !cancellation.isPending) setCancelReservation(null); }}>
      <AlertDialogContent className="border-[#e6e0d5] bg-[#fffdfa] text-[#173d35]">
        <AlertDialogHeader><AlertDialogTitle className="font-serif text-2xl">Cancel this session?</AlertDialogTitle><AlertDialogDescription className="text-[#536057]">{cancelReservation ? `${formatSessionTime(cancelReservation.startsAt, cancelReservation.timeZone)} · ${formatDuration(cancelReservation.units)}.` : ""} This frees the time for other clients, but your 12-hour booking limit still applies. The demo fee is not a live charge.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel disabled={cancellation.isPending} className="min-h-11 border-[#bdc9c0]">Keep session</AlertDialogCancel><AlertDialogAction disabled={cancellation.isPending || !cancelReservation} onClick={(event) => { event.preventDefault(); if (cancelReservation) cancellation.mutate({ reservationId: cancelReservation.id }); }} className="min-h-11 bg-[#8a5d46] text-white hover:bg-[#774b35]">{cancellation.isPending ? "Cancelling…" : "Confirm cancellation"}</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}

function SessionHistory({ reservations, onCancel }: { reservations: Reservation[]; onCancel: (reservation: Reservation) => void }) {
  const [filter, setFilter] = useState<HistoryFilter>("upcoming");
  const now = Date.now();
  const filtered = reservations.filter((reservation) => {
    const isUpcoming = (reservation.status === "requested" || reservation.status === "confirmed") && new Date(reservation.startsAt).getTime() >= now;
    if (filter === "upcoming") return isUpcoming;
    if (filter === "past") return !isUpcoming;
    return true;
  });
  return <Card className="border-[#e8e2d7] bg-white/90 shadow-[0_16px_45px_rgba(67,73,63,0.05)]"><CardContent className="p-4 sm:p-6"><div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter session history">{(["upcoming", "past", "all"] as const).map((value) => <Button key={value} type="button" size="sm" variant={filter === value ? "secondary" : "outline"} aria-pressed={filter === value} onClick={() => setFilter(value)} className={filter === value ? "min-h-10 bg-[#edf5ef] text-[#315d49]" : "min-h-10 border-[#d8d2c6] text-[#46564d]"}>{value === "upcoming" ? "Upcoming" : value === "past" ? "Past / cancelled" : "All sessions"}</Button>)}</div>
    {filtered.length ? <ul className="space-y-3">{filtered.map((reservation) => <li key={reservation.id} className="flex flex-col gap-4 rounded-2xl border border-[#e8e2d7] bg-[#fffdfa] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"><div className="flex min-w-0 items-start gap-4"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f5eee7] text-[#825c43]"><CalendarDays className="h-5 w-5" /></span><div className="min-w-0"><p className="font-medium text-[#34483e]">{formatSessionTime(reservation.startsAt, reservation.timeZone)}</p><p className="mt-1 text-sm text-[#536057]">{formatDuration(reservation.units)} · {formatMoney(reservation.amountCents)} simulated demo payment</p><p className="mt-1 text-xs text-[#58645b]">Requested {new Date(reservation.createdAt).toLocaleString()}</p></div></div><div className="flex flex-wrap items-center gap-2 sm:justify-end"><Badge className={reservation.status === "confirmed" ? "border-[#b5d1c0] bg-[#edf5ef] text-[#315d49]" : reservation.status === "cancelled" ? "border-[#e4c6b2] bg-[#fff4ed] text-[#774b35]" : reservation.status === "completed" ? "border-[#ccd3d9] bg-[#f0f3f5] text-[#445a66]" : "border-[#e0d5c9] bg-[#f7f1eb] text-[#714e3a]"}>{reservation.status === "requested" ? "Request received" : reservation.status}</Badge>{(reservation.status === "requested" || reservation.status === "confirmed") && new Date(reservation.startsAt).getTime() > Date.now() ? <Button type="button" variant="outline" size="sm" onClick={() => onCancel(reservation)} className="min-h-10 border-[#d9bba7] text-[#774b35] hover:bg-[#fff4ed]"><X aria-hidden="true" className="h-4 w-4" /><span>Cancel</span></Button> : null}</div></li>)}</ul> : <div className="rounded-2xl border border-dashed border-[#c8c4b9] p-9 text-center"><CalendarDays aria-hidden="true" className="mx-auto h-6 w-6 text-[#825c43]" /><p className="mt-3 font-medium text-[#34483e]">{filter === "upcoming" ? "No upcoming sessions" : "No sessions in this view"}</p><p className="mt-1 text-sm text-[#536057]">Your session requests and updates will appear here.</p></div>}
  </CardContent></Card>;
}

export default function Home() {
  const { user, logout, isAuthenticated, loading, error } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const dashboard = trpc.stillpoint.profile.dashboard.useQuery(undefined, { enabled: isAuthenticated, retry: false, refetchOnWindowFocus: true });
  const utils = trpc.useUtils();
  const signOut = useCallback(async () => {
    setIsSigningOut(true);
    try { await logout(); } catch (cause) { toast.error(cause instanceof Error ? cause.message : "Could not sign out. Please try again."); }
    finally { setIsSigningOut(false); }
  }, [logout]);
  if (loading) return <StillpointShell variant="client" isAuthenticated={false} isAdmin={false}><main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[40vh] w-full max-w-6xl flex-1 items-center justify-center px-4 text-[#536057]" role="status">Checking your private space…</main></StillpointShell>;
  if (error && !isAuthenticated) return <StillpointShell isAuthenticated={false} isAdmin={false}><main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[45vh] w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 text-center"><h1 className="font-serif text-3xl text-[#173d35]">Sign-in could not be checked</h1><p role="alert" className="max-w-md text-sm text-[#774b35]">Please retry. Your private data is not shown until the session is verified.</p><Button type="button" variant="outline" onClick={() => utils.auth.me.invalidate()} className="min-h-11 border-[#bdc9c0]">Retry sign-in check</Button></main></StillpointShell>;
  const common = { isAuthenticated, isAdmin: user?.role === "admin", isSigningOut, userName: user?.name, userEmail: user?.email, onSignOut: signOut };
  if (isAuthenticated && dashboard.isLoading) return <StillpointShell {...common}><main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[45vh] w-full max-w-6xl flex-1 items-center justify-center px-4 text-[#536057]" role="status">Opening your private dashboard…</main></StillpointShell>;
  if (isAuthenticated && dashboard.isError) return <StillpointShell {...common}><main id="main-content" tabIndex={-1} className="mx-auto flex min-h-[45vh] w-full max-w-6xl flex-1 flex-col items-center justify-center gap-3 px-4 text-center"><h1 className="font-serif text-3xl text-[#173d35]">Your dashboard could not be loaded</h1><p role="alert" className="max-w-lg text-sm text-[#774b35]">{dashboard.error.message || "Your profile is unchanged. Try reloading the dashboard."}</p><Button type="button" onClick={() => dashboard.refetch()} disabled={dashboard.isFetching} className="min-h-11 bg-[#173d35]">{dashboard.isFetching ? "Retrying…" : "Retry dashboard"}</Button></main></StillpointShell>;
  const enrolled = Boolean(dashboard.data?.enrolled);
  return <StillpointShell {...common}>
    {isAuthenticated && enrolled && dashboard.data ? <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pb-14 sm:px-8"><div className="flex flex-col gap-5 border-b border-[#e6e0d5] pb-7 pt-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#825c43]">Your private space</p><h1 className="mt-3 font-serif text-4xl tracking-tight text-[#173d35] sm:text-5xl">Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}.</h1><p className="mt-3 max-w-xl text-[#46564d]">A little room to check in, reserve time, and arrive as you are.</p></div><Badge className="w-fit border-[#b5d1c0] bg-[#edf5ef] px-3 py-1.5 text-[#315d49]">Enrollment active</Badge></div><BookingCard data={dashboard.data} reservations={dashboard.data.reservations} onRefresh={() => dashboard.refetch()} /></main> : <Onboarding isAuthenticated={isAuthenticated} />}
  </StillpointShell>;
}
