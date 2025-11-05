import {
  platforms,
  investments,
  cashflows,
  alerts,
  userSettings,
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
  type PortfolioStats,
  type AnalyticsData,
  type InvestmentWithPlatform,
  type CashflowWithInvestment,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Platforms
  getPlatforms(): Promise<Platform[]>;
  createPlatform(platform: InsertPlatform): Promise<Platform>;

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

  // Analytics
  getPortfolioStats(): Promise<PortfolioStats>;
  getAnalyticsData(): Promise<AnalyticsData>;
  
  // Settings
  getSettings(): Promise<UserSettings>;
  updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings>;
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

  // Analytics
  async getPortfolioStats(): Promise<PortfolioStats> {
    const allInvestments = await db.select().from(investments);
    const allCashflows = await db.select().from(cashflows);

    const totalCapital = allInvestments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    const totalReturns = allCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const activeInvestments = allInvestments.filter((inv) => inv.status === "active").length;

    const averageIrr = allInvestments.length > 0
      ? allInvestments.reduce((sum, inv) => sum + parseFloat(inv.expectedIrr), 0) / allInvestments.length
      : 0;

    const upcomingCashflow = allCashflows
      .filter((cf) => cf.status === "expected" || cf.status === "upcoming")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const target2040 = 10000000; // 10M SAR target
    const progressTo2040 = (totalCapital / target2040) * 100;

    // Cash balance calculations
    const totalCashBalance = allCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    // Only count active/pending reinvestments - completed ones have returned to cash
    const reinvestedAmount = allInvestments
      .filter((inv) => inv.isReinvestment === 1 && (inv.status === "active" || inv.status === "pending"))
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

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

    // Calculate real monthly returns from cashflow data
    const now = new Date();
    const monthlyReturns = this.calculateMonthlyReturns(allCashflows, now);

    // Platform allocation
    const platformAllocation = allPlatforms.map((platform) => {
      const platformInvestments = allInvestments.filter(
        (inv) => inv.platformId === platform.id
      );
      const amount = platformInvestments.reduce(
        (sum, inv) => sum + parseFloat(inv.amount),
        0
      );
      const totalAmount = allInvestments.reduce(
        (sum, inv) => sum + parseFloat(inv.amount),
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
          monthlyData[monthLabel] += parseFloat(cf.amount);
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
    
    // Calculate actual portfolio value (invested capital + received returns)
    const investedCapital = investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    
    const receivedReturns = cashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
    
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
  async getSettings(): Promise<UserSettings> {
    // Get the first settings record, or create default if none exists
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

  async updateSettings(settings: Partial<InsertUserSettings>): Promise<UserSettings> {
    // Get current settings first
    const currentSettings = await this.getSettings();
    
    // Update the settings
    const [updatedSettings] = await db
      .update(userSettings)
      .set(settings)
      .where(eq(userSettings.id, currentSettings.id))
      .returning();
    
    return updatedSettings;
  }
}

export const storage = new DatabaseStorage();
