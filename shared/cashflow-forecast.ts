import { startOfMonth, addMonths, format, isBefore, isAfter } from "date-fns";
import type { Cashflow, CashflowWithInvestment } from "./schema";

export interface MonthlyForecast {
  month: string; // "2025-01" format
  monthLabel: string; // "Jan 2025" format
  principal: number;
  profit: number;
  total: number;
  date: Date; // First day of the month
}

/**
 * Calculate monthly cashflow forecast for the next N months
 * Groups expected/upcoming cashflows by month and separates principal vs profit
 * 
 * @param cashflows - Array of cashflows to forecast
 * @param months - Number of months to forecast (default: 40)
 * @returns Array of monthly forecasts sorted chronologically
 */
export function calculateMonthlyForecast(
  cashflows: Cashflow[] | CashflowWithInvestment[],
  months: number = 40
): MonthlyForecast[] {
  const now = new Date();
  const startMonth = startOfMonth(now);
  const endMonth = addMonths(startMonth, months);

  // Filter future cashflows that are expected or upcoming
  const futureCashflows = cashflows.filter((cf) => {
    const dueDate = new Date(cf.dueDate);
    const isExpectedOrUpcoming = cf.status === "expected" || cf.status === "upcoming";
    const isInForecastWindow = isBefore(dueDate, endMonth) && !isBefore(dueDate, startMonth);
    
    return isExpectedOrUpcoming && isInForecastWindow;
  });

  // Group cashflows by month
  const monthlyData = new Map<string, { principal: number; profit: number }>();

  // Initialize all months with zero values
  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startMonth, i);
    const monthKey = format(monthDate, "yyyy-MM");
    monthlyData.set(monthKey, { principal: 0, profit: 0 });
  }

  // Aggregate cashflows by month and type
  for (const cf of futureCashflows) {
    const dueDate = new Date(cf.dueDate);
    const monthKey = format(startOfMonth(dueDate), "yyyy-MM");
    
    const existing = monthlyData.get(monthKey);
    if (!existing) continue; // Skip if outside forecast window
    
    const amount = typeof cf.amount === "string" ? parseFloat(cf.amount) : cf.amount;
    
    if (cf.type === "principal") {
      existing.principal += amount;
    } else {
      // profit or any other type
      existing.profit += amount;
    }
  }

  // Convert to array format
  const forecast: MonthlyForecast[] = [];
  
  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(startMonth, i);
    const monthKey = format(monthDate, "yyyy-MM");
    const data = monthlyData.get(monthKey) || { principal: 0, profit: 0 };
    
    // Add month numbering starting from next month (month 1)
    // Current month (i=0) has no number, next month (i=1) = (1), etc.
    // Use compact format: Sep-25 instead of Sep 2025
    const monthLabel = i === 0 
      ? format(monthDate, "MMM-yy")
      : `${format(monthDate, "MMM-yy")} (${i})`;
    
    forecast.push({
      month: monthKey,
      monthLabel,
      principal: data.principal,
      profit: data.profit,
      total: data.principal + data.profit,
      date: monthDate,
    });
  }

  return forecast;
}

/**
 * Calculate summary totals for different time periods
 * 
 * @param forecast - Monthly forecast data
 * @returns Object with totals for different periods
 */
export function calculateForecastSummaries(forecast: MonthlyForecast[]) {
  const calculatePeriod = (months: number) => {
    const periodData = forecast.slice(0, months);
    return {
      principal: periodData.reduce((sum, m) => sum + m.principal, 0),
      profit: periodData.reduce((sum, m) => sum + m.profit, 0),
      total: periodData.reduce((sum, m) => sum + m.total, 0),
    };
  };

  return {
    month1: calculatePeriod(1),
    months3: calculatePeriod(3),
    months6: calculatePeriod(6),
    months12: calculatePeriod(12),
    months24: calculatePeriod(24),
  };
}
