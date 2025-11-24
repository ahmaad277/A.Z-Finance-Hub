import type { Investment, CashTransaction, Platform, Cashflow } from '@shared/schema';
import { calculateROI } from './utils';

export interface DashboardMetrics {
  // Portfolio Values
  portfolioValue: number;
  totalCash: number;
  cashByPlatform: Record<string, number>;
  
  // Returns
  actualReturns: number;
  expectedReturns: number;
  activeAPR: number; // العائد السنوي النشط (Active + Late + Defaulted)
  cashRatio: number; // totalCash / portfolioValue
  
  // Performance
  weightedAPR: number; // متوسط العائد السنوي التاريخي (All investments)
  portfolioROI: number; // نسبة العائد على الاستثمار
  totalProfitAmount: number; // إجمالي الأرباح بالريال
  
  // Averages
  avgDuration: number; // in months
  avgAmount: number;
  avgPaymentAmount: number;
  
  // Status Counts
  totalInvestments: number;
  activeInvestments: number;
  completedInvestments: number;
  lateInvestments: number;
  defaultedInvestments: number;
  
  // Distributions
  statusDistribution: {
    active: number;
    completed: number;
    late: number;
    defaulted: number;
  };
  
  platformDistribution: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];
  
  // Three modes of platform distribution
  platformDistributionAll: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];
  
  platformDistributionActive: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];
  
  platformDistributionCount: {
    platformId: string;
    platformName: string;
    value: number;
    count: number;
    percentage: number;
  }[];
}

/**
 * Calculate duration in months between two dates
 */
export function calculateDurationMonths(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + 
                     (end.getMonth() - start.getMonth());
  return Math.max(1, monthsDiff);
}

/**
 * Calculate expected profit based on IRR and amount
 */
export function calculateExpectedProfit(amount: number, expectedIrr: string, durationMonths: number): number {
  const irr = parseFloat(expectedIrr) / 100; // Convert percentage to decimal
  const years = durationMonths / 12;
  return amount * irr * years;
}

/**
 * Calculate APR (Annual Percentage Rate) for an investment
 */
export function calculateAPR(
  amount: number,
  profit: number,
  durationMonths: number
): number {
  if (durationMonths === 0 || amount === 0) return 0;
  
  // ROI = profit / amount
  const roi = profit / amount;
  
  // APR = ROI * (12 / durationMonths)
  const apr = roi * (12 / durationMonths);
  
  return apr * 100; // Return as percentage
}

// Removed duplicate calculateROI - now imported from utils.ts

/**
 * Calculate if an investment is late based on expected payment date
 */
export function isInvestmentLate(investment: Investment, cashflows: Cashflow[]): boolean {
  if (investment.status === 'completed' || investment.status === 'pending') {
    return false;
  }
  
  const today = new Date();
  const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);
  
  // Check if there's any overdue cashflow
  const hasOverdue = investmentCashflows.some(cf => {
    if (cf.status === 'received') return false;
    const dueDate = new Date(cf.dueDate);
    return dueDate < today;
  });
  
  return hasOverdue;
}

/**
 * Calculate if an investment is defaulted (متعثر)
 * An investment is considered defaulted if it has payments overdue by more than 60 days
 */
export function isInvestmentDefaulted(investment: Investment, cashflows: Cashflow[]): boolean {
  if (investment.status !== 'active') return false;
  
  const today = new Date();
  const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);
  
  // Check if there's any payment overdue by more than 60 days
  const hasDefaulted = investmentCashflows.some(cf => {
    if (cf.status === 'received') return false;
    const dueDate = new Date(cf.dueDate);
    const daysDiff = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff > 60;
  });
  
  return hasDefaulted;
}

/**
 * Calculate total cash from cash transactions
 * Uses SUM aggregation to calculate balance correctly regardless of transaction order
 */
export function calculateTotalCash(cashTransactions: CashTransaction[]): number {
  if (cashTransactions.length === 0) return 0;
  
  // Calculate balance by summing all transactions
  return cashTransactions.reduce((balance, transaction) => {
    const amount = parseFloat(transaction.amount);
    
    // Add for deposits and distributions, subtract for withdrawals and investments
    if (transaction.type === 'deposit' || transaction.type === 'distribution') {
      return balance + amount;
    } else if (transaction.type === 'withdrawal' || transaction.type === 'investment') {
      return balance - amount;
    }
    
    return balance;
  }, 0);
}

/**
 * Calculate comprehensive dashboard metrics
 */
export function calculateDashboardMetrics(
  investments: Investment[],
  cashTransactions: CashTransaction[],
  platforms: Platform[],
  cashflows: Cashflow[],
  dateRange?: { start: Date; end: Date },
  selectedPlatform?: string
): DashboardMetrics {
  // 1. Filter by platform if specified (before date filtering)
  let filteredInvestments = investments;
  let filteredCashTransactions = cashTransactions;
  
  if (selectedPlatform && selectedPlatform !== 'all') {
    filteredInvestments = investments.filter(inv => inv.platformId === selectedPlatform);
    // Filter cash transactions by platformId (null platformId = unassigned, shown only in "all" view)
    filteredCashTransactions = cashTransactions.filter(
      tx => tx.platformId === selectedPlatform
    );
  }
  
  // 2. Filter investments by date range if provided
  if (dateRange) {
    filteredInvestments = filteredInvestments.filter(inv => {
      if (!inv.startDate) return false; // Skip investments without start date
      const startDate = new Date(inv.startDate);
      return startDate >= dateRange.start && startDate <= dateRange.end;
    });
  }
  
  // 3. Filter cashflows based on filtered investments
  const filteredInvestmentIds = new Set(filteredInvestments.map(inv => inv.id));
  const filteredCashflows = cashflows.filter(cf => filteredInvestmentIds.has(cf.investmentId));
  
  // 3. Calculate total cash from filtered transactions
  const totalCash = calculateTotalCash(filteredCashTransactions);
  
  // 4. Calculate cash by platform
  const cashByPlatform: Record<string, number> = {};
  if (selectedPlatform && selectedPlatform !== 'all') {
    // When platform filter is active, assign all filtered cash to that platform
    cashByPlatform[selectedPlatform] = totalCash;
  } else {
    // When viewing all platforms, distribute cash by actual transaction platformId
    for (const tx of filteredCashTransactions) {
      if (tx.platformId) {
        const amount = parseFloat(tx.amount);
        const effect = ['deposit', 'distribution'].includes(tx.type) ? amount : -amount;
        cashByPlatform[tx.platformId] = (cashByPlatform[tx.platformId] || 0) + effect;
      }
    }
  }
  
  // 5. Calculate portfolio value (active investments amount + cash)
  const activeInvestments = filteredInvestments.filter(inv => inv.status === 'active');
  const totalInvestmentValue = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const portfolioValue = totalInvestmentValue + totalCash;
  
  // 6. Calculate returns (using filtered cashflows)
  const actualReturns = filteredCashflows.filter(
    cf => cf.status === 'received' && cf.type === 'profit'
  ).reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
  
  // Calculate expected returns from totalExpectedProfit in schema
  const expectedReturns = filteredInvestments.reduce((sum, inv) => {
    return sum + parseFloat(inv.totalExpectedProfit || "0");
  }, 0);
  
  // 5. Calculate cash ratio
  const cashRatio = portfolioValue > 0 ? (totalCash / portfolioValue) * 100 : 0;
  
  // 6. Calculate Active APR: متوسط APR للاستثمارات النشطة + المتأخرة + المتعثرة
  const activeFilteredInvestments = filteredInvestments.filter(
    inv => inv.status === 'active' || inv.status === 'late' || inv.status === 'defaulted'
  );
  const totalActiveValue = activeFilteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const activeAPR = totalActiveValue > 0
    ? activeFilteredInvestments.reduce((sum, inv) => {
        if (!inv.startDate || !inv.endDate) return sum; // Skip investments without dates
        const amount = parseFloat(inv.faceValue);
        const profit = parseFloat(inv.totalExpectedProfit || "0");
        const durationMonths = calculateDurationMonths(inv.startDate, inv.endDate);
        const apr = calculateAPR(amount, profit, durationMonths);
        const weight = amount / totalActiveValue;
        return sum + (apr * weight);
      }, 0)
    : 0;
  
  // 7. Calculate Weighted APR (Historical): متوسط APR لجميع الاستثمارات (نشط + متأخر + متعثر + منتهي)
  const allInvestmentsValue = filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const weightedAPR = allInvestmentsValue > 0
    ? filteredInvestments.reduce((sum, inv) => {
        if (!inv.startDate || !inv.endDate) return sum; // Skip investments without dates
        const amount = parseFloat(inv.faceValue);
        const profit = parseFloat(inv.totalExpectedProfit || "0");
        const durationMonths = calculateDurationMonths(inv.startDate, inv.endDate);
        const apr = calculateAPR(amount, profit, durationMonths);
        const weight = amount / allInvestmentsValue;
        return sum + (apr * weight);
      }, 0)
    : 0;
  
  // Portfolio ROI: حساب العائد الفعلي على الاستثمار
  const totalInvestedCapital = filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const portfolioROI = totalInvestedCapital > 0 ? (actualReturns / totalInvestedCapital) * 100 : 0;
  const totalProfitAmount = actualReturns;
  
  // 7. Calculate averages
  const investmentsWithDates = filteredInvestments.filter(inv => inv.startDate && inv.endDate);
  const totalDuration = investmentsWithDates.reduce((sum, inv) => {
    return sum + calculateDurationMonths(inv.startDate!, inv.endDate!);
  }, 0);
  const avgDuration = investmentsWithDates.length > 0 
    ? Math.round((totalDuration / investmentsWithDates.length) * 100) / 100 
    : 0;
  const avgAmount = filteredInvestments.length > 0 
    ? filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0) / filteredInvestments.length 
    : 0;
  
  // Calculate average payment amount from filtered cashflows
  const totalPayments = filteredCashflows.filter(cf => cf.type === 'profit').length;
  const avgPaymentAmount = totalPayments > 0
    ? filteredCashflows
        .filter(cf => cf.type === 'profit')
        .reduce((sum, cf) => sum + parseFloat(cf.amount), 0) / totalPayments
    : 0;
  
  // 8. Calculate status counts (using filtered cashflows)
  const completedInvestments = filteredInvestments.filter(inv => inv.status === 'completed').length;
  const lateInvestments = filteredInvestments.filter(inv => isInvestmentLate(inv, filteredCashflows)).length;
  const defaultedInvestments = filteredInvestments.filter(inv => isInvestmentDefaulted(inv, filteredCashflows)).length;
  
  const statusDistribution = {
    active: activeInvestments.length,
    completed: completedInvestments,
    late: lateInvestments,
    defaulted: defaultedInvestments,
  };
  
  // 9. Calculate platform distribution - Three modes
  const platformMap = new Map(platforms.map(p => [p.id, p]));
  
  // Collect stats for all investments
  const platformStatsAll = new Map<string, { value: number; count: number }>();
  const platformStatsActive = new Map<string, { value: number; count: number }>();
  
  filteredInvestments.forEach(inv => {
    // All investments stats
    const currentAll = platformStatsAll.get(inv.platformId) || { value: 0, count: 0 };
    currentAll.value += parseFloat(inv.faceValue);
    currentAll.count += 1;
    platformStatsAll.set(inv.platformId, currentAll);
    
    // Active only stats
    if (inv.status === 'active') {
      const currentActive = platformStatsActive.get(inv.platformId) || { value: 0, count: 0 };
      currentActive.value += parseFloat(inv.faceValue);
      currentActive.count += 1;
      platformStatsActive.set(inv.platformId, currentActive);
    }
  });
  
  // Calculate totals for percentage calculation
  const totalAllInvestmentsValue = filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const totalActiveInvestmentsValue = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const totalAllCount = filteredInvestments.length;
  
  // Mode 1: All investments by value (percentage from total value of ALL investments)
  const platformDistributionAll = Array.from(platformStatsAll.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalAllInvestmentsValue > 0 ? (stats.value / totalAllInvestmentsValue) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);
  
  // Mode 2: Active investments by value (percentage from total value of ACTIVE investments)
  const platformDistributionActive = Array.from(platformStatsActive.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalActiveInvestmentsValue > 0 ? (stats.value / totalActiveInvestmentsValue) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);
  
  // Mode 3: All investments by count (percentage from total COUNT)
  const platformDistributionCount = Array.from(platformStatsAll.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalAllCount > 0 ? (stats.count / totalAllCount) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
  
  // Legacy compatibility: keep platformDistribution as alias to platformDistributionAll
  const platformDistribution = platformDistributionAll;
  
  return {
    portfolioValue,
    totalCash,
    cashByPlatform,
    actualReturns,
    expectedReturns,
    activeAPR,
    cashRatio,
    weightedAPR,
    portfolioROI,
    totalProfitAmount,
    avgDuration,
    avgAmount,
    avgPaymentAmount,
    totalInvestments: filteredInvestments.length,
    activeInvestments: activeInvestments.length,
    completedInvestments,
    lateInvestments,
    defaultedInvestments,
    statusDistribution,
    platformDistribution,
    platformDistributionAll,
    platformDistributionActive,
    platformDistributionCount,
  };
}

/**
 * Format currency value
 */
export function formatCurrency(value: number, currency: string = 'SAR'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ' ' + currency;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return value.toFixed(decimals) + '%';
}

/**
 * Get color for performance metric
 */
export function getPerformanceColor(value: number, threshold: { good: number; warning: number }): string {
  if (value >= threshold.good) return 'text-green-500';
  if (value >= threshold.warning) return 'text-yellow-500';
  return 'text-red-500';
}
