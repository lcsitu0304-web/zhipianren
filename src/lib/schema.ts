import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  roleId: varchar("role_id", { length: 50 }).notNull(),
  role: varchar("role", { length: 10 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;