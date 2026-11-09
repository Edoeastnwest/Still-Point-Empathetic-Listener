import { and, count, desc, eq, gt, inArray, isNull, like, lt, ne, or, sql, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  stillpointDemoPayments,
  stillpointEnrollments,
  stillpointLocks,
  stillpointNotificationPreferences,
  stillpointNotifications,
  stillpointReservations,
  users,
} from "../drizzle/schema";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { canTransitionReservation, formatDateTimeInTimeZone, isValidIanaTimeZone } from "./stillpoint-policy";

export const UNIT_MINUTES = 30;
export const MAX_UNITS = 4;
export const BOOKING_WINDOW_MS = 12 * 60 * 60 * 1000;
export const ENROLLMENT_FEE_CENTS = 999;
export const UNIT_PRICE_CENTS = 930;
export const UNIT_FEE_CENTS = 100;
export const TERMS_VERSION = "stillpoint-demo-v1";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type NoticeTone = "success" | "info" | "warning";
type NoticeCategory = "enrollment" | "booking" | "update" | "reminder";
const reservationStatus = z.enum(["requested", "confirmed", "completed", "cancelled"]);
const bookingTimeInput = {
  startsAt: z.string().datetime(),
  localStart: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),
  timeZone: z.string().min(1).max(64),
  units: z.number().int().min(1).max(MAX_UNITS),
};

export function calculateBookingTotalCents(units: number) {
  if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) return null;
  return units * (UNIT_PRICE_CENTS + UNIT_FEE_CENTS);
}

export function reservationOverlaps(existingStart: Date, existingEnd: Date, requestedStart: Date, requestedEnd: Date) {
  return existingStart.getTime() < requestedEnd.getTime() && existingEnd.getTime() > requestedStart.getTime();
}

export function isWithinBookingWindow(createdAt: Date, now: Date) {
  const age = now.getTime() - createdAt.getTime();
  return age >= 0 && age < BOOKING_WINDOW_MS;
}

export function isSlotAligned(startsAt: Date, timeZone: string) {
  if (!isValidIanaTimeZone(timeZone) || startsAt.getSeconds() !== 0 || startsAt.getMilliseconds() !== 0) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startsAt);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);
  const second = Number(parts.find((part) => part.type === "second")?.value);
  return (minute === 0 || minute === 30) && second === 0;
}

export function localInputMatchesDate(startsAt: Date, localStart: string, timeZone: string) {
  if (!isValidIanaTimeZone(timeZone)) return false;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(startsAt);
  const byType = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const formatted = `${byType.year}-${byType.month}-${byType.day}T${byType.hour}:${byType.minute}`;
  return formatted === localStart;
}

async function createNotice(tx: Tx, userId: number, notice: {
  reservationId?: string;
  actorUserId?: number;
  category: NoticeCategory;
  title: string;
  message: string;
  tone?: NoticeTone;
}) {
  const [preferences] = await tx.select({ inAppEnabled: stillpointNotificationPreferences.inAppEnabled })
    .from(stillpointNotificationPreferences)
    .where(eq(stillpointNotificationPreferences.userId, userId)).limit(1);
  if (preferences?.inAppEnabled === false) return false;
  await tx.insert(stillpointNotifications).values({
    id: crypto.randomUUID(),
    userId,
    actorUserId: notice.actorUserId ?? null,
    reservationId: notice.reservationId ?? null,
    category: notice.category,
    title: notice.title,
    message: notice.message,
    tone: notice.tone ?? "info",
  });
  return true;
}

function requireDb(db: Db | null): asserts db is Db {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Stillpoint is temporarily unavailable. Please try again shortly." });
}

async function getActiveEnrollment(db: Db, userId: number) {
  const [enrollment] = await db.select().from(stillpointEnrollments)
    .where(and(eq(stillpointEnrollments.userId, userId), eq(stillpointEnrollments.status, "active"))).limit(1);
  return enrollment ?? null;
}

async function findOverlappingReservation(db: Db | Tx, startsAt: Date, endsAt: Date) {
  const [reservation] = await db.select({ id: stillpointReservations.id })
    .from(stillpointReservations)
    .where(and(
      lt(stillpointReservations.startsAt, endsAt),
      gt(stillpointReservations.endsAt, startsAt),
      ne(stillpointReservations.status, "cancelled"),
    )).limit(1);
  return reservation ?? null;
}

function getBookingLockId(userId: number) {
  return `enrollment-${userId}`;
}

export const stillpointRouter = router({
  profile: router({
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const [enrollment, reservations] = await Promise.all([
        getActiveEnrollment(db, ctx.user.id),
        db.select().from(stillpointReservations)
          .where(eq(stillpointReservations.userId, ctx.user.id))
          .orderBy(desc(stillpointReservations.startsAt)),
      ]);
      return {
        enrolled: Boolean(enrollment),
        enrollmentFeeCents: enrollment?.feeCents ?? ENROLLMENT_FEE_CENTS,
        reservations: reservations.map((reservation) => ({
          id: reservation.id,
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
          createdAt: reservation.createdAt.toISOString(),
          timeZone: reservation.timeZone,
          units: reservation.units,
          amountCents: reservation.amountCents,
          status: reservation.status,
        })),
      };
    }),
    enroll: protectedProcedure.input(z.object({
      termsAccepted: z.literal(true),
      demoPaymentConfirmed: z.literal(true),
      idempotencyKey: z.string().uuid(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      const lockId = getBookingLockId(ctx.user.id);
      let created = false;
      await db.transaction(async (tx) => {
        await tx.insert(stillpointLocks).values({ id: lockId }).onDuplicateKeyUpdate({ set: { id: lockId } });
        await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
          .where(eq(stillpointLocks.id, lockId)).for("update");
        const [existing] = await tx.select({ id: stillpointEnrollments.id }).from(stillpointEnrollments)
          .where(eq(stillpointEnrollments.userId, ctx.user.id)).limit(1);
        if (existing) return;
        await tx.insert(stillpointEnrollments).values({ userId: ctx.user.id, feeCents: ENROLLMENT_FEE_CENTS, status: "active" })
          .onDuplicateKeyUpdate({ set: { status: "active" } });
        await tx.insert(stillpointDemoPayments).values({
          id: crypto.randomUUID(), userId: ctx.user.id, reservationId: null,
          kind: "enrollment", idempotencyKey: input.idempotencyKey,
          amountCents: ENROLLMENT_FEE_CENTS, status: "demo_confirmed", termsVersion: TERMS_VERSION,
        }).onDuplicateKeyUpdate({ set: { idempotencyKey: input.idempotencyKey } });
        const deliveredInApp = await createNotice(tx, ctx.user.id, {
          category: "enrollment", tone: "success", title: "Demo enrollment recorded",
          message: "Your $9.99 enrollment was simulated in this prototype; no live payment method was charged.",
        });
        if (deliveredInApp) {
          await createNotice(tx, ctx.user.id, {
            category: "enrollment", tone: "success", title: "Welcome to Stillpoint",
            message: "Your demo enrollment is active. Your private listening dashboard is ready.",
          });
        }
        created = true;
      });
      return { enrolled: true, created };
    }),
  }),

  booking: router({
    availability: protectedProcedure.input(z.object({ ...bookingTimeInput }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        requireDb(db);
        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(startsAt.getTime() + input.units * UNIT_MINUTES * 60_000);
        const now = new Date();
        const [recent] = await db.select({ createdAt: stillpointReservations.createdAt })
          .from(stillpointReservations)
          .where(eq(stillpointReservations.userId, ctx.user.id))
          .orderBy(desc(stillpointReservations.createdAt)).limit(1);
        const withinWindow = Boolean(recent && isWithinBookingWindow(recent.createdAt, now));
        const validLocalTime = localInputMatchesDate(startsAt, input.localStart, input.timeZone) && isSlotAligned(startsAt, input.timeZone);
        const conflict = startsAt.getTime() <= now.getTime() || !validLocalTime
          ? true
          : Boolean(await findOverlappingReservation(db, startsAt, endsAt));
        return { available: !withinWindow && !conflict, withinWindow, conflict, timeZoneValid: validLocalTime };
      }),
    create: protectedProcedure.input(z.object({
      ...bookingTimeInput,
      demoPaymentConfirmed: z.literal(true),
      idempotencyKey: z.string().uuid(),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      if (!await getActiveEnrollment(db, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Complete demo enrollment before booking." });
      const amountCents = calculateBookingTotalCents(input.units);
      if (amountCents === null) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose one to four 30-minute units." });
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(startsAt.getTime() + input.units * UNIT_MINUTES * 60_000);
      if (startsAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future session start time." });
      if (!localInputMatchesDate(startsAt, input.localStart, input.timeZone) || !isSlotAligned(startsAt, input.timeZone)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a valid local start time on a 30-minute boundary." });
      }

      const response = await db.transaction(async (tx) => {
        const [bookingLock] = await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
          .where(eq(stillpointLocks.id, "booking-availability")).for("update");
        if (!bookingLock) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking service is not initialized. Please contact support." });
        const [priorPayment] = await tx.select().from(stillpointDemoPayments)
          .where(and(eq(stillpointDemoPayments.userId, ctx.user.id), eq(stillpointDemoPayments.idempotencyKey, input.idempotencyKey))).limit(1);
        if (priorPayment && priorPayment.kind !== "booking") {
          throw new TRPCError({ code: "CONFLICT", message: "This confirmation key was already used for enrollment. Start a new booking confirmation." });
        }
        if (priorPayment?.reservationId) {
          const [priorReservation] = await tx.select().from(stillpointReservations)
            .where(and(eq(stillpointReservations.id, priorPayment.reservationId), eq(stillpointReservations.userId, ctx.user.id))).limit(1);
          if (priorReservation) {
            if (priorReservation.startsAt.getTime() !== startsAt.getTime() || priorReservation.units !== input.units || priorPayment.amountCents !== amountCents) {
              throw new TRPCError({ code: "CONFLICT", message: "This demo payment confirmation was already used for a different session. Start a new confirmation." });
            }
            return { id: priorReservation.id, status: priorReservation.status, amountCents: priorReservation.amountCents, created: false };
          }
        }
        const [recent] = await tx.select({ createdAt: stillpointReservations.createdAt }).from(stillpointReservations)
          .where(eq(stillpointReservations.userId, ctx.user.id))
          .orderBy(desc(stillpointReservations.createdAt)).limit(1);
        if (recent && isWithinBookingWindow(recent.createdAt, new Date())) {
          throw new TRPCError({ code: "CONFLICT", message: "You already have a booking within the rolling 12-hour window." });
        }
        const [overlap] = await tx.select({ id: stillpointReservations.id }).from(stillpointReservations)
          .where(and(lt(stillpointReservations.startsAt, endsAt), gt(stillpointReservations.endsAt, startsAt), ne(stillpointReservations.status, "cancelled"))).limit(1);
        if (overlap) throw new TRPCError({ code: "CONFLICT", message: "That time was just reserved. Choose another available time." });

        const id = crypto.randomUUID();
        await tx.insert(stillpointReservations).values({
          id, userId: ctx.user.id, startsAt, endsAt, timeZone: input.timeZone,
          units: input.units, amountCents, status: "requested", paymentStatus: "demo_paid",
        });
        await tx.insert(stillpointDemoPayments).values({
          id: crypto.randomUUID(), userId: ctx.user.id, reservationId: id, kind: "booking",
          idempotencyKey: input.idempotencyKey, amountCents, status: "demo_confirmed", termsVersion: TERMS_VERSION,
        });
        const formatted = formatDateTimeInTimeZone(startsAt, input.timeZone);
        await createNotice(tx, ctx.user.id, {
          reservationId: id, category: "booking", tone: "success", title: "Session request received",
          message: `Your ${input.units * UNIT_MINUTES}-minute request for ${formatted} (${input.timeZone}) is recorded. The ${formatMoney(amountCents)} demo payment was simulated; no live charge was made.`,
        });
        const adminUsers = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
        for (const admin of adminUsers) {
          await createNotice(tx, admin.id, {
            reservationId: id, category: "booking", tone: "info", title: "New booking request",
            message: `Client ${ctx.user.name || ctx.user.email || ctx.user.id} requested ${input.units * UNIT_MINUTES} minutes for ${formatted} (${input.timeZone}); ${formatMoney(amountCents)} demo payment.`,
          });
        }
        return { id, status: "requested" as const, amountCents, created: true };
      });
      return response;
    }),
    cancel: protectedProcedure.input(z.object({ reservationId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      let deliveredInApp = false;
      let changed = false;
      await db.transaction(async (tx) => {
        const [bookingLock] = await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
          .where(eq(stillpointLocks.id, "booking-availability")).for("update");
        if (!bookingLock) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking service is not initialized." });
        const [reservation] = await tx.select().from(stillpointReservations)
          .where(and(eq(stillpointReservations.id, input.reservationId), eq(stillpointReservations.userId, ctx.user.id))).for("update");
        if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Session request was not found." });
        if (reservation.status === "cancelled") return;
        if (reservation.status !== "requested" && reservation.status !== "confirmed") {
          throw new TRPCError({ code: "CONFLICT", message: "This session can no longer be cancelled." });
        }
        if (reservation.startsAt.getTime() <= Date.now()) {
          throw new TRPCError({ code: "CONFLICT", message: "A session can only be cancelled before its scheduled start." });
        }
        await tx.update(stillpointReservations).set({ status: "cancelled" })
          .where(and(eq(stillpointReservations.id, reservation.id), eq(stillpointReservations.userId, ctx.user.id)));
        deliveredInApp = await createNotice(tx, ctx.user.id, {
          reservationId: reservation.id, category: "update", tone: "warning", title: "Session cancelled",
          message: "Your session was cancelled. The time slot is available again. The strict rolling 12-hour booking limit still applies to your account; no live payment was processed.",
        });
        changed = true;
      });
      return { success: true, changed, deliveredInApp };
    }),
  }),

  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const [preferences] = await db.select().from(stillpointNotificationPreferences)
        .where(eq(stillpointNotificationPreferences.userId, ctx.user.id)).limit(1);
      if (preferences?.inAppEnabled === false) return [];
      const rows = await db.select().from(stillpointNotifications)
        .where(and(eq(stillpointNotifications.userId, ctx.user.id), isNull(stillpointNotifications.dismissedAt)))
        .orderBy(desc(stillpointNotifications.createdAt), desc(stillpointNotifications.id)).limit(50);
      return rows.map((row) => ({
        id: row.id, title: row.title, message: row.message, tone: row.tone,
        category: row.category, createdAt: row.createdAt.toISOString(), read: Boolean(row.readAt),
      }));
    }),
    preferences: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const [preferences] = await db.select().from(stillpointNotificationPreferences)
        .where(eq(stillpointNotificationPreferences.userId, ctx.user.id)).limit(1);
      return { inAppEnabled: preferences?.inAppEnabled ?? true, emailEnabled: false, emailAvailable: false };
    }),
    savePreferences: protectedProcedure.input(z.object({ inAppEnabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        requireDb(db);
        await db.insert(stillpointNotificationPreferences).values({ userId: ctx.user.id, inAppEnabled: input.inAppEnabled, emailEnabled: false })
          .onDuplicateKeyUpdate({ set: { inAppEnabled: input.inAppEnabled, emailEnabled: false } });
        return { inAppEnabled: input.inAppEnabled, emailEnabled: false, emailAvailable: false };
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const result = await db.update(stillpointNotifications).set({ readAt: new Date() })
        .where(and(eq(stillpointNotifications.userId, ctx.user.id), isNull(stillpointNotifications.readAt), isNull(stillpointNotifications.dismissedAt)));
      return { success: true, affected: Number(result[0]?.affectedRows ?? 0) };
    }),
    dismiss: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      const result = await db.update(stillpointNotifications).set({ dismissedAt: new Date() })
        .where(and(eq(stillpointNotifications.userId, ctx.user.id), eq(stillpointNotifications.id, input.id), isNull(stillpointNotifications.dismissedAt)));
      return { success: true, affected: Number(result[0]?.affectedRows ?? 0) };
    }),
  }),

  admin: router({
    summary: adminProcedure.query(async () => {
      const db = await getDb();
      requireDb(db);
      const [statuses, upcomingResult, demoVolumeResult] = await Promise.all([
        db.select({ status: stillpointReservations.status, value: count() })
          .from(stillpointReservations).groupBy(stillpointReservations.status),
        db.select({ value: count() }).from(stillpointReservations)
          .where(and(gt(stillpointReservations.startsAt, new Date()), inArray(stillpointReservations.status, ["requested", "confirmed"]))),
        db.select({ value: sum(stillpointReservations.amountCents) }).from(stillpointReservations),
      ]);
      const counts = Object.fromEntries(statuses.map((row) => [row.status, Number(row.value)]));
      return {
        total: Object.values(counts).reduce((total, value) => total + value, 0),
        requested: counts.requested ?? 0,
        confirmed: counts.confirmed ?? 0,
        completed: counts.completed ?? 0,
        cancelled: counts.cancelled ?? 0,
        upcoming: Number(upcomingResult[0]?.value ?? 0),
        simulatedVolumeCents: Number(demoVolumeResult[0]?.value ?? 0),
        realPaymentsProcessed: 0 as const,
      };
    }),
    listBookings: adminProcedure.input(z.object({
      page: z.number().int().min(0).max(10_000).default(0),
      limit: z.number().int().min(1).max(100).default(25),
      status: z.union([reservationStatus, z.literal("all")]).default("all"),
      search: z.string().trim().max(100).default(""),
    })).query(async ({ input }) => {
      const db = await getDb();
      requireDb(db);
      const filters = [];
      if (input.status !== "all") filters.push(eq(stillpointReservations.status, input.status));
      const search = input.search.replace(/[\\%_]/g, "\\$&");
      if (search) filters.push(or(like(users.name, `%${search}%`), like(users.email, `%${search}%`))!);
      const where = filters.length ? and(...filters) : undefined;
      const [total] = await db.select({ value: count() })
        .from(stillpointReservations).innerJoin(users, eq(stillpointReservations.userId, users.id)).where(where);
      const rows = await db.select({
        id: stillpointReservations.id, startsAt: stillpointReservations.startsAt, endsAt: stillpointReservations.endsAt,
        timeZone: stillpointReservations.timeZone, units: stillpointReservations.units, status: stillpointReservations.status,
        amountCents: stillpointReservations.amountCents, paymentStatus: stillpointReservations.paymentStatus,
        createdAt: stillpointReservations.createdAt, clientName: users.name, clientEmail: users.email, userId: users.id,
      }).from(stillpointReservations).innerJoin(users, eq(stillpointReservations.userId, users.id))
        .where(where).orderBy(desc(stillpointReservations.createdAt), desc(stillpointReservations.id))
        .limit(input.limit).offset(input.page * input.limit);
      return {
        rows: rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), createdAt: row.createdAt.toISOString() })),
        total: Number(total?.value ?? 0), page: input.page, limit: input.limit,
      };
    }),
    setStatus: adminProcedure.input(z.object({
      reservationId: z.string().uuid(), status: z.enum(["confirmed", "completed", "cancelled"]),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      let changed = false;
      let deliveredInApp = false;
      await db.transaction(async (tx) => {
        const [bookingLock] = await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
          .where(eq(stillpointLocks.id, "booking-availability")).for("update");
        if (!bookingLock) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking service is not initialized." });
        const [reservation] = await tx.select().from(stillpointReservations)
          .where(eq(stillpointReservations.id, input.reservationId)).for("update");
        if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Booking request was not found." });
        if (reservation.status === input.status) return;
        if (!canTransitionReservation(reservation.status, input.status)) {
          throw new TRPCError({ code: "CONFLICT", message: `A ${reservation.status} booking cannot transition to ${input.status}.` });
        }
        if (input.status === "cancelled" && reservation.startsAt.getTime() <= Date.now()) {
          throw new TRPCError({ code: "CONFLICT", message: "A booking can only be cancelled before its scheduled start." });
        }
        if (input.status === "completed" && reservation.endsAt.getTime() > Date.now()) {
          throw new TRPCError({ code: "CONFLICT", message: "A session can only be marked complete after its scheduled end." });
        }
        await tx.update(stillpointReservations).set({ status: input.status })
          .where(and(eq(stillpointReservations.id, input.reservationId), eq(stillpointReservations.status, reservation.status)));
        const label = formatDateTimeInTimeZone(reservation.startsAt, reservation.timeZone);
        const message = input.status === "confirmed"
          ? `Your listening session request for ${label} (${reservation.timeZone}) is confirmed.`
          : input.status === "cancelled"
            ? `Your listening session request for ${label} (${reservation.timeZone}) was cancelled by the Stillpoint team. The demo payment is not a live charge.`
            : `Your listening session for ${label} (${reservation.timeZone}) has been marked complete. Thank you for spending time with Stillpoint.`;
        deliveredInApp = await createNotice(tx, reservation.userId, {
          reservationId: reservation.id, actorUserId: ctx.user.id, category: "update",
          tone: input.status === "cancelled" ? "warning" : "info",
          title: input.status === "confirmed" ? "Session confirmed" : input.status === "cancelled" ? "Booking update" : "Session complete",
          message,
        });
        changed = true;
      });
      return { success: true, changed, deliveredInApp };
    }),
    sendClientUpdate: adminProcedure.input(z.object({
      reservationId: z.string().uuid(), category: z.enum(["update", "reminder"]),
      title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(2000),
      tone: z.enum(["info", "warning"]).default("info"),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      const [reservation] = await db.select().from(stillpointReservations)
        .where(eq(stillpointReservations.id, input.reservationId)).limit(1);
      if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Booking request was not found." });
      if (reservation.status !== "requested" && reservation.status !== "confirmed") {
        throw new TRPCError({ code: "CONFLICT", message: "Updates can only be sent for active booking requests." });
      }
      if (input.category === "reminder" && reservation.startsAt.getTime() <= Date.now()) {
        throw new TRPCError({ code: "CONFLICT", message: "Reminders are only available for upcoming sessions." });
      }
      const deliveredInApp = await db.transaction(async (tx) => createNotice(tx, reservation.userId, {
        reservationId: reservation.id, actorUserId: ctx.user.id,
        category: input.category, title: input.title, message: input.message, tone: input.tone,
      }));
      return { success: true, deliveredInApp, emailQueued: false };
    }),
  }),
});

export function formatMoney(amountCents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amountCents / 100);
}
