import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { stillpointDemoPayments, stillpointEnrollments, stillpointLocks, stillpointNotificationPreferences, stillpointNotifications, stillpointReservations, users } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import { getDb } from "./db";

const integration = describe.skipIf(!process.env.DATABASE_URL);

integration("Stillpoint router integration against MySQL", () => {
  const runId = crypto.randomUUID();
  const openIds = [`sp-int-a-${runId}`, `sp-int-b-${runId}`, `sp-int-admin-${runId}`];
  let db: NonNullable<Awaited<ReturnType<typeof getDb>>>;
  let clients: [typeof users.$inferSelect, typeof users.$inferSelect];
  let admin: typeof users.$inferSelect;

  const caller = (user: typeof users.$inferSelect) => appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  beforeAll(async () => {
    const instance = await getDb();
    if (!instance) throw new Error("DATABASE_URL was present but the Stillpoint test database could not be opened.");
    db = instance;
    for (const [index, openId] of openIds.entries()) {
      await db.insert(users).values({ openId, name: `Stillpoint Test ${index}`, email: `${openId}@example.invalid`, role: index === 2 ? "admin" : "user" });
    }
    const results = await Promise.all(openIds.map((openId) => db.select().from(users).where(eq(users.openId, openId)).limit(1)));
    clients = [results[0][0]!, results[1][0]!];
    admin = results[2][0]!;
  });

  afterAll(async () => {
    if (!db) return;
    const fixtures = await db.select({ id: users.id, openId: users.openId }).from(users).where(inArray(users.openId, openIds));
    const ids = fixtures.map((row) => row.id);
    if (!ids.length) return;
    const ownedReservations = await db.select({ id: stillpointReservations.id }).from(stillpointReservations).where(inArray(stillpointReservations.userId, ids));
    const reservationIds = ownedReservations.map((row) => row.id);
    if (reservationIds.length) {
      await db.delete(stillpointDemoPayments).where(inArray(stillpointDemoPayments.reservationId, reservationIds));
      await db.delete(stillpointNotifications).where(inArray(stillpointNotifications.reservationId, reservationIds));
    }
    for (const userId of ids) {
      await db.delete(stillpointDemoPayments).where(eq(stillpointDemoPayments.userId, userId));
      await db.delete(stillpointNotifications).where(eq(stillpointNotifications.userId, userId));
      await db.delete(stillpointNotificationPreferences).where(eq(stillpointNotificationPreferences.userId, userId));
      await db.delete(stillpointEnrollments).where(eq(stillpointEnrollments.userId, userId));
      await db.delete(stillpointReservations).where(eq(stillpointReservations.userId, userId));
      await db.delete(stillpointLocks).where(eq(stillpointLocks.id, `enrollment-${userId}`));
    }
    await db.delete(users).where(eq(users.openId, openIds[0]));
    await db.delete(users).where(eq(users.openId, openIds[1]));
    await db.delete(users).where(eq(users.openId, openIds[2]));
  });

  it("keeps enrollment, booking, notices, and admin actions isolated and idempotent", async () => {
    const [clientA, clientB, adminCaller] = [caller(clients[0]), caller(clients[1]), caller(admin)];
    const enrollmentA = await clientA.stillpoint.profile.enroll({ termsAccepted: true, demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() });
    const enrollmentARetry = await clientA.stillpoint.profile.enroll({ termsAccepted: true, demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() });
    const enrollmentB = await clientB.stillpoint.profile.enroll({ termsAccepted: true, demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() });
    expect(enrollmentA).toMatchObject({ enrolled: true, created: true });
    expect(enrollmentARetry).toMatchObject({ enrolled: true, created: false });
    expect(enrollmentB.enrolled).toBe(true);

    const start = new Date(Date.now() + (Math.floor(Math.random() * 300) + 45) * 86_400_000);
    start.setUTCHours(10, 0, 0, 0);
    const slot = { startsAt: start.toISOString(), localStart: start.toISOString().slice(0, 16), timeZone: "UTC", units: 2 };
    const bookingKey = crypto.randomUUID();
    const first = await clientA.stillpoint.booking.create({ ...slot, demoPaymentConfirmed: true, idempotencyKey: bookingKey });
    const retry = await clientA.stillpoint.booking.create({ ...slot, demoPaymentConfirmed: true, idempotencyKey: bookingKey });
    expect(first).toMatchObject({ created: true, status: "requested", amountCents: 2060 });
    expect(retry).toMatchObject({ id: first.id, created: false, amountCents: 2060 });

    const paymentRows = await db.select().from(stillpointDemoPayments)
      .where(and(eq(stillpointDemoPayments.userId, clients[0].id), eq(stillpointDemoPayments.kind, "booking")));
    expect(paymentRows.filter((row) => row.idempotencyKey === bookingKey)).toHaveLength(1);
    await expect(clientB.stillpoint.booking.create({ ...slot, demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() }))
      .rejects.toMatchObject({ code: "CONFLICT" });
    const clientBNotices = await clientB.stillpoint.notifications.list();
    expect(clientBNotices.every((notice) => notice.category === "enrollment")).toBe(true);
    expect(clientBNotices.some((notice) => notice.title === "New booking request" || notice.title === "Session request received")).toBe(false);
    expect((await clientB.stillpoint.profile.dashboard()).reservations).toEqual([]);
    await expect(clientB.stillpoint.admin.listBookings({ page: 0, limit: 25, status: "all", search: "" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });

    const adminInbox = await adminCaller.stillpoint.admin.listBookings({ page: 0, limit: 25, status: "requested", search: openIds[0] });
    expect(adminInbox.rows.map((row) => row.id)).toContain(first.id);
    const confirmed = await adminCaller.stillpoint.admin.setStatus({ reservationId: first.id, status: "confirmed" });
    const repeated = await adminCaller.stillpoint.admin.setStatus({ reservationId: first.id, status: "confirmed" });
    expect(confirmed).toMatchObject({ changed: true, deliveredInApp: true });
    expect(repeated).toMatchObject({ changed: false });
    await expect(adminCaller.stillpoint.admin.setStatus({ reservationId: first.id, status: "completed" }))
      .rejects.toMatchObject({ code: "CONFLICT" });

    await clientA.stillpoint.notifications.savePreferences({ inAppEnabled: false });
    const update = await adminCaller.stillpoint.admin.sendClientUpdate({ reservationId: first.id, category: "update", title: "Test notice", message: "In-app delivery is disabled." });
    expect(update).toMatchObject({ success: true, deliveredInApp: false, emailQueued: false });
    expect(await clientA.stillpoint.notifications.list()).toEqual([]);

    const cancelled = await clientA.stillpoint.booking.cancel({ reservationId: first.id });
    expect(cancelled).toMatchObject({ success: true, changed: true, deliveredInApp: false });
    await expect(clientA.stillpoint.booking.create({ ...slot, startsAt: new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString(), localStart: new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16), demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() }))
      .rejects.toMatchObject({ code: "CONFLICT" });

    const secondClientBooking = await clientB.stillpoint.booking.create({ ...slot, demoPaymentConfirmed: true, idempotencyKey: crypto.randomUUID() });
    expect(secondClientBooking.created).toBe(true);
    const metrics = await adminCaller.stillpoint.admin.summary();
    expect(metrics.realPaymentsProcessed).toBe(0);
    expect(metrics.simulatedVolumeCents).toBeGreaterThanOrEqual(3090);
  });
});
