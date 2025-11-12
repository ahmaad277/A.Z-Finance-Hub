import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, numeric, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
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

// Investment opportunities (Sukuk-optimized)
export const investments = pgTable("investments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  platformId: varchar("platform_id").notNull(),
  name: text("name").notNull(),
  faceValue: numeric("face_value", { precision: 15, scale: 2 }).notNull(), // القيمة الاسمية - Principal amount (merged from 'amount')
  totalExpectedProfit: numeric("total_expected_profit", { precision: 15, scale: 2 }).notNull(), // إجمالي الأرباح المتوقعة
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(), // Expected end date
  durationMonths: integer("duration_months").notNull(), // Duration in months for validation & quick reference
  actualEndDate: timestamp("actual_end_date"), // Actual completion date
  expectedIrr: numeric("expected_irr", { precision: 5, scale: 2 }).notNull(), // percentage
  actualIrr: numeric("actual_irr", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("active"), // 'active' | 'completed' | 'pending'
  riskScore: integer("risk_score").default(50), // 0-100
  distributionFrequency: text("distribution_frequency").notNull(), // 'monthly' | 'quarterly' | 'semi_annually' | 'annually' | 'at_maturity' | 'custom'
  profitPaymentStructure: text("profit_payment_structure").notNull().default("periodic"), // 'periodic' = profits during term, 'at_maturity' = profits with principal at end
  isReinvestment: integer("is_reinvestment").notNull().default(0), // 0 = new investment, 1 = reinvestment from profits
  fundedFromCash: integer("funded_from_cash").notNull().default(0), // 0 = external funding, 1 = funded from cash balance
  lateDate: timestamp("late_date"), // Date when investment status became 'late'
  defaultedDate: timestamp("defaulted_date"), // Date when investment status became 'defaulted'
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({ 
  id: true, 
  actualIrr: true,
  actualEndDate: true,
  lateDate: true,
  defaultedDate: true,
}).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  durationMonths: z.number().int().positive(),
  faceValue: z.coerce.number().positive(),
  totalExpectedProfit: z.coerce.number().nonnegative(),
  expectedIrr: z.coerce.number().min(0).max(100),
  distributionFrequency: z.enum(['monthly', 'quarterly', 'semi_annually', 'annually', 'at_maturity', 'custom']),
  profitPaymentStructure: z.enum(['periodic', 'at_maturity']),
  status: z.enum(['active', 'late', 'defaulted', 'completed', 'pending']).optional(),
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

// Custom Distributions - For investments with custom/irregular distribution schedules
export const customDistributions = pgTable("custom_distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  investmentId: varchar("investment_id").notNull(),
  dueDate: timestamp("due_date").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull().default("profit"), // 'profit' | 'principal'
  notes: text("notes"), // Optional description for this distribution
});

export const insertCustomDistributionSchema = createInsertSchema(customDistributions).omit({ 
  id: true
}).extend({
  dueDate: z.coerce.date()
});
export type InsertCustomDistribution = z.infer<typeof insertCustomDistributionSchema>;
export type CustomDistribution = typeof customDistributions.$inferSelect;

// Schema for custom distribution in API payload (without investmentId)
export const apiCustomDistributionSchema = insertCustomDistributionSchema.omit({
  investmentId: true,
});
export type ApiCustomDistribution = z.infer<typeof apiCustomDistributionSchema>;

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
  cashflowId: varchar("cashflow_id"), // If related to a specific cashflow distribution
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

// Saved Scenarios - Vision 2040 Calculator scenarios
export const savedScenarios = pgTable("saved_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Nullable for single-user mode, future multi-user support
  name: text("name").notNull(),
  initialAmount: numeric("initial_amount", { precision: 15, scale: 2 }).notNull(),
  monthlyDeposit: numeric("monthly_deposit", { precision: 15, scale: 2 }).notNull(),
  expectedIRR: numeric("expected_irr", { precision: 5, scale: 2 }).notNull(),
  targetAmount: numeric("target_amount", { precision: 15, scale: 2 }).notNull(),
  durationYears: integer("duration_years").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertSavedScenarioSchema = createInsertSchema(savedScenarios).omit({ 
  id: true,
  createdAt: true,
  userId: true, // Managed automatically in backend
}).extend({
  initialAmount: z.coerce.number().positive(),
  monthlyDeposit: z.coerce.number().nonnegative(),
  expectedIRR: z.coerce.number().min(0).max(100),
  targetAmount: z.coerce.number().positive(),
  durationYears: z.coerce.number().int().min(1).max(50),
});
export type InsertSavedScenario = z.infer<typeof insertSavedScenarioSchema>;
export type SavedScenario = typeof savedScenarios.$inferSelect;

// Portfolio Snapshots - Checkpoint system for full portfolio backup/restore
export const portfolioSnapshots = pgTable("portfolio_snapshots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  snapshotData: jsonb("snapshot_data").notNull(), // Full portfolio state
  entityCounts: jsonb("entity_counts"), // Metadata: { investments: 5, cashflows: 60, ... }
  byteSize: integer("byte_size"), // Size of snapshot for validation
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({ 
  id: true,
  createdAt: true,
  byteSize: true,
  entityCounts: true,
}).extend({
  name: z.string().trim().min(1).max(120),
  snapshotData: z.any(), // Will be validated in storage layer
});
export type InsertPortfolioSnapshot = z.infer<typeof insertPortfolioSnapshotSchema>;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;

// Roles - Define user roles (Owner, Admin, Advanced Analyst, etc.)
export const roles = pgTable("roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(), // 'owner' | 'admin' | 'advanced_analyst' | 'basic_analyst' | 'data_entry' | 'viewer'
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  isSystem: integer("is_system").notNull().default(0), // 0 = custom, 1 = system (cannot be deleted)
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertRoleSchema = createInsertSchema(roles).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

// Permissions - Define granular permissions
export const permissions = pgTable("permissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(), // e.g., 'view_all_numbers', 'create_investment', 'impersonate'
  displayName: text("display_name").notNull(),
  displayNameAr: text("display_name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  category: text("category").notNull(), // 'data_access' | 'crud' | 'export' | 'admin' | 'advanced'
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({ id: true, createdAt: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

// Role Permissions - Many-to-many relationship between roles and permissions
export const rolePermissions = pgTable("role_permissions", {
  roleId: varchar("role_id").notNull(),
  permissionId: varchar("permission_id").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({ createdAt: true });
export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

// Users - Multi-user support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  passwordHash: text("password_hash"), // For non-Owner users
  roleId: varchar("role_id").notNull(),
  isActive: integer("is_active").notNull().default(1), // 0 = suspended, 1 = active
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  createdBy: varchar("created_by"), // User ID who created this user
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true,
  lastLogin: true,
}).extend({
  email: z.string().email(),
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User Settings - Now linked to a user
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"), // Nullable for backward compatibility, will link to Owner
  theme: text("theme").notNull().default("dark"), // 'dark' | 'light'
  language: text("language").notNull().default("en"), // 'en' | 'ar'
  viewMode: text("view_mode").notNull().default("pro"), // 'pro' | 'lite'
  fontSize: text("font_size").notNull().default("medium"), // 'small' | 'medium' | 'large'
  autoReinvest: integer("auto_reinvest").notNull().default(1), // 0 = no, 1 = yes
  targetCapital2040: numeric("target_capital_2040", { precision: 15, scale: 2 }),
  currency: text("currency").notNull().default("SAR"),
  securityEnabled: integer("security_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  pinHash: text("pin_hash"), // Hashed PIN for Owner authentication (backward compatibility)
  biometricEnabled: integer("biometric_enabled").notNull().default(0), // 0 = disabled, 1 = enabled
  biometricCredentialId: text("biometric_credential_id"), // WebAuthn credential ID
  collapsedSections: text("collapsed_sections"), // JSON array of collapsed section IDs
  alertsEnabled: integer("alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
  alertDaysBefore: integer("alert_days_before").notNull().default(7), // Days before cashflow due date to alert
  latePaymentAlertsEnabled: integer("late_payment_alerts_enabled").notNull().default(1), // 0 = disabled, 1 = enabled
  dashboardLayout: text("dashboard_layout"), // JSON string storing widget layouts (react-grid-layout format)
  hiddenWidgets: text("hidden_widgets"), // JSON array of hidden widget IDs
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({ id: true });
export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

// User Platforms - Platform-scoped permissions
export const userPlatforms = pgTable("user_platforms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  platformId: varchar("platform_id").notNull(),
  accessLevel: text("access_level").notNull().default("full"), // 'full' | 'read_only' | 'no_access'
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertUserPlatformSchema = createInsertSchema(userPlatforms).omit({ id: true, createdAt: true });
export type InsertUserPlatform = z.infer<typeof insertUserPlatformSchema>;
export type UserPlatform = typeof userPlatforms.$inferSelect;

// Temporary Roles - Time-limited role assignments
export const temporaryRoles = pgTable("temporary_roles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  roleId: varchar("role_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  reason: text("reason"),
  createdBy: varchar("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  isActive: integer("is_active").notNull().default(1), // 0 = expired/revoked, 1 = active
});

export const insertTemporaryRoleSchema = createInsertSchema(temporaryRoles).omit({ 
  id: true, 
  createdAt: true,
  isActive: true,
}).extend({
  expiresAt: z.coerce.date(),
});
export type InsertTemporaryRole = z.infer<typeof insertTemporaryRoleSchema>;
export type TemporaryRole = typeof temporaryRoles.$inferSelect;

// Audit Log - Track all sensitive actions
export const auditLog = pgTable("audit_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  actorId: varchar("actor_id"), // User who performed the action (null for system actions)
  actionType: text("action_type").notNull(), // 'view' | 'create' | 'update' | 'delete' | 'export' | 'impersonate' | 'login' | 'logout'
  targetType: text("target_type"), // 'investment' | 'user' | 'role' | 'platform' | 'settings'
  targetId: varchar("target_id"), // ID of the affected entity
  details: text("details"), // JSON string with additional context
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertAuditLogSchema = createInsertSchema(auditLog).omit({ 
  id: true, 
  timestamp: true 
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLog.$inferSelect;

// Export Requests - Approval workflow for exports
export const exportRequests = pgTable("export_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(),
  exportType: text("export_type").notNull(), // 'investments' | 'cashflows' | 'analytics' | 'full'
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertExportRequestSchema = createInsertSchema(exportRequests).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
});
export type InsertExportRequest = z.infer<typeof insertExportRequestSchema>;
export type ExportRequest = typeof exportRequests.$inferSelect;

// View Requests - Request access to masked/hidden fields
export const viewRequests = pgTable("view_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  requesterId: varchar("requester_id").notNull(),
  fieldType: text("field_type").notNull(), // 'amount' | 'irr' | 'sensitive_data'
  targetType: text("target_type"), // 'investment' | 'cashflow' | 'analytics'
  targetId: varchar("target_id"),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  approvedBy: varchar("approved_by"),
  approvedAt: timestamp("approved_at"),
  expiresAt: timestamp("expires_at"), // Temporary access expiry
  createdAt: timestamp("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const insertViewRequestSchema = createInsertSchema(viewRequests).omit({ 
  id: true, 
  createdAt: true,
  status: true,
  approvedBy: true,
  approvedAt: true,
}).extend({
  expiresAt: z.coerce.date().optional().nullable(),
});
export type InsertViewRequest = z.infer<typeof insertViewRequestSchema>;
export type ViewRequest = typeof viewRequests.$inferSelect;

// Impersonation Sessions - Track impersonation sessions
export const impersonationSessions = pgTable("impersonation_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull(), // The owner doing the impersonation
  targetUserId: varchar("target_user_id").notNull(), // The user being impersonated
  startedAt: timestamp("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  endedAt: timestamp("ended_at"),
  isActive: integer("is_active").notNull().default(1), // 0 = ended, 1 = active
  ipAddress: text("ip_address"),
});

export const insertImpersonationSessionSchema = createInsertSchema(impersonationSessions).omit({ 
  id: true, 
  startedAt: true,
  endedAt: true,
  isActive: true,
});
export type InsertImpersonationSession = z.infer<typeof insertImpersonationSessionSchema>;
export type ImpersonationSession = typeof impersonationSessions.$inferSelect;

// Extended types for frontend use
export type InvestmentWithPlatform = Investment & {
  platform: Platform;
  customDistributions?: CustomDistribution[];
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

// Extended types for permissions system
export type UserWithRole = User & {
  role: Role;
  settings?: UserSettings;
  temporaryRole?: TemporaryRole;
};

export type RoleWithPermissions = Role & {
  permissions: Permission[];
};

export type UserWithFullDetails = User & {
  role: RoleWithPermissions;
  settings?: UserSettings;
  platforms: UserPlatform[];
  temporaryRole?: TemporaryRole;
};

export type AuditLogWithActor = AuditLog & {
  actor?: User;
};

export type ExportRequestWithUser = ExportRequest & {
  requester: User;
  approver?: User;
};

export type ViewRequestWithUser = ViewRequest & {
  requester: User;
  approver?: User;
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
  customDistributions: many(customDistributions),
  alerts: many(alerts),
}));

export const cashflowsRelations = relations(cashflows, ({ one }) => ({
  investment: one(investments, {
    fields: [cashflows.investmentId],
    references: [investments.id],
  }),
}));

export const customDistributionsRelations = relations(customDistributions, ({ one }) => ({
  investment: one(investments, {
    fields: [customDistributions.investmentId],
    references: [investments.id],
  }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  investment: one(investments, {
    fields: [alerts.investmentId],
    references: [investments.id],
  }),
}));

export const savedScenariosRelations = relations(savedScenarios, ({ one }) => ({
  user: one(users, {
    fields: [savedScenarios.userId],
    references: [users.id],
  }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
  rolePermissions: many(rolePermissions),
  temporaryRoles: many(temporaryRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  userPlatforms: many(userPlatforms),
  temporaryRoles: many(temporaryRoles),
  auditLogs: many(auditLog),
  exportRequests: many(exportRequests),
  viewRequests: many(viewRequests),
  savedScenarios: many(savedScenarios),
}));

export const userPlatformsRelations = relations(userPlatforms, ({ one }) => ({
  user: one(users, {
    fields: [userPlatforms.userId],
    references: [users.id],
  }),
  platform: one(platforms, {
    fields: [userPlatforms.platformId],
    references: [platforms.id],
  }),
}));

export const temporaryRolesRelations = relations(temporaryRoles, ({ one }) => ({
  user: one(users, {
    fields: [temporaryRoles.userId],
    references: [users.id],
  }),
  role: one(roles, {
    fields: [temporaryRoles.roleId],
    references: [roles.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  actor: one(users, {
    fields: [auditLog.actorId],
    references: [users.id],
  }),
}));

export const exportRequestsRelations = relations(exportRequests, ({ one }) => ({
  requester: one(users, {
    fields: [exportRequests.requesterId],
    references: [users.id],
  }),
}));

export const viewRequestsRelations = relations(viewRequests, ({ one }) => ({
  requester: one(users, {
    fields: [viewRequests.requesterId],
    references: [users.id],
  }),
}));
