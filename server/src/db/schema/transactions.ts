import { boolean, doublePrecision, pgTable, text, timestamp, varchar, integer } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const transactionsTable = pgTable("transactions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  merchant: text("merchant").notNull(),
  amount: doublePrecision("amount").notNull(),
  category: text("category").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
  notes: text("notes"),
  captureChannel: text("capture_channel").notNull(),
  isLowConfidence: boolean("is_low_confidence").notNull().default(false),
  reviewStatus: text("review_status").notNull().default("pending"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by").references(() => usersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
