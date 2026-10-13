import { and, desc, eq, gt, isNull, lt, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { stillpointEnrollments, stillpointLocks, stillpointNotificationPreferences, stillpointNotifications, stillpointReservations, users } from "../drizzle/schema";
import { adminProcedure, protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";

const UNIT_MINUTES = 30;
const MAX_UNITS = 4;
const ROLLING_WINDOW_MS = 12 * 60 * 60 * 1000;
const UNIT_PRICE_CENTS = 930;
const UNIT_FEE_CENTS = 100;
type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
type NoticeTone = "success" | "info" | "warning";
type NoticeCategory = "enrollment" | "booking" | "update" | "reminder";

export function calculateBookingTotalCents(units: number) {
  if (!Number.isInteger(units) || units < 1 || units > MAX_UNITS) return null;
  return units * (UNIT_PRICE_CENTS + UNIT_FEE_CENTS);
}

export function reservationOverlaps(existingStart: Date, existingEnd: Date, requestedStart: Date, requestedEnd: Date) {
  return existingStart.getTime() < requestedEnd.getTime() && existingEnd.getTime() > requestedStart.getTime();
}

export function isWithinRollingBookingWindow(createdAt: Date, now: Date) {
  const age = now.getTime() - createdAt.getTime();
  return age >= 0 && age < ROLLING_WINDOW_MS;
}

export function isSlotAligned(startsAt: Date, timezoneOffsetMinutes = 0) {
	return (startsAt.getTime() - timezoneOffsetMinutes * 60_000) % (UNIT_MINUTES * 60_000) === 0;
}

async function createNotice(tx: Tx, userId: number, notice: {
  reservationId?: string;
  category: NoticeCategory;
  title: string;
  message: string;
  tone?: NoticeTone;
}) {
  const [preferences] = await tx.select({ inAppEnabled: stillpointNotificationPreferences.inAppEnabled })
    .from(stillpointNotificationPreferences)
    .where(eq(stillpointNotificationPreferences.userId, userId)).limit(1);
  if (preferences?.inAppEnabled === false) return;
  await tx.insert(stillpointNotifications).values({
    id: crypto.randomUUID(),
    userId,
    reservationId: notice.reservationId ?? null,
    category: notice.category,
    title: notice.title,
    message: notice.message,
    tone: notice.tone ?? "info",
  });
}

function requireDb(db: Db | null): asserts db is Db {
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The Stillpoint database is unavailable. Please try again shortly." });
}

async function getActiveEnrollment(db: Db, userId: number) {
  const [enrollment] = await db.select().from(stillpointEnrollments).where(eq(stillpointEnrollments.userId, userId)).limit(1);
  return enrollment ?? null;
}

async function findOverlappingReservation(db: Db, startsAt: Date, endsAt: Date) {
  const [reservation] = await db.select({ id: stillpointReservations.id })
    .from(stillpointReservations)
    .where(and(
      lt(stillpointReservations.startsAt, endsAt),
      gt(stillpointReservations.endsAt, startsAt),
      ne(stillpointReservations.status, "cancelled"),
    )).limit(1);
  return reservation ?? null;
}

async function createNoticeOutsideTransaction(db: Db, userId: number, notice: Parameters<typeof createNotice>[2]) {
  await db.transaction(async (tx) => createNotice(tx, userId, notice));
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
        enrollmentFeeCents: enrollment?.feeCents ?? 999,
        reservations: reservations.map((reservation) => ({
          id: reservation.id,
          startsAt: reservation.startsAt.toISOString(),
          endsAt: reservation.endsAt.toISOString(),
          createdAt: reservation.createdAt.toISOString(),
          units: reservation.units,
          amountCents: reservation.amountCents,
          status: reservation.status,
        })),
      };
    }),
    enroll: protectedProcedure.input(z.object({ termsAccepted: z.literal(true), demoPaymentConfirmed: z.literal(true) })).mutation(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const existing = await getActiveEnrollment(db, ctx.user.id);
      if (existing) return { enrolled: true, created: false };
      await db.transaction(async (tx) => {
        const [inside] = await tx.select({ id: stillpointEnrollments.id }).from(stillpointEnrollments)
          .where(eq(stillpointEnrollments.userId, ctx.user.id)).limit(1);
        if (inside) return;
        await tx.insert(stillpointEnrollments).values({ userId: ctx.user.id, feeCents: 999, status: "active" });
        await createNotice(tx, ctx.user.id, {
          category: "enrollment", tone: "success", title: "Enrollment payment recorded",
          message: "Your one-time $9.99 demo enrollment payment was recorded. The demo does not charge a live payment method; demo payments are final.",
        });
        await createNotice(tx, ctx.user.id, {
          category: "enrollment", tone: "success", title: "Welcome to Stillpoint",
          message: "Your demo enrollment is active. Your private listening dashboard is ready.",
        });
      });
      return { enrolled: true, created: true };
    }),
  }),

  booking: router({
    availability: protectedProcedure.input(z.object({ startsAt: z.string().datetime(), units: z.number().int().min(1).max(4), timezoneOffsetMinutes: z.number().int().min(-720).max(840).default(0) }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        requireDb(db);
        const startsAt = new Date(input.startsAt);
        const endsAt = new Date(startsAt.getTime() + input.units * UNIT_MINUTES * 60_000);
        const now = new Date();
        const recent = await db.select({ createdAt: stillpointReservations.createdAt })
          .from(stillpointReservations)
          .where(eq(stillpointReservations.userId, ctx.user.id))
          .orderBy(desc(stillpointReservations.createdAt)).limit(1);
        const withinWindow = Boolean(recent[0] && isWithinRollingBookingWindow(recent[0].createdAt, now));
        const conflict = startsAt.getTime() <= now.getTime() || !isSlotAligned(startsAt, input.timezoneOffsetMinutes) ? true : Boolean(await findOverlappingReservation(db, startsAt, endsAt));
        return { available: !withinWindow && !conflict && startsAt.getTime() > now.getTime(), withinWindow, conflict };
      }),
    create: protectedProcedure.input(z.object({
      startsAt: z.string().datetime(),
      units: z.number().int().min(1).max(4),
      timezoneOffsetMinutes: z.number().int().min(-720).max(840).default(0),
      demoPaymentConfirmed: z.literal(true),
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      if (!await getActiveEnrollment(db, ctx.user.id)) throw new TRPCError({ code: "FORBIDDEN", message: "Complete enrollment before booking a session." });
      const amountCents = calculateBookingTotalCents(input.units);
      if (amountCents === null) throw new TRPCError({ code: "BAD_REQUEST", message: "Select between one and four 30-minute units." });
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(startsAt.getTime() + input.units * UNIT_MINUTES * 60_000);
      if (startsAt.getTime() <= Date.now()) throw new TRPCError({ code: "BAD_REQUEST", message: "Choose a future session start time." });
      if (!isSlotAligned(startsAt, input.timezoneOffsetMinutes)) throw new TRPCError({ code: "BAD_REQUEST", message: "Session starts must align to 30-minute boundaries." });

      let createdId = "";
      await db.transaction(async (tx) => {
        const [lock] = await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
          .where(eq(stillpointLocks.id, "booking-availability")).for("update");
        if (!lock) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking availability lock is not initialized. Apply database migrations and retry." });
        const [recent] = await tx.select({ createdAt: stillpointReservations.createdAt }).from(stillpointReservations)
          .where(eq(stillpointReservations.userId, ctx.user.id))
          .orderBy(desc(stillpointReservations.createdAt)).limit(1);
        if (recent && isWithinRollingBookingWindow(recent.createdAt, new Date())) {
          throw new TRPCError({ code: "CONFLICT", message: "You already have a reservation within the rolling 12-hour booking window." });
        }
        const [overlap] = await tx.select({ id: stillpointReservations.id }).from(stillpointReservations)
          .where(and(lt(stillpointReservations.startsAt, endsAt), gt(stillpointReservations.endsAt, startsAt), ne(stillpointReservations.status, "cancelled"))).limit(1);
        if (overlap) throw new TRPCError({ code: "CONFLICT", message: "That time overlaps a reservation and is no longer available." });
        createdId = crypto.randomUUID();
        await tx.insert(stillpointReservations).values({
          id: createdId, userId: ctx.user.id, startsAt, endsAt, units: input.units,
          amountCents, status: "requested", paymentStatus: "demo_paid",
        });
        const [user] = await tx.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
        await createNotice(tx, ctx.user.id, {
          reservationId: createdId, category: "booking", tone: "success", title: "Session request received",
          message: `Your ${input.units * UNIT_MINUTES}-minute request for ${startsAt.toLocaleString()} is recorded. Demo payment of $${(amountCents / 100).toFixed(2)} is final; no live charge was made.`,
        });
        const adminUsers = await tx.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
        for (const admin of adminUsers) {
          await tx.insert(stillpointNotifications).values({
            id: crypto.randomUUID(), userId: admin.id, reservationId: createdId, category: "booking", tone: "info",
            title: "New booking request",
            message: `${user?.name || user?.email || "A client"} requested ${input.units * UNIT_MINUTES} minutes for ${startsAt.toLocaleString()} ($${(amountCents / 100).toFixed(2)} demo payment).`,
          });
        }
      });
      return { id: createdId, status: "requested" as const, amountCents };
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
        .orderBy(desc(stillpointNotifications.createdAt)).limit(50);
      return rows.map((row) => ({
        id: row.id, title: row.title, message: row.message, tone: row.tone,
        createdAt: row.createdAt.toISOString(), read: Boolean(row.readAt),
      }));
    }),
    preferences: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      const [preferences] = await db.select().from(stillpointNotificationPreferences)
        .where(eq(stillpointNotificationPreferences.userId, ctx.user.id)).limit(1);
      return { inAppEnabled: preferences?.inAppEnabled ?? true, emailEnabled: preferences?.emailEnabled ?? false };
    }),
    savePreferences: protectedProcedure.input(z.object({ inAppEnabled: z.boolean(), emailEnabled: z.boolean() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        requireDb(db);
        await db.insert(stillpointNotificationPreferences).values({ userId: ctx.user.id, ...input })
          .onDuplicateKeyUpdate({ set: { ...input } });
        return input;
      }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      requireDb(db);
      await db.update(stillpointNotifications).set({ readAt: new Date() })
        .where(and(eq(stillpointNotifications.userId, ctx.user.id), isNull(stillpointNotifications.readAt)));
      return { success: true };
    }),
    dismiss: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      requireDb(db);
      await db.update(stillpointNotifications).set({ dismissedAt: new Date() })
        .where(and(eq(stillpointNotifications.userId, ctx.user.id), eq(stillpointNotifications.id, input.id)));
      return { success: true };
    }),
  }),

  admin: router({
    listBookings: adminProcedure.query(async () => {
      const db = await getDb();
      requireDb(db);
      const rows = await db.select({
        id: stillpointReservations.id, startsAt: stillpointReservations.startsAt, endsAt: stillpointReservations.endsAt,
        units: stillpointReservations.units, status: stillpointReservations.status, amountCents: stillpointReservations.amountCents,
        paymentStatus: stillpointReservations.paymentStatus, createdAt: stillpointReservations.createdAt,
        clientName: users.name, clientEmail: users.email, userId: users.id,
      }).from(stillpointReservations).innerJoin(users, eq(stillpointReservations.userId, users.id))
        .orderBy(desc(stillpointReservations.createdAt)).limit(200);
      return rows.map((row) => ({ ...row, startsAt: row.startsAt.toISOString(), endsAt: row.endsAt.toISOString(), createdAt: row.createdAt.toISOString() }));
    }),
    setStatus: adminProcedure.input(z.object({
      reservationId: z.string().uuid(), status: z.enum(["confirmed", "completed", "cancelled"]),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      requireDb(db);
      const [reservation] = await db.select().from(stillpointReservations).where(eq(stillpointReservations.id, input.reservationId)).limit(1);
      if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Booking request was not found." });
      await db.transaction(async (tx) => {
        if (input.status === "cancelled") {
          const [lock] = await tx.select({ id: stillpointLocks.id }).from(stillpointLocks)
            .where(eq(stillpointLocks.id, "booking-availability")).for("update");
          if (!lock) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Booking availability lock is not initialized." });
        }
        await tx.update(stillpointReservations).set({ status: input.status }).where(eq(stillpointReservations.id, input.reservationId));
        const message = input.status === "confirmed" ? "Your listening session request is confirmed." : input.status === "cancelled" ? "Your listening session request was cancelled by the Stillpoint team." : "Your listening session has been marked complete. Thank you for spending time with Stillpoint.";
        await createNotice(tx, reservation.userId, {
          reservationId: reservation.id, category: "update", tone: input.status === "cancelled" ? "warning" : "info",
          title: input.status === "confirmed" ? "Session confirmed" : input.status === "cancelled" ? "Booking update" : "Session complete", message,
        });
      });
      return { success: true };
    }),
    sendClientUpdate: adminProcedure.input(z.object({
      reservationId: z.string().uuid(), category: z.enum(["update", "reminder"]),
      title: z.string().trim().min(1).max(160), message: z.string().trim().min(1).max(2000),
      tone: z.enum(["info", "warning"]).default("info"),
    })).mutation(async ({ input }) => {
      const db = await getDb();
      requireDb(db);
      const [reservation] = await db.select().from(stillpointReservations).where(eq(stillpointReservations.id, input.reservationId)).limit(1);
      if (!reservation) throw new TRPCError({ code: "NOT_FOUND", message: "Booking request was not found." });
      await createNoticeOutsideTransaction(db, reservation.userId, {
        reservationId: reservation.id, category: input.category, title: input.title,
        message: input.message, tone: input.tone,
      });
      return { success: true };
    }),
  }),
});
