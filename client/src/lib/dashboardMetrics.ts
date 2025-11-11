import type { Investment, CashTransaction, Platform, Cashflow } from '@shared/schema';

export interface DashboardMetrics {
  // Portfolio Values
  portfolioValue: number;
  totalCash: number;
  cashByPlatform: Record<string, number>;
  
  // Returns
  actualReturns: number;
  expectedReturns: number;
  returnsRatio: number; // actualReturns / expectedReturns
  cashRatio: number; // totalCash / portfolioValue
  
  // Performance
  weightedAPR: number; // متوسط APR المرجح
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

/**
 * Calculate ROI (Return on Investment) for an investment
 */
export function calculateROI(amount: number, profit: number): number {
  if (amount === 0) return 0;
  return (profit / amount) * 100;
}

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
  dateRange?: { start: Date; end: Date }
): DashboardMetrics {
  // Filter investments by date range if provided
  let filteredInvestments = investments;
  if (dateRange) {
    filteredInvestments = investments.filter(inv => {
      const startDate = new Date(inv.startDate);
      return startDate >= dateRange.start && startDate <= dateRange.end;
    });
  }
  
  // 1. Calculate total cash from transactions
  const totalCash = calculateTotalCash(cashTransactions);
  
  // 2. Calculate cash by platform (simplified - equal distribution for now)
  const cashByPlatform: Record<string, number> = {};
  platforms.forEach(p => {
    cashByPlatform[p.id] = totalCash / Math.max(platforms.length, 1);
  });
  
  // 3. Calculate portfolio value (active investments amount + cash)
  const activeInvestments = filteredInvestments.filter(inv => inv.status === 'active');
  const totalInvestmentValue = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const portfolioValue = totalInvestmentValue + totalCash;
  
  // 4. Calculate returns
  const actualReturns = filteredInvestments.reduce((sum, inv) => {
    const receivedCashflows = cashflows.filter(
      cf => cf.investmentId === inv.id && cf.status === 'received' && cf.type === 'profit'
    );
    return sum + receivedCashflows.reduce((s, cf) => s + parseFloat(cf.amount), 0);
  }, 0);
  
  // Calculate expected returns from totalExpectedProfit in schema
  const expectedReturns = filteredInvestments.reduce((sum, inv) => {
    return sum + parseFloat(inv.totalExpectedProfit || "0");
  }, 0);
  
  const returnsRatio = expectedReturns > 0 ? (actualReturns / expectedReturns) * 100 : 0;
  
  // 5. Calculate cash ratio
  const cashRatio = portfolioValue > 0 ? (totalCash / portfolioValue) * 100 : 0;
  
  // 6. Calculate weighted APR and portfolio ROI
  // Weighted APR: حساب متوسط APR مرجح حسب قيمة كل استثمار
  const totalActiveValue = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const weightedAPR = totalActiveValue > 0
    ? activeInvestments.reduce((sum, inv) => {
        const amount = parseFloat(inv.faceValue);
        const profit = parseFloat(inv.totalExpectedProfit || "0");
        const durationMonths = calculateDurationMonths(inv.startDate, inv.endDate);
        const apr = calculateAPR(amount, profit, durationMonths);
        const weight = amount / totalActiveValue;
        return sum + (apr * weight);
      }, 0)
    : 0;
  
  // Portfolio ROI: حساب العائد الفعلي على الاستثمار
  const totalInvestedCapital = filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  const portfolioROI = totalInvestedCapital > 0 ? (actualReturns / totalInvestedCapital) * 100 : 0;
  const totalProfitAmount = actualReturns;
  
  // 7. Calculate averages
  const totalDuration = filteredInvestments.reduce((sum, inv) => {
    return sum + calculateDurationMonths(inv.startDate, inv.endDate);
  }, 0);
  const avgDuration = filteredInvestments.length > 0 
    ? Math.round((totalDuration / filteredInvestments.length) * 100) / 100 
    : 0;
  const avgAmount = filteredInvestments.length > 0 
    ? filteredInvestments.reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0) / filteredInvestments.length 
    : 0;
  
  // Calculate average payment amount from cashflows
  const totalPayments = cashflows.filter(cf => cf.type === 'profit').length;
  const avgPaymentAmount = totalPayments > 0
    ? cashflows
        .filter(cf => cf.type === 'profit')
        .reduce((sum, cf) => sum + parseFloat(cf.amount), 0) / totalPayments
    : 0;
  
  // 8. Calculate status counts
  const completedInvestments = filteredInvestments.filter(inv => inv.status === 'completed').length;
  const lateInvestments = filteredInvestments.filter(inv => isInvestmentLate(inv, cashflows)).length;
  const defaultedInvestments = filteredInvestments.filter(inv => isInvestmentDefaulted(inv, cashflows)).length;
  
  const statusDistribution = {
    active: activeInvestments.length,
    completed: completedInvestments,
    late: lateInvestments,
    defaulted: defaultedInvestments,
  };
  
  // 9. Calculate platform distribution
  const platformMap = new Map(platforms.map(p => [p.id, p]));
  const platformStats = new Map<string, { value: number; count: number }>();
  
  filteredInvestments.forEach(inv => {
    const current = platformStats.get(inv.platformId) || { value: 0, count: 0 };
    current.value += parseFloat(inv.faceValue);
    current.count += 1;
    platformStats.set(inv.platformId, current);
  });
  
  const platformDistribution = Array.from(platformStats.entries()).map(([platformId, stats]) => {
    const platform = platformMap.get(platformId);
    return {
      platformId,
      platformName: platform?.name || 'Unknown',
      value: stats.value,
      count: stats.count,
      percentage: totalInvestmentValue > 0 ? (stats.value / totalInvestmentValue) * 100 : 0,
    };
  }).sort((a, b) => b.value - a.value);
  
  return {
    portfolioValue,
    totalCash,
    cashByPlatform,
    actualReturns,
    expectedReturns,
    returnsRatio,
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
