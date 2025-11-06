import {
  platforms,
  investments,
  cashflows,
  alerts,
  userSettings,
  cashTransactions,
  users,
  roles,
  permissions,
  rolePermissions,
  userPlatforms,
  temporaryRoles,
  auditLog,
  exportRequests,
  viewRequests,
  impersonationSessions,
  type Platform,
  type InsertPlatform,
  type Investment,
  type InsertInvestment,
  type Cashflow,
  type InsertCashflow,
  type Alert,
  type InsertAlert,
  type UserSettings,
  type InsertUserSettings,
  type CashTransaction,
  type InsertCashTransaction,
  type User,
  type InsertUser,
  type Role,
  type InsertRole,
  type Permission,
  type InsertPermission,
  type RolePermission,
  type InsertRolePermission,
  type UserPlatform,
  type InsertUserPlatform,
  type TemporaryRole,
  type InsertTemporaryRole,
  type AuditLog,
  type InsertAuditLog,
  type ExportRequest,
  type InsertExportRequest,
  type ViewRequest,
  type InsertViewRequest,
  type ImpersonationSession,
  type InsertImpersonationSession,
  type PortfolioStats,
  type AnalyticsData,
  type InvestmentWithPlatform,
  type CashflowWithInvestment,
  type UserWithRole,
  type RoleWithPermissions,
  type UserWithFullDetails,
  type AuditLogWithActor,
  type ExportRequestWithUser,
  type ViewRequestWithUser,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, sum, inArray } from "drizzle-orm";

export interface IStorage {
  // Platforms
  getPlatforms(): Promise<Platform[]>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  deletePlatform(id: string): Promise<boolean>;

  // Investments
  getInvestments(): Promise<InvestmentWithPlatform[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: string, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;

  // Cashflows
  getCashflows(): Promise<CashflowWithInvestment[]>;
  createCashflow(cashflow: InsertCashflow): Promise<Cashflow>;
  updateCashflow(id: string, cashflow: Partial<InsertCashflow>): Promise<Cashflow | undefined>;

  // Alerts
  getAlerts(): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: string): Promise<Alert | undefined>;

  // Cash Transactions
  getCashTransactions(): Promise<CashTransaction[]>;
  createCashTransaction(transaction: InsertCashTransaction): Promise<CashTransaction>;
  getCashBalance(): Promise<number>;

  // Analytics
  getPortfolioStats(): Promise<PortfolioStats>;
  getAnalyticsData(): Promise<AnalyticsData>;
  
  // Settings
  getSettings(userId?: string): Promise<UserSettings>;
  updateSettings(settings: Partial<InsertUserSettings>, userId?: string): Promise<UserSettings>;

  // Users
  getUsers(): Promise<UserWithRole[]>;
  getUser(id: string): Promise<UserWithFullDetails | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  suspendUser(id: string): Promise<User | undefined>;
  activateUser(id: string): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Roles
  getRoles(): Promise<Role[]>;
  getRole(id: string): Promise<RoleWithPermissions | undefined>;
  getRoleByName(name: string): Promise<Role | undefined>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, role: Partial<InsertRole>): Promise<Role | undefined>;
  deleteRole(id: string): Promise<boolean>;
  createRoleWithPermissions(roleData: InsertRole, permissionIds: string[]): Promise<RoleWithPermissions>;
  updateRoleWithPermissions(id: string, roleData: Partial<InsertRole>, permissionIds?: string[]): Promise<RoleWithPermissions | undefined>;

  // Permissions
  getPermissions(): Promise<Permission[]>;
  getUserPermissions(userId: string): Promise<Permission[]>;
  getRolePermissions(roleId: string): Promise<Permission[]>;
  assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission>;
  removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean>;
  userHasPermission(userId: string, permissionKey: string): Promise<boolean>;

  // User Platforms
  getUserPlatforms(userId: string): Promise<UserPlatform[]>;
  assignPlatformToUser(userPlatform: InsertUserPlatform): Promise<UserPlatform>;
  removePlatformFromUser(userId: string, platformId: string): Promise<boolean>;

  // Temporary Roles
  getActiveTemporaryRole(userId: string): Promise<TemporaryRole | undefined>;
  getActiveTemporaryRoles(): Promise<TemporaryRole[]>;
  getTemporaryRole(id: string): Promise<TemporaryRole | undefined>;
  getTemporaryRolesByUser(userId: string): Promise<TemporaryRole[]>;
  createTemporaryRole(tempRole: InsertTemporaryRole): Promise<TemporaryRole>;
  revokeTemporaryRole(id: string): Promise<boolean>;
  extendTemporaryRole(id: string, newExpiresAt: Date): Promise<boolean>;
  expireTemporaryRole(id: string): Promise<boolean>;
  checkAndExpireTemporaryRoles(): Promise<number>; // Returns count of expired roles

  // Audit Log
  logAudit(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters?: { actorId?: string; actionType?: string; targetType?: string; limit?: number }): Promise<AuditLogWithActor[]>;

  // Export Requests
  getExportRequests(status?: string): Promise<ExportRequestWithUser[]>;
  getExportRequest(id: string): Promise<ExportRequest | undefined>;
  getExportRequestsByUser(userId: string): Promise<ExportRequest[]>;
  getPendingExportRequests(): Promise<ExportRequestWithUser[]>;
  createExportRequest(request: InsertExportRequest): Promise<ExportRequest>;
  updateExportRequest(id: string, updates: Partial<ExportRequest>): Promise<ExportRequest | undefined>;
  approveExportRequest(id: string, approverId: string): Promise<ExportRequest | undefined>;
  rejectExportRequest(id: string, approverId: string, reason: string): Promise<ExportRequest | undefined>;

  // View Requests
  getViewRequests(status?: string): Promise<ViewRequestWithUser[]>;
  getViewRequest(id: string): Promise<ViewRequest | undefined>;
  getViewRequestsByUser(userId: string): Promise<ViewRequest[]>;
  getPendingViewRequests(): Promise<ViewRequestWithUser[]>;
  createViewRequest(request: InsertViewRequest): Promise<ViewRequest>;
  updateViewRequest(id: string, updates: Partial<ViewRequest>): Promise<ViewRequest | undefined>;
  approveViewRequest(id: string, approverId: string, expiresAt?: Date): Promise<ViewRequest | undefined>;
  rejectViewRequest(id: string, approverId: string): Promise<ViewRequest | undefined>;

  // Impersonation
  startImpersonation(session: InsertImpersonationSession): Promise<ImpersonationSession>;
  endImpersonation(sessionId: string): Promise<ImpersonationSession | undefined>;
  getActiveImpersonation(ownerId: string): Promise<ImpersonationSession | undefined>;
}

export class DatabaseStorage implements IStorage {
  // Platforms
  async getPlatforms(): Promise<Platform[]> {
    return await db.select().from(platforms);
  }

  async createPlatform(insertPlatform: InsertPlatform): Promise<Platform> {
    const [platform] = await db
      .insert(platforms)
      .values(insertPlatform)
      .returning();
    return platform;
  }

  async deletePlatform(id: string): Promise<boolean> {
    // Check if platform has any investments
    const platformInvestments = await db
      .select()
      .from(investments)
      .where(eq(investments.platformId, id));
    
    if (platformInvestments.length > 0) {
      throw new Error(`Cannot delete platform: ${platformInvestments.length} investment(s) are linked to this platform`);
    }

    // Delete the platform
    const result = await db
      .delete(platforms)
      .where(eq(platforms.id, id))
      .returning();
    
    return result.length > 0;
  }

  // Investments
  async getInvestments(): Promise<InvestmentWithPlatform[]> {
    const results = await db.query.investments.findMany({
      with: {
        platform: true,
      },
    });
    return results;
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    const [investment] = await db
      .select()
      .from(investments)
      .where(eq(investments.id, id));
    return investment || undefined;
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const [investment] = await db
      .insert(investments)
      .values({
        ...insertInvestment,
        actualIrr: null,
      })
      .returning();
    return investment;
  }

  async updateInvestment(id: string, update: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const [investment] = await db
      .update(investments)
      .set(update)
      .where(eq(investments.id, id))
      .returning();
    return investment || undefined;
  }

  // Cashflows
  async getCashflows(): Promise<CashflowWithInvestment[]> {
    const results = await db.query.cashflows.findMany({
      with: {
        investment: {
          with: {
            platform: true,
          },
        },
      },
    });
    return results;
  }

  async createCashflow(insertCashflow: InsertCashflow): Promise<Cashflow> {
    const [cashflow] = await db
      .insert(cashflows)
      .values({
        ...insertCashflow,
        receivedDate: null,
      })
      .returning();
    return cashflow;
  }

  async updateCashflow(id: string, update: Partial<InsertCashflow>): Promise<Cashflow | undefined> {
    const [cashflow] = await db
      .update(cashflows)
      .set(update)
      .where(eq(cashflows.id, id))
      .returning();
    return cashflow || undefined;
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return await db
      .select()
      .from(alerts)
      .orderBy(desc(alerts.createdAt));
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const [alert] = await db
      .insert(alerts)
      .values({
        ...insertAlert,
        read: 0,
      })
      .returning();
    return alert;
  }

  async markAlertAsRead(id: string): Promise<Alert | undefined> {
    const [alert] = await db
      .update(alerts)
      .set({ read: 1 })
      .where(eq(alerts.id, id))
      .returning();
    return alert || undefined;
  }

  // Cash Transactions
  async getCashTransactions(): Promise<CashTransaction[]> {
    return await db
      .select()
      .from(cashTransactions)
      .orderBy(desc(cashTransactions.date));
  }

  async createCashTransaction(transaction: InsertCashTransaction): Promise<CashTransaction> {
    const currentBalance = await this.getCashBalance();
    
    let amountChange = parseFloat(transaction.amount.toString());
    if (transaction.type === 'withdrawal' || transaction.type === 'investment') {
      amountChange = -amountChange;
    }
    
    const newBalance = currentBalance + amountChange;
    
    const [cashTransaction] = await db
      .insert(cashTransactions)
      .values({
        ...transaction,
        balanceAfter: newBalance.toString(),
      })
      .returning();
    
    return cashTransaction;
  }

  async getCashBalance(): Promise<number> {
    const [latestTransaction] = await db
      .select()
      .from(cashTransactions)
      .orderBy(desc(cashTransactions.createdAt))
      .limit(1);
    
    if (!latestTransaction) {
      return 0;
    }
    
    return parseFloat(latestTransaction.balanceAfter);
  }

  // Analytics
  async getPortfolioStats(): Promise<PortfolioStats> {
    const allInvestments = await db.select().from(investments);
    const allCashflows = await db.select().from(cashflows);

    // Helper to safely parse float values
    const safeParseFloat = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    };

    const totalCapital = allInvestments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + safeParseFloat(inv.amount), 0);

    const totalReturns = allCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + safeParseFloat(cf.amount), 0);

    const activeInvestments = allInvestments.filter((inv) => inv.status === "active").length;

    const averageIrr = allInvestments.length > 0
      ? allInvestments.reduce((sum, inv) => sum + safeParseFloat(inv.expectedIrr), 0) / allInvestments.length
      : 0;

    const upcomingCashflow = allCashflows
      .filter((cf) => cf.status === "expected" || cf.status === "upcoming")
      .reduce((sum, cf) => sum + safeParseFloat(cf.amount), 0);

    const target2040 = 10000000; // 10M SAR target
    const progressTo2040 = totalCapital > 0 ? (totalCapital / target2040) * 100 : 0;

    // Cash balance calculations
    const totalCashBalance = allCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + safeParseFloat(cf.amount), 0);

    // Only count active/pending reinvestments - completed ones have returned to cash
    const reinvestedAmount = allInvestments
      .filter((inv) => inv.isReinvestment === 1 && (inv.status === "active" || inv.status === "pending"))
      .reduce((sum, inv) => sum + safeParseFloat(inv.amount), 0);

    const availableCash = totalCashBalance - reinvestedAmount;

    // Average duration calculation (for completed investments)
    const completedInvestments = allInvestments.filter((inv) => inv.status === "completed");
    const averageDuration = completedInvestments.length > 0
      ? completedInvestments.reduce((sum, inv) => {
          const start = new Date(inv.startDate);
          const end = new Date(inv.endDate);
          const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + duration;
        }, 0) / completedInvestments.length
      : 0;

    // Distressed investments count (delayed 3+ months past end date)
    const now = new Date();
    const distressedCount = allInvestments.filter((inv) => {
      if (inv.status !== "active") return false;
      const endDate = new Date(inv.endDate);
      const monthsDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsDelayed >= 3;
    }).length;

    return {
      totalCapital,
      totalReturns,
      averageIrr,
      activeInvestments,
      upcomingCashflow,
      progressTo2040,
      totalCashBalance,
      availableCash,
      reinvestedAmount,
      averageDuration: Math.round(averageDuration),
      distressedCount,
    };
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    const allInvestments = await db.select().from(investments);
    const allPlatforms = await db.select().from(platforms);
    const allCashflows = await db.select().from(cashflows);

    // Helper to safely parse float values
    const safeParseFloat = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    };

    // Calculate real monthly returns from cashflow data
    const now = new Date();
    const monthlyReturns = this.calculateMonthlyReturns(allCashflows, now);

    // Platform allocation
    const platformAllocation = allPlatforms.map((platform) => {
      const platformInvestments = allInvestments.filter(
        (inv) => inv.platformId === platform.id
      );
      const amount = platformInvestments.reduce(
        (sum, inv) => sum + safeParseFloat(inv.amount),
        0
      );
      const totalAmount = allInvestments.reduce(
        (sum, inv) => sum + safeParseFloat(inv.amount),
        0
      );
      const percentage = totalAmount > 0 ? (amount / totalAmount) * 100 : 0;

      return {
        platform: platform.name,
        amount,
        percentage,
      };
    }).filter((p) => p.amount > 0);

    // Calculate real performance vs target based on actual data
    const performanceVsTarget = this.calculatePerformanceVsTarget(allInvestments, allCashflows);

    return {
      monthlyReturns,
      platformAllocation,
      performanceVsTarget,
    };
  }

  private calculateMonthlyReturns(cashflows: Cashflow[], currentDate: Date): Array<{ month: string; amount: number }> {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyData: { [key: string]: number } = {};

    // Helper to safely parse float values
    const safeParseFloat = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    };

    // Get last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
      const monthLabel = monthNames[date.getMonth()];
      monthlyData[monthKey] = 0;
      monthlyData[monthLabel] = 0; // Store with label for final output
    }

    // Sum up cashflows that were received in each month
    cashflows
      .filter((cf) => cf.status === "received" && cf.receivedDate)
      .forEach((cf) => {
        const receivedDate = new Date(cf.receivedDate!);
        const monthKey = `${receivedDate.getFullYear()}-${receivedDate.getMonth()}`;
        const monthLabel = monthNames[receivedDate.getMonth()];
        
        if (monthlyData[monthKey] !== undefined) {
          monthlyData[monthLabel] += safeParseFloat(cf.amount);
        }
      });

    // Return formatted data for last 6 months
    const result: Array<{ month: string; amount: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthLabel = monthNames[date.getMonth()];
      result.push({
        month: monthLabel,
        amount: Math.round(monthlyData[monthLabel] || 0),
      });
    }

    return result;
  }

  private calculatePerformanceVsTarget(investments: Investment[], cashflows: Cashflow[]): Array<{ year: number; actual: number; target: number }> {
    const currentYear = new Date().getFullYear();
    
    // Helper to safely parse float values
    const safeParseFloat = (value: string | number | null | undefined): number => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    };
    
    // Calculate actual portfolio value (invested capital + received returns)
    const investedCapital = investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + safeParseFloat(inv.amount), 0);
    
    const receivedReturns = cashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + safeParseFloat(cf.amount), 0);
    
    const currentValue = investedCapital + receivedReturns;

    // Vision 2040 progressive targets
    const targets = [
      { year: 2025, target: 500000 },
      { year: 2030, target: 2000000 },
      { year: 2035, target: 5000000 },
      { year: 2040, target: 10000000 },
    ];

    return targets.map((t) => ({
      year: t.year,
      actual: t.year === currentYear ? Math.round(currentValue) : 0,
      target: t.target,
    }));
  }

  // Settings
  async getSettings(userId?: string): Promise<UserSettings> {
    if (userId) {
      const [settings] = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      return settings;
    }
    
    // Get the first settings record, or create default if none exists (backward compatibility)
    const allSettings = await db.select().from(userSettings);
    
    if (allSettings.length === 0) {
      // Create default settings
      const [newSettings] = await db
        .insert(userSettings)
        .values({
          theme: "dark",
          language: "en",
          viewMode: "pro",
          fontSize: "medium",
          autoReinvest: 1,
          currency: "SAR",
        })
        .returning();
      return newSettings;
    }
    
    return allSettings[0];
  }

  async updateSettings(settings: Partial<InsertUserSettings>, userId?: string): Promise<UserSettings> {
    const currentSettings = await this.getSettings(userId);
    
    const [updatedSettings] = await db
      .update(userSettings)
      .set(settings)
      .where(eq(userSettings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }

  // Users
  async getUsers(): Promise<UserWithRole[]> {
    const results = await db.query.users.findMany({
      with: {
        role: true,
      },
    });
    return results;
  }

  async getUser(id: string): Promise<UserWithFullDetails | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        role: {
          with: {
            rolePermissions: {
              with: {
                permission: true,
              },
            },
          },
        },
        settings: true,
        userPlatforms: true,
        temporaryRoles: {
          where: and(
            eq(temporaryRoles.isActive, 1),
            gte(temporaryRoles.expiresAt, new Date())
          ),
          limit: 1,
        },
      },
    });

    if (!result) return undefined;

    // Transform rolePermissions to permissions array
    const permissions = result.role.rolePermissions.map(rp => rp.permission);
    const roleWithPermissions = { ...result.role, permissions };
    
    return {
      ...result,
      role: roleWithPermissions,
      platforms: result.userPlatforms,
      temporaryRole: result.temporaryRoles[0],
    };
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, update: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(update)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async suspendUser(id: string): Promise<User | undefined> {
    return this.updateUser(id, { isActive: 0 });
  }

  async activateUser(id: string): Promise<User | undefined> {
    return this.updateUser(id, { isActive: 1 });
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db
      .delete(users)
      .where(eq(users.id, id));
    return result.rowCount! > 0;
  }

  // Roles
  async getRoles(): Promise<Role[]> {
    return await db.select().from(roles);
  }

  async getRole(id: string): Promise<RoleWithPermissions | undefined> {
    const result = await db.query.roles.findFirst({
      where: eq(roles.id, id),
      with: {
        rolePermissions: {
          with: {
            permission: true,
          },
        },
      },
    });

    if (!result) return undefined;

    const permissions = result.rolePermissions.map(rp => rp.permission);
    return { ...result, permissions };
  }

  async getRoleByName(name: string): Promise<Role | undefined> {
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name));
    return role || undefined;
  }

  async createRole(insertRole: InsertRole): Promise<Role> {
    const [role] = await db
      .insert(roles)
      .values(insertRole)
      .returning();
    return role;
  }

  async updateRole(id: string, update: Partial<InsertRole>): Promise<Role | undefined> {
    const [role] = await db
      .update(roles)
      .set(update)
      .where(eq(roles.id, id))
      .returning();
    return role || undefined;
  }

  async deleteRole(id: string): Promise<boolean> {
    const result = await db
      .delete(roles)
      .where(eq(roles.id, id));
    return result.rowCount! > 0;
  }

  // Atomic role operations with permissions
  async createRoleWithPermissions(roleData: InsertRole, permissionIds: string[]): Promise<RoleWithPermissions> {
    return await db.transaction(async (tx) => {
      // Create role
      const [role] = await tx
        .insert(roles)
        .values(roleData)
        .returning();
      
      // Assign permissions
      if (permissionIds.length > 0) {
        await tx
          .insert(rolePermissions)
          .values(permissionIds.map(permissionId => ({
            roleId: role.id,
            permissionId,
          })));
      }
      
      // Fetch and return role with permissions within transaction
      const result = await tx.query.roles.findFirst({
        where: eq(roles.id, role.id),
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      });
      
      if (!result) throw new Error('Failed to create role');
      
      const permissions = result.rolePermissions.map(rp => rp.permission);
      return { ...result, permissions };
    });
  }

  async updateRoleWithPermissions(
    id: string,
    roleData: Partial<InsertRole>,
    permissionIds?: string[]
  ): Promise<RoleWithPermissions | undefined> {
    return await db.transaction(async (tx) => {
      // Update role
      const [role] = await tx
        .update(roles)
        .set(roleData)
        .where(eq(roles.id, id))
        .returning();
      
      if (!role) return undefined;
      
      // Update permissions if provided
      if (permissionIds !== undefined) {
        // Remove all existing permissions
        await tx
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, id));
        
        // Insert new permissions
        if (permissionIds.length > 0) {
          await tx
            .insert(rolePermissions)
            .values(permissionIds.map(permissionId => ({
              roleId: id,
              permissionId,
            })));
        }
      }
      
      // Fetch and return role with permissions within transaction
      const result = await tx.query.roles.findFirst({
        where: eq(roles.id, id),
        with: {
          rolePermissions: {
            with: {
              permission: true,
            },
          },
        },
      });
      
      if (!result) return undefined;
      
      const permissions = result.rolePermissions.map(rp => rp.permission);
      return { ...result, permissions };
    });
  }

  // Permissions
  async getPermissions(): Promise<Permission[]> {
    return await db.select().from(permissions);
  }

  async getUserPermissions(userId: string): Promise<Permission[]> {
    const user = await this.getUser(userId);
    if (!user) return [];

    // Check for active temporary role first
    const tempRole = await this.getActiveTemporaryRole(userId);
    const effectiveRoleId = tempRole?.roleId || user.role.id;

    return this.getRolePermissions(effectiveRoleId);
  }

  async getRolePermissions(roleId: string): Promise<Permission[]> {
    const result = await db.query.rolePermissions.findMany({
      where: eq(rolePermissions.roleId, roleId),
      with: {
        permission: true,
      },
    });

    return result.map(rp => rp.permission);
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<RolePermission> {
    const [rp] = await db
      .insert(rolePermissions)
      .values({ roleId, permissionId })
      .returning();
    return rp;
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<boolean> {
    const result = await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          eq(rolePermissions.permissionId, permissionId)
        )
      );
    return result.rowCount! > 0;
  }

  async userHasPermission(userId: string, permissionKey: string): Promise<boolean> {
    const userPerms = await this.getUserPermissions(userId);
    return userPerms.some(p => p.key === permissionKey);
  }

  // User Platforms
  async getUserPlatforms(userId: string): Promise<UserPlatform[]> {
    return await db
      .select()
      .from(userPlatforms)
      .where(eq(userPlatforms.userId, userId));
  }

  async assignPlatformToUser(userPlatform: InsertUserPlatform): Promise<UserPlatform> {
    const [up] = await db
      .insert(userPlatforms)
      .values(userPlatform)
      .returning();
    return up;
  }

  async removePlatformFromUser(userId: string, platformId: string): Promise<boolean> {
    const result = await db
      .delete(userPlatforms)
      .where(
        and(
          eq(userPlatforms.userId, userId),
          eq(userPlatforms.platformId, platformId)
        )
      );
    return result.rowCount! > 0;
  }

  // Temporary Roles
  async getActiveTemporaryRole(userId: string): Promise<TemporaryRole | undefined> {
    const [tempRole] = await db
      .select()
      .from(temporaryRoles)
      .where(
        and(
          eq(temporaryRoles.userId, userId),
          eq(temporaryRoles.isActive, 1),
          gte(temporaryRoles.expiresAt, new Date())
        )
      )
      .orderBy(desc(temporaryRoles.createdAt))
      .limit(1);
    return tempRole || undefined;
  }

  async createTemporaryRole(tempRole: InsertTemporaryRole): Promise<TemporaryRole> {
    const [tr] = await db
      .insert(temporaryRoles)
      .values(tempRole)
      .returning();
    return tr;
  }

  async expireTemporaryRole(id: string): Promise<boolean> {
    const result = await db
      .update(temporaryRoles)
      .set({ isActive: 0 })
      .where(eq(temporaryRoles.id, id));
    return result.rowCount! > 0;
  }

  async checkAndExpireTemporaryRoles(): Promise<number> {
    const result = await db
      .update(temporaryRoles)
      .set({ isActive: 0 })
      .where(
        and(
          eq(temporaryRoles.isActive, 1),
          lte(temporaryRoles.expiresAt, new Date())
        )
      );
    return result.rowCount || 0;
  }

  async getActiveTemporaryRoles(): Promise<TemporaryRole[]> {
    return await db
      .select()
      .from(temporaryRoles)
      .where(
        and(
          eq(temporaryRoles.isActive, 1),
          gte(temporaryRoles.expiresAt, new Date())
        )
      )
      .orderBy(desc(temporaryRoles.createdAt));
  }

  async getTemporaryRole(id: string): Promise<TemporaryRole | undefined> {
    const [tempRole] = await db
      .select()
      .from(temporaryRoles)
      .where(eq(temporaryRoles.id, id));
    return tempRole || undefined;
  }

  async getTemporaryRolesByUser(userId: string): Promise<TemporaryRole[]> {
    return await db
      .select()
      .from(temporaryRoles)
      .where(eq(temporaryRoles.userId, userId))
      .orderBy(desc(temporaryRoles.createdAt));
  }

  async revokeTemporaryRole(id: string): Promise<boolean> {
    const result = await db
      .update(temporaryRoles)
      .set({ isActive: 0 })
      .where(eq(temporaryRoles.id, id));
    return result.rowCount! > 0;
  }

  async extendTemporaryRole(id: string, newExpiresAt: Date): Promise<boolean> {
    const result = await db
      .update(temporaryRoles)
      .set({ expiresAt: newExpiresAt })
      .where(eq(temporaryRoles.id, id));
    return result.rowCount! > 0;
  }

  // Audit Log
  async logAudit(log: InsertAuditLog): Promise<AuditLog> {
    const [auditEntry] = await db
      .insert(auditLog)
      .values(log)
      .returning();
    return auditEntry;
  }

  async getAuditLogs(filters?: { 
    actorId?: string; 
    actionType?: string; 
    targetType?: string; 
    limit?: number 
  }): Promise<AuditLogWithActor[]> {
    const conditions = [];
    
    if (filters?.actorId) {
      conditions.push(eq(auditLog.actorId, filters.actorId));
    }
    if (filters?.actionType) {
      conditions.push(eq(auditLog.actionType, filters.actionType));
    }
    if (filters?.targetType) {
      conditions.push(eq(auditLog.targetType, filters.targetType));
    }

    const results = await db.query.auditLog.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        actor: true,
      },
      orderBy: desc(auditLog.timestamp),
      limit: filters?.limit || 100,
    });

    // Convert null actors to undefined for type compatibility
    return results.map(r => ({
      ...r,
      actor: r.actor || undefined,
    }));
  }

  // Export Requests
  async getExportRequests(status?: string): Promise<ExportRequestWithUser[]> {
    const results = await db.query.exportRequests.findMany({
      where: status ? eq(exportRequests.status, status) : undefined,
      with: {
        requester: true,
      },
      orderBy: desc(exportRequests.createdAt),
    });

    return results as ExportRequestWithUser[];
  }

  async createExportRequest(request: InsertExportRequest): Promise<ExportRequest> {
    const [exportReq] = await db
      .insert(exportRequests)
      .values(request)
      .returning();
    return exportReq;
  }

  async approveExportRequest(id: string, approverId: string): Promise<ExportRequest | undefined> {
    const [exportReq] = await db
      .update(exportRequests)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(exportRequests.id, id))
      .returning();
    return exportReq || undefined;
  }

  async rejectExportRequest(id: string, approverId: string, reason: string): Promise<ExportRequest | undefined> {
    const [exportReq] = await db
      .update(exportRequests)
      .set({
        status: 'rejected',
        approvedBy: approverId,
        rejectionReason: reason,
        approvedAt: new Date(),
      })
      .where(eq(exportRequests.id, id))
      .returning();
    return exportReq || undefined;
  }

  async getExportRequest(id: string): Promise<ExportRequest | undefined> {
    const [exportReq] = await db
      .select()
      .from(exportRequests)
      .where(eq(exportRequests.id, id));
    return exportReq || undefined;
  }

  async updateExportRequest(id: string, updates: Partial<ExportRequest>): Promise<ExportRequest | undefined> {
    const [exportReq] = await db
      .update(exportRequests)
      .set(updates)
      .where(eq(exportRequests.id, id))
      .returning();
    return exportReq || undefined;
  }

  async getExportRequestsByUser(userId: string): Promise<ExportRequest[]> {
    return await db
      .select()
      .from(exportRequests)
      .where(eq(exportRequests.requesterId, userId))
      .orderBy(desc(exportRequests.createdAt));
  }

  async getPendingExportRequests(): Promise<ExportRequestWithUser[]> {
    const results = await db.query.exportRequests.findMany({
      where: eq(exportRequests.status, 'pending'),
      with: {
        requester: true,
      },
      orderBy: desc(exportRequests.createdAt),
    });
    return results as ExportRequestWithUser[];
  }

  // View Requests
  async getViewRequests(status?: string): Promise<ViewRequestWithUser[]> {
    const results = await db.query.viewRequests.findMany({
      where: status ? eq(viewRequests.status, status) : undefined,
      with: {
        requester: true,
      },
      orderBy: desc(viewRequests.createdAt),
    });

    return results as ViewRequestWithUser[];
  }

  async createViewRequest(request: InsertViewRequest): Promise<ViewRequest> {
    const [viewReq] = await db
      .insert(viewRequests)
      .values(request)
      .returning();
    return viewReq;
  }

  async approveViewRequest(id: string, approverId: string, expiresAt?: Date): Promise<ViewRequest | undefined> {
    const [viewReq] = await db
      .update(viewRequests)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        expiresAt: expiresAt || null,
      })
      .where(eq(viewRequests.id, id))
      .returning();
    return viewReq || undefined;
  }

  async rejectViewRequest(id: string, approverId: string): Promise<ViewRequest | undefined> {
    const [viewReq] = await db
      .update(viewRequests)
      .set({
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
      })
      .where(eq(viewRequests.id, id))
      .returning();
    return viewReq || undefined;
  }

  async getViewRequest(id: string): Promise<ViewRequest | undefined> {
    const [viewReq] = await db
      .select()
      .from(viewRequests)
      .where(eq(viewRequests.id, id));
    return viewReq || undefined;
  }

  async updateViewRequest(id: string, updates: Partial<ViewRequest>): Promise<ViewRequest | undefined> {
    const [viewReq] = await db
      .update(viewRequests)
      .set(updates)
      .where(eq(viewRequests.id, id))
      .returning();
    return viewReq || undefined;
  }

  async getViewRequestsByUser(userId: string): Promise<ViewRequest[]> {
    return await db
      .select()
      .from(viewRequests)
      .where(eq(viewRequests.requesterId, userId))
      .orderBy(desc(viewRequests.createdAt));
  }

  async getPendingViewRequests(): Promise<ViewRequestWithUser[]> {
    const results = await db.query.viewRequests.findMany({
      where: eq(viewRequests.status, 'pending'),
      with: {
        requester: true,
      },
      orderBy: desc(viewRequests.createdAt),
    });
    return results as ViewRequestWithUser[];
  }

  // Impersonation
  async startImpersonation(session: InsertImpersonationSession): Promise<ImpersonationSession> {
    const [impSession] = await db
      .insert(impersonationSessions)
      .values(session)
      .returning();
    return impSession;
  }

  async endImpersonation(sessionId: string): Promise<ImpersonationSession | undefined> {
    const [impSession] = await db
      .update(impersonationSessions)
      .set({
        isActive: 0,
        endedAt: new Date(),
      })
      .where(eq(impersonationSessions.id, sessionId))
      .returning();
    return impSession || undefined;
  }

  async getActiveImpersonation(ownerId: string): Promise<ImpersonationSession | undefined> {
    const [impSession] = await db
      .select()
      .from(impersonationSessions)
      .where(
        and(
          eq(impersonationSessions.ownerId, ownerId),
          eq(impersonationSessions.isActive, 1)
        )
      )
      .orderBy(desc(impersonationSessions.startedAt))
      .limit(1);
    return impSession || undefined;
  }
}

export const storage = new DatabaseStorage();
