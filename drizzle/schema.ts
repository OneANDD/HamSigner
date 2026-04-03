import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

export const signingJobs = mysqlTable("signing_jobs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  status: mysqlEnum("status", ["pending", "uploading", "signing", "done", "error"])
    .default("pending")
    .notNull(),
  originalIpaName: varchar("originalIpaName", { length: 255 }),
  signedIpaUrl: text("signedIpaUrl"),
  manifestUrl: text("manifestUrl"),
  appName: varchar("appName", { length: 255 }),
  bundleId: varchar("bundleId", { length: 255 }),
  appVersion: varchar("appVersion", { length: 64 }),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SigningJob = typeof signingJobs.$inferSelect;
export type InsertSigningJob = typeof signingJobs.$inferInsert;
