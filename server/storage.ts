import {
  platforms,
  investments,
  cashflows,
  customDistributions,
  alerts,
  userSettings,
  cashTransactions,
  savedScenarios,
  portfolioSnapshots,
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
  type SavedScenario,
  type InsertSavedScenario,
  type PortfolioSnapshot,
  type InsertPortfolioSnapshot,
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
  type ApiCustomDistribution,
} from "@shared/schema";
import { generateCashflows, type DistributionFrequency, type ProfitPaymentStructure } from "@shared/cashflow-generator";
import { db, pool } from "./db";
import { eq, desc, and, or, gte, lte, sum, inArray, sql } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Session Store (for authentication)
  sessionStore: any; // session.Store type

  // Platforms
  getPlatforms(): Promise<Platform[]>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;
  deletePlatform(id: string): Promise<boolean>;

  // Investments
  getInvestments(): Promise<InvestmentWithPlatform[]>;
  getInvestment(id: string): Promise<Investment | undefined>;
  createInvestment(investment: InsertInvestment, customDistributionPayload?: ApiCustomDistribution[]): Promise<InvestmentWithPlatform>;
  updateInvestment(id: string, investment: Partial<InsertInvestment>, customDistributionPayload?: ApiCustomDistribution[]): Promise<InvestmentWithPlatform | undefined>;
  updateInvestmentStatus(id: string, status: 'active' | 'late' | 'defaulted' | 'completed' | 'pending', lateDate?: Date | null, defaultedDate?: Date | null): Promise<Investment | undefined>;
  deleteInvestment(id: string): Promise<boolean>;
  getCustomDistributions(investmentId: string): Promise<ApiCustomDistribution[]>;
  completeAllPendingPayments(investmentId: string, receivedDate: Date, options?: { clearLateStatus?: boolean; updateLateInfo?: { lateDays: number } }): Promise<{ investment: Investment; updatedCount: number; totalAmount: number } | null>;

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
  getCashBalance(): Promise<{ total: number; byPlatform: Record<string, number> }>;

  // Analytics
  getPortfolioStats(): Promise<PortfolioStats>;
  getAnalyticsData(): Promise<AnalyticsData>;
  
  // Settings
  getSettings(userId?: string): Promise<UserSettings>;
  updateSettings(settings: Partial<InsertUserSettings>, userId?: string): Promise<UserSettings>;

  // Saved Scenarios
  getSavedScenarios(userId?: string): Promise<SavedScenario[]>;
  createSavedScenario(scenario: InsertSavedScenario, userId?: string): Promise<SavedScenario>;
  deleteSavedScenario(id: string): Promise<boolean>;

  // Portfolio Snapshots (Checkpoints)
  getSnapshots(): Promise<PortfolioSnapshot[]>;
  createSnapshot(name: string): Promise<PortfolioSnapshot>;
  restoreSnapshot(id: string): Promise<{ success: boolean; entitiesRestored: any }>;
  deleteSnapshot(id: string): Promise<boolean>;

  // Users
  getUsers(): Promise<UserWithRole[]>;
  getUser(id: string): Promise<UserWithFullDetails | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserLastLogin(userId: string): Promise<void>;
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
  
  // Data Management
  resetAllData(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

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

  async createInvestment(insertInvestment: InsertInvestment, customDistributionPayload?: ApiCustomDistribution[]): Promise<InvestmentWithPlatform> {
    // Use fundedFromCash as provided (default 0 to maintain existing behavior)
    const fundedFromCash = insertInvestment.fundedFromCash || 0;
    
    // Wrap all operations in a transaction for atomicity
    const investmentId = await db.transaction(async (tx) => {
      // If funded from cash, validate platform has sufficient balance
      if (fundedFromCash === 1 && insertInvestment.platformId) {
        // Step 1: Lock platform investments to prevent race conditions
        const platformInvestments = await tx
          .select({ id: investments.id })
          .from(investments)
          .where(eq(investments.platformId, insertInvestment.platformId))
          .for('update');
        
        const platformInvestmentIds = platformInvestments.map(inv => inv.id);
        
        // Step 2: Lock and fetch relevant cash transactions
        const platformTransactions = await tx
          .select()
          .from(cashTransactions)
          .where(
            or(
              eq(cashTransactions.platformId, insertInvestment.platformId),
              platformInvestmentIds.length > 0 
                ? and(
                    inArray(cashTransactions.investmentId, platformInvestmentIds),
                    sql`${cashTransactions.platformId} IS NULL`
                  )
                : sql`false`
            )
          )
          .for('update'); // Lock rows without aggregation
        
        // Step 3: Calculate balance in-memory from locked rows
        let platformBalance = 0;
        for (const txn of platformTransactions) {
          const amount = parseFloat(txn.amount);
          const effect = ['deposit', 'distribution'].includes(txn.type) ? amount : -amount;
          platformBalance += effect;
        }
        
        const requiredAmount = parseFloat(insertInvestment.faceValue as any);
        
        if (platformBalance < requiredAmount) {
          throw new Error(`Insufficient cash balance for platform. Required: ${requiredAmount.toFixed(2)} SAR, Available: ${platformBalance.toFixed(2)} SAR`);
        }
      }
      
      // Create the investment (convert numbers to strings for database)
      const [investment] = await tx
        .insert(investments)
        .values({
          platformId: insertInvestment.platformId,
          name: insertInvestment.name,
          faceValue: String(insertInvestment.faceValue),
          totalExpectedProfit: String(insertInvestment.totalExpectedProfit),
          startDate: insertInvestment.startDate,
          endDate: insertInvestment.endDate,
          durationMonths: insertInvestment.durationMonths,
          expectedIrr: String(insertInvestment.expectedIrr),
          distributionFrequency: insertInvestment.distributionFrequency,
          profitPaymentStructure: insertInvestment.profitPaymentStructure || 'periodic',
          status: insertInvestment.status || 'active',
          riskScore: insertInvestment.riskScore || 50,
          isReinvestment: insertInvestment.isReinvestment || 0,
          fundedFromCash,
          actualIrr: null,
          actualEndDate: null,
        })
        .returning();
      
      // If funded from cash, deduct from cash balance using face value (principal invested)
      if (fundedFromCash === 1) {
        await tx.insert(cashTransactions).values({
          amount: String(insertInvestment.faceValue),
          type: 'investment',
          source: 'investment',
          notes: `Investment: ${insertInvestment.name}`,
          date: insertInvestment.startDate,
          investmentId: investment.id,
          platformId: insertInvestment.platformId,
          balanceAfter: '0', // Deprecated field
        });
      }
      
      // Handle cashflow generation based on custom distributions
      if (customDistributionPayload && customDistributionPayload.length > 0) {
        // Save custom distributions and create matching cashflows
        await this.saveCustomDistributions(tx, investment.id, customDistributionPayload);
      } else {
        // Auto-generate cashflows based on distribution frequency
        await this.generateCashflowsForInvestment(tx, investment);
      }
      
      return investment.id;
    });

    // Fetch and return the investment with enriched platform data
    const enrichedInvestment = await db.query.investments.findFirst({
      where: eq(investments.id, investmentId),
      with: {
        platform: true,
        customDistributions: true,
      },
    });

    if (!enrichedInvestment) {
      throw new Error('Failed to retrieve created investment');
    }

    return enrichedInvestment;
  }
  
  /**
   * Save custom distributions and create matching cashflows
   */
  private async saveCustomDistributions(tx: any, investmentId: string, distributions: ApiCustomDistribution[]): Promise<void> {
    // Insert custom distributions
    const customDistributionRecords = distributions.map(dist => ({
      investmentId,
      dueDate: dist.dueDate,
      amount: String(dist.amount),
      type: dist.type,
      notes: dist.notes || null,
    }));
    
    if (customDistributionRecords.length > 0) {
      await tx.insert(customDistributions).values(customDistributionRecords);
    }
    
    // Create matching cashflows
    const cashflowRecords = distributions.map(dist => ({
      investmentId,
      dueDate: dist.dueDate,
      amount: String(dist.amount),
      status: 'expected' as const,
      type: dist.type as 'profit' | 'principal',
    }));
    
    if (cashflowRecords.length > 0) {
      await tx.insert(cashflows).values(cashflowRecords);
    }
  }
  
  /**
   * Generate cashflows automatically for an investment using smart Sukuk logic
   * Uses shared/cashflow-generator.ts for intelligent distribution
   */
  private async generateCashflowsForInvestment(tx: any, investment: Investment): Promise<void> {
    const startDate = new Date(investment.startDate);
    const endDate = new Date(investment.endDate);
    
    // Validate dates
    if (endDate <= startDate) {
      console.warn(`Invalid investment dates: end date (${endDate}) must be after start date (${startDate}). Creating single principal cashflow.`);
      await tx.insert(cashflows).values([{
        investmentId: investment.id,
        dueDate: endDate,
        amount: String((parseFloat(investment.faceValue) + parseFloat(investment.totalExpectedProfit || "0")).toFixed(2)),
        status: 'expected' as const,
        type: 'principal' as const,
      }]);
      return;
    }
    
    const faceValue = parseFloat(investment.faceValue);
    const totalExpectedProfit = parseFloat(investment.totalExpectedProfit || "0");
    
    const generatedCashflows = generateCashflows({
      startDate,
      endDate,
      faceValue,
      totalExpectedProfit,
      distributionFrequency: investment.distributionFrequency as DistributionFrequency,
      profitPaymentStructure: (investment.profitPaymentStructure as ProfitPaymentStructure) || 'periodic',
    });
    
    const cashflowsToCreate = generatedCashflows.map(cf => ({
      investmentId: investment.id,
      dueDate: cf.dueDate,
      amount: String(cf.amount.toFixed(2)),
      status: 'expected' as const,
      type: cf.type as 'profit' | 'principal',
    }));
    
    if (cashflowsToCreate.length > 0) {
      await tx.insert(cashflows).values(cashflowsToCreate);
    }
  }

  async updateInvestment(id: string, update: Partial<InsertInvestment>, customDistributionPayload?: ApiCustomDistribution[]): Promise<InvestmentWithPlatform | undefined> {
    const updated = await db.transaction(async (tx) => {
      // Convert numbers to strings for database - explicit type-safe mapping
      const dbUpdate: Partial<Investment> = {};
      
      // String fields
      if (update.name !== undefined) dbUpdate.name = update.name;
      if (update.platformId !== undefined) dbUpdate.platformId = update.platformId;
      if (update.status !== undefined) dbUpdate.status = update.status;
      if (update.distributionFrequency !== undefined) dbUpdate.distributionFrequency = update.distributionFrequency;
      if (update.profitPaymentStructure !== undefined) dbUpdate.profitPaymentStructure = update.profitPaymentStructure;
      
      // Numeric fields - convert to string for database
      if (update.faceValue !== undefined) dbUpdate.faceValue = String(update.faceValue);
      if (update.totalExpectedProfit !== undefined) dbUpdate.totalExpectedProfit = String(update.totalExpectedProfit);
      if (update.expectedIrr !== undefined) dbUpdate.expectedIrr = String(update.expectedIrr);
      
      // Date fields
      if (update.startDate !== undefined) dbUpdate.startDate = update.startDate;
      if (update.endDate !== undefined) dbUpdate.endDate = update.endDate;
      
      // Integer fields
      if (update.riskScore !== undefined) dbUpdate.riskScore = update.riskScore;
      if (update.isReinvestment !== undefined) dbUpdate.isReinvestment = update.isReinvestment;
      if (update.fundedFromCash !== undefined) dbUpdate.fundedFromCash = update.fundedFromCash;
      
      const [investment] = await tx
        .update(investments)
        .set(dbUpdate)
        .where(eq(investments.id, id))
        .returning();
      
      if (!investment) return undefined;
      
      // Handle custom distributions ONLY if explicitly provided (not undefined)
      // undefined = preserve existing, [] = clear & regenerate, non-empty = replace
      if (customDistributionPayload !== undefined && customDistributionPayload !== null) {
        // Delete existing custom distributions
        await tx.delete(customDistributions).where(eq(customDistributions.investmentId, id));
        
        // Only delete expected cashflows (preserve received ones for historical records)
        await tx.delete(cashflows).where(
          and(
            eq(cashflows.investmentId, id),
            eq(cashflows.status, 'expected')
          )
        );
        
        if (customDistributionPayload.length > 0) {
          // Save new custom distributions
          await this.saveCustomDistributions(tx, id, customDistributionPayload);
        } else {
          // Regenerate standard cashflows
          await this.generateCashflowsForInvestment(tx, investment);
        }
      }
      
      return investment.id;
    });

    if (!updated) return undefined;

    // Fetch and return enriched investment with platform data
    const enrichedInvestment = await db.query.investments.findFirst({
      where: eq(investments.id, updated),
      with: {
        platform: true,
        customDistributions: true,
      },
    });

    return enrichedInvestment || undefined;
  }

  async updateInvestmentStatus(
    id: string, 
    status: 'active' | 'late' | 'defaulted' | 'completed' | 'pending', 
    lateDate?: Date | null, 
    defaultedDate?: Date | null
  ): Promise<Investment | undefined> {
    const updateData: Partial<Investment> = {
      status,
      lateDate: lateDate || null,
      defaultedDate: defaultedDate || null,
    };
    
    const [investment] = await db
      .update(investments)
      .set(updateData)
      .where(eq(investments.id, id))
      .returning();
    
    return investment || undefined;
  }

  async deleteInvestment(id: string): Promise<boolean> {
    // Get investment details before deletion
    const investment = await this.getInvestment(id);
    if (!investment) return false;
    
    // Get related cashflows to check which have been received
    const relatedCashflows = await db.query.cashflows.findMany({
      where: eq(cashflows.investmentId, id),
    });
    
    // Convert received distribution transactions to standalone records
    // This preserves actual received profits in cash balance while removing the deleted investment reference
    for (const cashflow of relatedCashflows) {
      if (cashflow.status === 'received') {
        // Get existing transaction to preserve notes
        const existingTransactions = await db
          .select()
          .from(cashTransactions)
          .where(eq(cashTransactions.cashflowId, cashflow.id));
        
        // Update transactions to remove foreign key references and mark as orphaned
        for (const transaction of existingTransactions) {
          const updatedNotes = `${transaction.notes || ''} [From deleted investment: ${investment.name}]`.trim();
          await db.update(cashTransactions)
            .set({
              investmentId: null,
              cashflowId: null,
              notes: updatedNotes,
            })
            .where(eq(cashTransactions.id, transaction.id));
        }
      } else {
        // Delete transactions for expected/pending cashflows that never materialized
        await db.delete(cashTransactions).where(eq(cashTransactions.cashflowId, cashflow.id));
      }
    }
    
    // Delete the original investment principal transaction (type='investment')
    // This automatically returns the principal to cash balance via SUM aggregation
    await db.delete(cashTransactions)
      .where(
        and(
          eq(cashTransactions.investmentId, id),
          eq(cashTransactions.type, 'investment')
        )
      );
    
    // Delete all related cashflows (both received and expected)
    await db.delete(cashflows).where(eq(cashflows.investmentId, id));
    
    // Delete related alerts
    await db.delete(alerts).where(eq(alerts.investmentId, id));
    
    // Delete the investment itself
    const result = await db.delete(investments).where(eq(investments.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  async getCustomDistributions(investmentId: string): Promise<ApiCustomDistribution[]> {
    const results = await db
      .select()
      .from(customDistributions)
      .where(eq(customDistributions.investmentId, investmentId))
      .orderBy(customDistributions.dueDate);
    
    // Convert to ApiCustomDistribution format (omit investmentId)
    return results.map(dist => ({
      dueDate: dist.dueDate,
      amount: dist.amount,
      type: dist.type,
      notes: dist.notes,
    }));
  }

  async completeAllPendingPayments(
    investmentId: string,
    receivedDate: Date,
    options?: { clearLateStatus?: boolean; updateLateInfo?: { lateDays: number } }
  ): Promise<{ investment: Investment; updatedCount: number; totalAmount: number } | null> {
    // Wrap entire operation in transaction for atomicity
    return await db.transaction(async (tx) => {
      // Get and lock investment to prevent concurrent completion
      const [investment] = await tx
        .select()
        .from(investments)
        .where(eq(investments.id, investmentId))
        .for('update');
      
      if (!investment || investment.status === 'completed' || investment.status === 'pending') {
        return null;
      }

      // Get and lock all pending cashflows for this investment
      const pendingCashflows = await tx
        .select()
        .from(cashflows)
        .where(
          and(
            eq(cashflows.investmentId, investmentId),
            or(
              eq(cashflows.status, 'expected'),
              eq(cashflows.status, 'upcoming')
            )
          )
        )
        .for('update'); // Lock to prevent concurrent updates

      if (pendingCashflows.length === 0) {
        return null;
      }

      // Calculate total amount
      const totalAmount = pendingCashflows.reduce((sum, cf) => {
        const amount = typeof cf.amount === 'string' ? parseFloat(cf.amount) : cf.amount;
        return sum + amount;
      }, 0);

      // Update all pending cashflows to received and create cash transactions
      for (const cashflow of pendingCashflows) {
        // Update cashflow status
        await tx
          .update(cashflows)
          .set({
            status: 'received',
            receivedDate: receivedDate,
          })
          .where(eq(cashflows.id, cashflow.id));

        // Check for existing cash transaction to prevent duplicates
        const [existingTransaction] = await tx
          .select()
          .from(cashTransactions)
          .where(eq(cashTransactions.cashflowId, cashflow.id));
        
        if (!existingTransaction) {
          // Create cash transaction
          const transactionSource = cashflow.type === 'profit' ? 'profit' : 'investment_return';
          const transactionNotes = `${cashflow.type === 'profit' ? 'Distribution' : 'Principal return'} from: ${investment.name}`;

          await tx.insert(cashTransactions).values({
            amount: String(Math.abs(parseFloat(cashflow.amount))),
            type: 'distribution',
            source: transactionSource,
            notes: transactionNotes,
            date: receivedDate,
            investmentId: investmentId,
            cashflowId: cashflow.id,
            platformId: investment.platformId,
            balanceAfter: '0', // Deprecated field
          });
        }
      }

      // Handle late status management
      if (investment.status === 'late' || investment.status === 'defaulted') {
        if (options?.clearLateStatus) {
          // Clear late/defaulted dates
          await tx
            .update(investments)
            .set({
              status: 'completed',
              lateDate: null,
              defaultedDate: null,
            })
            .where(eq(investments.id, investmentId));
        } else if (options?.updateLateInfo?.lateDays) {
          // Update late date based on custom late days
          const now = new Date();
          const customLateDate = new Date(now.getTime() - (options.updateLateInfo.lateDays * 24 * 60 * 60 * 1000));
          await tx
            .update(investments)
            .set({
              status: 'completed',
              lateDate: customLateDate,
              defaultedDate: investment.defaultedDate ? new Date(investment.defaultedDate) : null,
            })
            .where(eq(investments.id, investmentId));
        } else {
          // Keep existing late status
          await tx
            .update(investments)
            .set({ status: 'completed' })
            .where(eq(investments.id, investmentId));
        }
      } else {
        // Mark investment as completed
        await tx
          .update(investments)
          .set({ status: 'completed' })
          .where(eq(investments.id, investmentId));
      }

      // Fetch updated investment inside transaction
      const [updatedInvestment] = await tx
        .select()
        .from(investments)
        .where(eq(investments.id, investmentId));
      
      return {
        investment: updatedInvestment,
        updatedCount: pendingCashflows.length,
        totalAmount,
      };
    });
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
    // Wrap in transaction for atomicity
    return await db.transaction(async (tx) => {
      // Get and lock the original cashflow before update
      const [originalCashflow] = await tx
        .select()
        .from(cashflows)
        .where(eq(cashflows.id, id))
        .for('update'); // Lock to prevent concurrent updates
      
      if (!originalCashflow) {
        return undefined;
      }
      
      // Update the cashflow
      const [cashflow] = await tx
        .update(cashflows)
        .set(update)
        .where(eq(cashflows.id, id))
        .returning();
      
      // If status changed to "received", create a cash transaction automatically
      if (update.status === 'received' && originalCashflow.status !== 'received') {
        // Check if a transaction already exists for this cashflow to prevent duplicates
        const [existingTransaction] = await tx
          .select()
          .from(cashTransactions)
          .where(eq(cashTransactions.cashflowId, id))
          .for('update'); // Lock check to prevent race conditions
        
        if (!existingTransaction) {
          // Convert receivedDate to Date object if it's a string
          const receivedDateRaw = (update as any).receivedDate;
          const receivedDate = receivedDateRaw 
            ? (typeof receivedDateRaw === 'string' ? new Date(receivedDateRaw) : receivedDateRaw)
            : new Date();
          
          // Get investment details for better notes
          const [investment] = await tx
            .select()
            .from(investments)
            .where(eq(investments.id, cashflow.investmentId));
          
          // Determine transaction source based on cashflow type
          const transactionSource = cashflow.type === 'profit' ? 'profit' : 'investment_return';
          const transactionNotes = investment 
            ? `${cashflow.type === 'profit' ? 'Distribution' : 'Principal return'} from: ${investment.name}` 
            : `${cashflow.type === 'profit' ? 'Distribution' : 'Principal return'} received`;
          
          // Create cash transaction inside same transaction
          await tx.insert(cashTransactions).values({
            amount: String(Math.abs(parseFloat(cashflow.amount))),
            type: 'distribution',
            source: transactionSource,
            notes: transactionNotes,
            date: receivedDate,
            investmentId: cashflow.investmentId,
            cashflowId: id,
            platformId: investment?.platformId,
            balanceAfter: '0', // Deprecated field
          });
        }
      }
      
      return cashflow || undefined;
    });
  }

  async deleteCashflow(id: string): Promise<boolean> {
    // Check if cashflow exists
    const [cashflow] = await db
      .select()
      .from(cashflows)
      .where(eq(cashflows.id, id));
    
    if (!cashflow) {
      return false;
    }
    
    // Delete associated cash transaction if exists
    await db
      .delete(cashTransactions)
      .where(eq(cashTransactions.cashflowId, id));
    
    // Delete the cashflow
    const result = await db.delete(cashflows).where(eq(cashflows.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
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
    const [cashTransaction] = await db
      .insert(cashTransactions)
      .values({
        ...transaction,
        amount: Math.abs(parseFloat(transaction.amount.toString())).toString(), // Store absolute value
        balanceAfter: '0', // Deprecated field, will calculate from SUM
      })
      .returning();
    
    return cashTransaction;
  }

  async getCashBalance(): Promise<{ total: number; byPlatform: Record<string, number> }> {
    // Get total balance
    const result = await db
      .select({
        balance: sql<string>`
          SUM(CASE 
            WHEN type IN ('deposit', 'distribution') THEN CAST(amount AS NUMERIC)
            WHEN type IN ('withdrawal', 'investment') THEN -CAST(amount AS NUMERIC)
            ELSE 0
          END)
        `
      })
      .from(cashTransactions);
    
    const totalBalance = result[0]?.balance ? parseFloat(result[0].balance) : 0;
    
    // Get platform-specific balances
    // First, get all transactions with platform info
    const allTransactions = await db.select().from(cashTransactions);
    const allInvestments = await db.select().from(investments);
    const allPlatforms = await db.select().from(platforms);
    
    // Create platform ID map
    const platformMap = new Map(allPlatforms.map(p => [p.id, p.name]));
    
    // Calculate balance by platform (keyed by platformId, not name)
    const byPlatform: Record<string, number> = {};
    
    for (const txn of allTransactions) {
      let platformId = txn.platformId;
      
      // If no platformId, try to derive from investmentId
      if (!platformId && txn.investmentId) {
        const investment = allInvestments.find(inv => inv.id === txn.investmentId);
        platformId = investment?.platformId || null;
      }
      
      // Skip if still no platform
      if (!platformId) continue;
      
      // Use platformId as key (not platformName)
      // Calculate transaction effect
      const amount = parseFloat(txn.amount);
      const effect = ['deposit', 'distribution'].includes(txn.type) ? amount : -amount;
      
      byPlatform[platformId] = (byPlatform[platformId] || 0) + effect;
    }
    
    return {
      total: totalBalance,
      byPlatform
    };
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
      .reduce((sum, inv) => sum + safeParseFloat(inv.faceValue), 0);

    const totalReturns = allCashflows
      .filter((cf) => cf.status === "received" && cf.type === "profit")
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

    // Cash balance from cash transactions
    const cashBalanceObj = await this.getCashBalance();
    const totalCashBalance = cashBalanceObj.total;

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

    // Platform allocation (uses faceValue - actual deployed capital, not total including expected profit)
    const platformAllocation = allPlatforms.map((platform) => {
      const platformInvestments = allInvestments.filter(
        (inv) => inv.platformId === platform.id
      );
      const amount = platformInvestments.reduce(
        (sum, inv) => sum + safeParseFloat(inv.faceValue),
        0
      );
      const totalAmount = allInvestments.reduce(
        (sum, inv) => sum + safeParseFloat(inv.faceValue),
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

    // Sum up cashflows that were received in each month (PROFIT ONLY - excludes principal returns)
    cashflows
      .filter((cf) => cf.status === "received" && cf.receivedDate && cf.type === "profit")
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
    
    // Calculate actual portfolio value (invested faceValue + received PROFIT returns)
    // faceValue = actual deployed capital (excludes expected profit)
    const investedCapital = investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + safeParseFloat(inv.faceValue), 0);
    
    // Received returns = PROFIT ONLY (principal returns don't increase portfolio value)
    const receivedReturns = cashflows
      .filter((cf) => cf.status === "received" && cf.type === "profit")
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

  // Saved Scenarios
  async getSavedScenarios(userId?: string): Promise<SavedScenario[]> {
    const results = await db
      .select()
      .from(savedScenarios)
      .where(userId ? eq(savedScenarios.userId, userId) : sql`1=1`)
      .orderBy(desc(savedScenarios.createdAt));
    
    return results;
  }

  async createSavedScenario(scenario: InsertSavedScenario, userId?: string): Promise<SavedScenario> {
    // Check limit: max 5 scenarios per user
    const existing = await this.getSavedScenarios(userId);
    if (existing.length >= 5) {
      throw new Error("Maximum of 5 saved scenarios reached. Please delete one before creating a new one.");
    }

    const [newScenario] = await db
      .insert(savedScenarios)
      .values({
        name: scenario.name,
        initialAmount: scenario.initialAmount.toString(),
        monthlyDeposit: scenario.monthlyDeposit.toString(),
        expectedIRR: scenario.expectedIRR.toString(),
        targetAmount: scenario.targetAmount.toString(),
        durationYears: scenario.durationYears,
        userId: userId || null,
      })
      .returning();
    
    return newScenario;
  }

  async deleteSavedScenario(id: string): Promise<boolean> {
    const result = await db
      .delete(savedScenarios)
      .where(eq(savedScenarios.id, id))
      .returning();
    
    return result.length > 0;
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

  async updateUserLastLogin(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin: new Date() })
      .where(eq(users.id, userId));
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
  
  // Portfolio Snapshots (Checkpoints)
  async getSnapshots(): Promise<PortfolioSnapshot[]> {
    return await db
      .select()
      .from(portfolioSnapshots)
      .orderBy(desc(portfolioSnapshots.createdAt));
  }

  async createSnapshot(name: string): Promise<PortfolioSnapshot> {
    // Capture current portfolio state in a transaction
    const snapshotData = await db.transaction(async (tx) => {
      // Fetch all portfolio entities
      const allPlatforms = await tx.select().from(platforms);
      const allInvestments = await tx.select().from(investments);
      const allCashflows = await tx.select().from(cashflows);
      const allCustomDistributions = await tx.select().from(customDistributions);
      const allCashTransactions = await tx.select().from(cashTransactions);
      const allAlerts = await tx.select().from(alerts);
      const allSavedScenarios = await tx.select().from(savedScenarios);
      const settings = await tx.select().from(userSettings).limit(1);

      return {
        platforms: allPlatforms,
        investments: allInvestments,
        cashflows: allCashflows,
        customDistributions: allCustomDistributions,
        cashTransactions: allCashTransactions,
        alerts: allAlerts,
        savedScenarios: allSavedScenarios,
        userSettings: settings[0] || null,
      };
    });

    // Calculate metadata
    const entityCounts = {
      platforms: snapshotData.platforms.length,
      investments: snapshotData.investments.length,
      cashflows: snapshotData.cashflows.length,
      customDistributions: snapshotData.customDistributions.length,
      cashTransactions: snapshotData.cashTransactions.length,
      alerts: snapshotData.alerts.length,
      savedScenarios: snapshotData.savedScenarios.length,
    };

    const snapshotJson = JSON.stringify(snapshotData);
    const byteSize = Buffer.byteLength(snapshotJson, 'utf8');

    // Insert snapshot
    const [snapshot] = await db
      .insert(portfolioSnapshots)
      .values({
        name,
        snapshotData,
        entityCounts,
        byteSize,
      })
      .returning();

    return snapshot;
  }

  async restoreSnapshot(id: string): Promise<{ success: boolean; entitiesRestored: any }> {
    // Retrieve snapshot
    const [snapshot] = await db
      .select()
      .from(portfolioSnapshots)
      .where(eq(portfolioSnapshots.id, id));

    if (!snapshot) {
      throw new Error('Snapshot not found');
    }

    const data = snapshot.snapshotData as any;

    // Restore data in transaction
    const entitiesRestored = await db.transaction(async (tx) => {
      // Delete existing data in reverse dependency order
      await tx.delete(customDistributions);
      await tx.delete(cashflows);
      await tx.delete(cashTransactions);
      await tx.delete(alerts);
      await tx.delete(savedScenarios);
      await tx.delete(investments);
      await tx.delete(platforms);

      // Restore platforms (preserve original IDs)
      if (data.platforms && data.platforms.length > 0) {
        await tx.insert(platforms).values(data.platforms);
      }

      // Restore investments (preserve original IDs)
      if (data.investments && data.investments.length > 0) {
        await tx.insert(investments).values(data.investments);
      }

      // Restore cashflows (preserve original IDs)
      if (data.cashflows && data.cashflows.length > 0) {
        await tx.insert(cashflows).values(data.cashflows);
      }

      // Restore custom distributions (preserve original IDs)
      if (data.customDistributions && data.customDistributions.length > 0) {
        await tx.insert(customDistributions).values(data.customDistributions);
      }

      // Restore cash transactions (preserve original IDs)
      if (data.cashTransactions && data.cashTransactions.length > 0) {
        await tx.insert(cashTransactions).values(data.cashTransactions);
      }

      // Restore alerts (preserve original IDs)
      if (data.alerts && data.alerts.length > 0) {
        await tx.insert(alerts).values(data.alerts);
      }

      // Restore saved scenarios (preserve original IDs)
      if (data.savedScenarios && data.savedScenarios.length > 0) {
        await tx.insert(savedScenarios).values(data.savedScenarios);
      }

      // Restore user settings (update existing or create)
      if (data.userSettings) {
        const existing = await tx.select().from(userSettings).limit(1);
        if (existing.length > 0) {
          await tx
            .update(userSettings)
            .set(data.userSettings)
            .where(eq(userSettings.id, existing[0].id));
        } else {
          await tx.insert(userSettings).values(data.userSettings);
        }
      }

      return {
        platforms: data.platforms?.length || 0,
        investments: data.investments?.length || 0,
        cashflows: data.cashflows?.length || 0,
        customDistributions: data.customDistributions?.length || 0,
        cashTransactions: data.cashTransactions?.length || 0,
        alerts: data.alerts?.length || 0,
        savedScenarios: data.savedScenarios?.length || 0,
      };
    });

    return { success: true, entitiesRestored };
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const result = await db
      .delete(portfolioSnapshots)
      .where(eq(portfolioSnapshots.id, id))
      .returning();
    return result.length > 0;
  }

  // Data Management
  async resetAllData(): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete in correct order to avoid foreign key violations
      // 1. Custom distributions (depends on investments)
      await tx.delete(customDistributions);
      
      // 2. Cashflows (depends on investments)
      await tx.delete(cashflows);
      
      // 3. Cash transactions (may reference investments)
      await tx.delete(cashTransactions);
      
      // 4. Alerts (independent but portfolio-related)
      await tx.delete(alerts);
      
      // 5. Investments (depends on platforms)
      await tx.delete(investments);
      
      // Preserve: platforms, user settings, multi-user tables
    });
  }
}

export const storage = new DatabaseStorage();
