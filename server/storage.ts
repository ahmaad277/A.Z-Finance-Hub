import {
  type Platform,
  type InsertPlatform,
  type Investment,
  type InsertInvestment,
  type Cashflow,
  type InsertCashflow,
  type Alert,
  type InsertAlert,
  type PortfolioStats,
  type AnalyticsData,
  type InvestmentWithPlatform,
  type CashflowWithInvestment,
} from "@shared/schema";
import { randomUUID } from "crypto";

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
}

export class MemStorage implements IStorage {
  private platforms: Map<string, Platform>;
  private investments: Map<string, Investment>;
  private cashflows: Map<string, Cashflow>;
  private alerts: Map<string, Alert>;

  constructor() {
    this.platforms = new Map();
    this.investments = new Map();
    this.cashflows = new Map();
    this.alerts = new Map();
    this.seedInitialData();
  }

  private seedInitialData() {
    // Seed platforms
    const sukuk: Platform = {
      id: randomUUID(),
      name: "Sukuk",
      type: "sukuk",
      logoUrl: null,
    };
    const manfaa: Platform = {
      id: randomUUID(),
      name: "Manfa'a",
      type: "manfaa",
      logoUrl: null,
    };
    const lendo: Platform = {
      id: randomUUID(),
      name: "Lendo",
      type: "lendo",
      logoUrl: null,
    };

    this.platforms.set(sukuk.id, sukuk);
    this.platforms.set(manfaa.id, manfaa);
    this.platforms.set(lendo.id, lendo);

    // Seed sample investment
    const investment1: Investment = {
      id: randomUUID(),
      platformId: sukuk.id,
      name: "Sukuk 2025-A",
      amount: "250000",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2027-12-31"),
      expectedIrr: "12.5",
      actualIrr: null,
      status: "active",
      riskScore: 35,
      distributionFrequency: "quarterly",
    };

    const investment2: Investment = {
      id: randomUUID(),
      platformId: manfaa.id,
      name: "Manfa'a Growth Fund",
      amount: "150000",
      startDate: new Date("2024-06-01"),
      endDate: new Date("2026-06-01"),
      expectedIrr: "14.2",
      actualIrr: null,
      status: "active",
      riskScore: 45,
      distributionFrequency: "semi-annual",
    };

    this.investments.set(investment1.id, investment1);
    this.investments.set(investment2.id, investment2);

    // Seed sample cashflows
    const cashflow1: Cashflow = {
      id: randomUUID(),
      investmentId: investment1.id,
      dueDate: new Date("2025-03-31"),
      amount: "8500",
      receivedDate: new Date("2025-03-31"),
      status: "received",
      type: "profit",
    };

    const cashflow2: Cashflow = {
      id: randomUUID(),
      investmentId: investment1.id,
      dueDate: new Date("2025-06-30"),
      amount: "8750",
      receivedDate: null,
      status: "expected",
      type: "profit",
    };

    const cashflow3: Cashflow = {
      id: randomUUID(),
      investmentId: investment2.id,
      dueDate: new Date("2025-08-15"),
      amount: "11000",
      receivedDate: null,
      status: "upcoming",
      type: "profit",
    };

    this.cashflows.set(cashflow1.id, cashflow1);
    this.cashflows.set(cashflow2.id, cashflow2);
    this.cashflows.set(cashflow3.id, cashflow3);

    // Seed sample alert
    const alert1: Alert = {
      id: randomUUID(),
      type: "distribution",
      title: "Upcoming Distribution",
      message: "You have a profit distribution of SAR 8,750 expected on June 30, 2025 from Sukuk 2025-A",
      investmentId: investment1.id,
      createdAt: new Date(),
      read: 0,
      severity: "info",
    };

    this.alerts.set(alert1.id, alert1);
  }

  // Platforms
  async getPlatforms(): Promise<Platform[]> {
    return Array.from(this.platforms.values());
  }

  async createPlatform(insertPlatform: InsertPlatform): Promise<Platform> {
    const id = randomUUID();
    const platform: Platform = { ...insertPlatform, id };
    this.platforms.set(id, platform);
    return platform;
  }

  // Investments
  async getInvestments(): Promise<InvestmentWithPlatform[]> {
    return Array.from(this.investments.values()).map((inv) => ({
      ...inv,
      platform: this.platforms.get(inv.platformId)!,
    }));
  }

  async getInvestment(id: string): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const id = randomUUID();
    const investment: Investment = {
      ...insertInvestment,
      id,
      actualIrr: null,
      startDate: new Date(insertInvestment.startDate),
      endDate: new Date(insertInvestment.endDate),
    };
    this.investments.set(id, investment);
    return investment;
  }

  async updateInvestment(id: string, update: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (!investment) return undefined;

    const updated: Investment = {
      ...investment,
      ...update,
      startDate: update.startDate ? new Date(update.startDate) : investment.startDate,
      endDate: update.endDate ? new Date(update.endDate) : investment.endDate,
    };
    this.investments.set(id, updated);
    return updated;
  }

  // Cashflows
  async getCashflows(): Promise<CashflowWithInvestment[]> {
    return Array.from(this.cashflows.values()).map((cf) => {
      const investment = this.investments.get(cf.investmentId)!;
      const platform = this.platforms.get(investment.platformId)!;
      return {
        ...cf,
        investment: { ...investment, platform },
      };
    });
  }

  async createCashflow(insertCashflow: InsertCashflow): Promise<Cashflow> {
    const id = randomUUID();
    const cashflow: Cashflow = {
      ...insertCashflow,
      id,
      receivedDate: null,
      dueDate: new Date(insertCashflow.dueDate),
    };
    this.cashflows.set(id, cashflow);
    return cashflow;
  }

  async updateCashflow(id: string, update: Partial<InsertCashflow>): Promise<Cashflow | undefined> {
    const cashflow = this.cashflows.get(id);
    if (!cashflow) return undefined;

    const updated: Cashflow = {
      ...cashflow,
      ...update,
      dueDate: update.dueDate ? new Date(update.dueDate) : cashflow.dueDate,
    };
    this.cashflows.set(id, updated);
    return updated;
  }

  // Alerts
  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      createdAt: new Date(),
      read: 0,
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: string): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;

    alert.read = 1;
    this.alerts.set(id, alert);
    return alert;
  }

  // Analytics
  async getPortfolioStats(): Promise<PortfolioStats> {
    const investments = Array.from(this.investments.values());
    const cashflows = Array.from(this.cashflows.values());

    const totalCapital = investments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    const totalReturns = cashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const activeInvestments = investments.filter((inv) => inv.status === "active").length;

    const averageIrr = investments.length > 0
      ? investments.reduce((sum, inv) => sum + parseFloat(inv.expectedIrr), 0) / investments.length
      : 0;

    const upcomingCashflow = cashflows
      .filter((cf) => cf.status === "expected" || cf.status === "upcoming")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const target2040 = 10000000; // 10M SAR target
    const progressTo2040 = (totalCapital / target2040) * 100;

    return {
      totalCapital,
      totalReturns,
      averageIrr,
      activeInvestments,
      upcomingCashflow,
      progressTo2040,
    };
  }

  async getAnalyticsData(): Promise<AnalyticsData> {
    const investments = Array.from(this.investments.values());
    const platforms = Array.from(this.platforms.values());

    // Monthly returns for the past 6 months
    const monthlyReturns = [
      { month: "Jan", amount: 12500 },
      { month: "Feb", amount: 14200 },
      { month: "Mar", amount: 13800 },
      { month: "Apr", amount: 15600 },
      { month: "May", amount: 16200 },
      { month: "Jun", amount: 17400 },
    ];

    // Platform allocation
    const platformAllocation = platforms.map((platform) => {
      const platformInvestments = investments.filter(
        (inv) => inv.platformId === platform.id
      );
      const amount = platformInvestments.reduce(
        (sum, inv) => sum + parseFloat(inv.amount),
        0
      );
      const totalAmount = investments.reduce(
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

    // Performance vs target
    const performanceVsTarget = [
      { year: 2025, actual: 400000, target: 500000 },
      { year: 2030, actual: 0, target: 2000000 },
      { year: 2035, actual: 0, target: 5000000 },
      { year: 2040, actual: 0, target: 10000000 },
    ];

    return {
      monthlyReturns,
      platformAllocation,
      performanceVsTarget,
    };
  }
}

export const storage = new MemStorage();
