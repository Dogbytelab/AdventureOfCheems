import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  uid: text("uid").notNull().unique(), // Firebase UID
  email: text("email").notNull(),
  referralCode: text("referral_code").notNull().unique(),
  inviteCode: text("invite_code"), // Code used to join
  aocPoints: integer("aoc_points").default(0).notNull(),
  inviteCount: integer("invite_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  platform: text("platform").notNull(), // twitter, instagram, telegram
  url: text("url").notNull(),
  points: integer("points").default(1000).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
});

export const userTasks = pgTable("user_tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  taskId: text("task_id").references(() => tasks.id).notNull(),
  completed: boolean("completed").default(false).notNull(),
  completedAt: timestamp("completed_at"),
});

export const nftReservations = pgTable("nft_reservations", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  nftType: text("nft_type").notNull(), // normie, sigma, chad
  price: integer("price").notNull(), // in USD
  txHash: text("tx_hash").notNull().unique(), // Prevent reuse
  walletAddress: text("wallet_address").notNull(), // Sender's wallet
  solAmount: text("sol_amount").notNull(), // Exact SOL amount paid
  verified: boolean("verified").default(false).notNull(),
  verificationAttempts: integer("verification_attempts").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  referralCode: true, // Omit referralCode as it's generated server-side
}).extend({
  inviteCode: z.string().optional().nullable(), // Make invite code explicitly optional
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
});

export const insertUserTaskSchema = createInsertSchema(userTasks).omit({
  id: true,
  completedAt: true,
});

export const insertNFTReservationSchema = createInsertSchema(nftReservations).omit({
  id: true,
  verified: true,
  verificationAttempts: true,
  createdAt: true,
});

export type User = {
  id: string;
  uid: string;
  email: string;
  referralCode: string;
  inviteCode: string | null;
  aocPoints: number;
  inviteCount: number;
  multiplier?: number;
  createdAt: Date;
}
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type UserTask = typeof userTasks.$inferSelect;
export type InsertUserTask = z.infer<typeof insertUserTaskSchema>;
export type NFTReservation = typeof nftReservations.$inferSelect;
export type InsertNFTReservation = z.infer<typeof insertNFTReservationSchema>;