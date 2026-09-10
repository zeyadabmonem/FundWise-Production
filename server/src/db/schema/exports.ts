import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users.js";

export const appExportsTable = pgTable("app_exports", {
  id: serial("id").primaryKey(),
  format: text("format").notNull(),
  rowCount: integer("row_count").notNull(),
  requestedBy: integer("requested_by").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
