import { boolean, foreignKey, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/** Core user table backing the OAuth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const stillpointEnrollments = mysqlTable("stillpoint_enrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: mysqlEnum("status", ["active"]).default("active").notNull(),
  feeCents: int("feeCents").default(999).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({ userUnique: uniqueIndex("stillpoint_enrollment_user_uq").on(table.userId) }));

export const stillpointReservations = mysqlTable("stillpoint_reservations", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  timeZone: varchar("timeZone", { length: 64 }).default("UTC").notNull(),
  units: int("units").notNull(),
  status: mysqlEnum("status", ["requested", "confirmed", "completed", "cancelled"]).default("requested").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["demo_paid"]).default("demo_paid").notNull(),
  amountCents: int("amountCents").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  startIdx: index("stillpoint_reservation_start_idx").on(table.startsAt),
  userCreatedIdx: index("stillpoint_reservation_user_created_idx").on(table.userId, table.createdAt),
  statusIdx: index("stillpoint_reservation_status_idx").on(table.status),
}));

export type StillpointReservationStatus = typeof stillpointReservations.$inferSelect.status;

export const stillpointDemoPayments = mysqlTable("stillpoint_demo_payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reservationId: varchar("reservationId", { length: 36 }),
  kind: mysqlEnum("kind", ["enrollment", "booking"]).notNull(),
  idempotencyKey: varchar("idempotencyKey", { length: 80 }).notNull(),
  amountCents: int("amountCents").notNull(),
  status: mysqlEnum("status", ["demo_confirmed"]).default("demo_confirmed").notNull(),
  termsVersion: varchar("termsVersion", { length: 32 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userKeyUnique: uniqueIndex("stillpoint_payment_user_key_uq").on(table.userId, table.idempotencyKey),
  reservationUnique: uniqueIndex("stillpoint_payment_reservation_uq").on(table.reservationId),
  reservationFk: foreignKey({ name: "stillpoint_payment_res_fk", columns: [table.reservationId], foreignColumns: [stillpointReservations.id] }).onDelete("set null"),
}));

export const stillpointNotifications = mysqlTable("stillpoint_notifications", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  reservationId: varchar("reservationId", { length: 36 }),
  category: mysqlEnum("category", ["enrollment", "booking", "update", "reminder"]).default("update").notNull(),
  actorUserId: int("actorUserId"),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull(),
  tone: mysqlEnum("tone", ["success", "info", "warning"]).default("info").notNull(),
  readAt: timestamp("readAt"),
  dismissedAt: timestamp("dismissedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userCreatedIdx: index("stillpoint_notification_user_created_idx").on(table.userId, table.createdAt),
  reservationFk: foreignKey({ name: "stillpoint_notice_res_fk", columns: [table.reservationId], foreignColumns: [stillpointReservations.id] }).onDelete("set null"),
  actorFk: foreignKey({ name: "stillpoint_notice_actor_fk", columns: [table.actorUserId], foreignColumns: [users.id] }).onDelete("set null"),
}));

export const stillpointNotificationPreferences = mysqlTable("stillpoint_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  inAppEnabled: boolean("inAppEnabled").default(true).notNull(),
  emailEnabled: boolean("emailEnabled").default(false).notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({ userUnique: uniqueIndex("stillpoint_notification_preferences_user_uq").on(table.userId) }));

/** A singleton row serializes booking writes so two clients cannot claim an overlapping slot concurrently. */
export const stillpointLocks = mysqlTable("stillpoint_locks", {
  id: varchar("id", { length: 32 }).primaryKey(),
});
