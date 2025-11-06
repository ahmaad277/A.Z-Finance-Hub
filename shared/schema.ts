import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Platform types: Sukuk, Manfa'a, Lendo
export const platforms = pgTable("platforms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'sukuk' | 'manfaa' | 'lendo'
  logoUrl: text("logo_url"),
});

export const insertPlatformSchema = createInsertSchema(platforms).omit({ id: true });
export type InsertPlatform = z.infer<typeof insertPlatformSchema>;
export type Platform = typeof platforms.$inferSelect;

// Investment opportunities
export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformId: varchar("platform_id").notNull(),
  name: text("name").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(), // Expected end date
  actualEndDate: timestamp("actual_end_date"), // Actual completion date
  expectedIrr: numeric("expected_irr", { precision: 5, scale: 2 }).notNull(), // percentage
  actualIrr: numeric("actual_irr", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'pending'
  riskScore: integer("risk_score").default(50), // 0-100
  distributionFrequency: text("distribution_frequency").notNull(), // 'quarterly' | 'semi-annual' | 'annual'
  isReinvestment: integer("is_reinvestment").notNull().default(0), // 0 = new investment, 1 = reinvestment from profits
  fundedFromCash: integer("funded_from_cash").notNull().default(0), // 0 = external funding, 1 = funded from cash balance
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({ 
  id: true, 
  actualIrr: true 
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  actualEndDate: z.coerce.date().optional().nullable()
});
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

// Cashflow distributions (profits/returns)
export const cashflows = pgTable("cashflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investmentId: varchar("investment_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  receivedDate: timestamp("received_date"),
  status: text("status").notNull().default("upcoming"), // 'received' | 'expected' | 'upcoming'
  type: text("type").notNull().default("profit"), // 'profit' | 'principal'
});

export const insertCashflowSchema = createInsertSchema(cashflows).omit({ 
  id: true,
  receivedDate: true 
}).extend({
  dueDate: z.coerce.date()
});
export type InsertCashflow = z.infer<typeof insertCashflowSchema>;
export type Cashflow = typeof cashflows.$inferSelect;

// Smart alerts and notifications
export const alerts = pgTable("alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // 'distribution' | 'maturity' | 'opportunity' | 'risk'
  title: text("title").notNull(),
  message: text("message").notNull(),
  investmentId: varchar("investment_id"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  read: integer("read").notNull().default(0), // 0 = unread, 1 = read
  severity: text("severity").notNull().default("info"), // 'info' | 'warning' | 'success' | 'error'
});

export const insertAlertSchema = createInsertSchema(alerts).omit({ 
  id: true, 
  createdAt: true 
});
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

// Cash Balance Transactions - Track all cash movements
export const cashTransactions = pgTable("cash_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull(), // 'deposit' | 'withdrawal' | 'investment' | 'distribution' | 'transfer'
  source: text("source"), // 'transfer' | 'profit' | 'deposit' | 'investment_return'
  notes: text("notes"),
  date: timestamp("date").notNull().default(sql`CURRENT_TIMESTAMP`),
  investmentId: varchar("investment_id"), // If related to an investment
  balanceAfter: numeric("balance_after", { precision: 15, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertCashTransactionSchema = createInsertSchema(cashTransactions).omit({ 
  id: true,
  createdAt: true,
  balanceAfter: true,
}).extend({
  date: z.coerce.date(),
});
export type InsertCashTransaction = z.infer<typeof insertCashTransactionSchema>;
export type CashTransaction = typeof cashTransactions.$inferSelect;

// User preferences and settings
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  theme: text("theme").notNull().default("dark"), // 'dark' | 'light'
  language: text("language").notNull().default("en"), // 'en' | 'ar'
  viewMode: text("view_mode").notNull().default("pro"), // 'pro' | 'lite'
  fontSize: text("font_size").notNull().default("medium"), // 'small' | 'medium' | 'large'
  autoReinvest: integer("auto_reinvest").notNull().default(1), // 0 = no, 1 = yes
  targetCapital2040: numeric("target_capital_2040", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("SAR"),
  securityEnabled: integer("security_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  pinHash: text("pin_hash"), // Hashed PIN for authentication
  biometricEnabled: integer("biometric_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  biometricCredentialId: text("biometric_credential_id"), // WebAuthn credential ID
  collapsedSections: text("collapsed_sections"), // JSON array of collapsed section IDs
  alertsEnabled: integer("alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
  alertDaysBefore: integer("alert_days_before").notNull().default(7), // Days before cashflow due date to alert
  latePaymentAlertsEnabled: integer("late_payment_alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// Extended types for frontend use
export type InvestmentWithPlatform = Investment & {
  platform: Platform;
};

export type CashflowWithInvestment = Cashflow & {
  investment: InvestmentWithPlatform;
};

export type PortfolioStats = {
  totalCapital: number;
  totalReturns: number;
  averageIrr: number;
  activeInvestments: number;
  upcomingCashflow: number;
  progressTo2040: number;
  totalCashBalance: number;
  availableCash: number;
  reinvestedAmount: number;
  averageDuration: number;
  distressedCount: number;
};

export type PlatformCashBreakdown = {
  platformId: string;
  platformName: string;
  totalReceived: number;
  reinvested: number;
  available: number;
};

export type AnalyticsData = {
  monthlyReturns: Array<{ month: string; amount: number }>;
  platformAllocation: Array<{ platform: string; amount: number; percentage: number }>;
  performanceVsTarget: Array<{ year: number; actual: number; target: number }>;
};

// Relations
export const platformsRelations = relations(platforms, ({ many }) => ({
  investments: many(investments),
}));

export const investmentsRelations = relations(investments, ({ one, many }) => ({
  platform: one(platforms, {
    fields: [investments.platformId],
    references: [platforms.id],
  }),
  cashflows: many(cashflows),
  alerts: many(alerts),
}));

export const cashflowsRelations = relations(cashflows, ({ one }) => ({
  investment: one(investments, {
    fields: [cashflows.investmentId],
    references: [investments.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  investment: one(investments, {
    fields: [alerts.investmentId],
    references: [investments.id],
  }),
}));
