/**
 * Profit Calculator Utility
 * Auto-calculates totalExpectedProfit based on faceValue, IRR, and duration
 */

/**
 * Calculate expected profit for Sukuk investment
 * Formula: faceValue × (IRR / 100) × (durationMonths / 12)
 * 
 * @param faceValue - Principal amount (القيمة الاسمية)
 * @param irrPercent - Internal Rate of Return as percentage (e.g., 15.6 for 15.6%)
 * @param durationMonths - Duration in months
 * @returns Total expected profit
 */
export function calculateExpectedProfit(
  faceValue: number,
  irrPercent: number,
  durationMonths: number
): number {
  if (faceValue <= 0 || irrPercent < 0 || durationMonths <= 0) {
    return 0;
  }
  
  const durationYears = durationMonths / 12;
  const profit = faceValue * (irrPercent / 100) * durationYears;
  
  return Math.round(profit * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate duration in months between two dates
 * Treats any positive day span as at least 1 month to handle short-term investments
 * 
 * @param startDate - Investment start date
 * @param endDate - Investment end date
 * @returns Number of months (minimum 1 if endDate > startDate)
 */
export function calculateDurationMonths(startDate: Date, endDate: Date): number {
  // Calculate total days for comparison
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // If endDate is before or same as startDate, return 0
  if (daysDiff <= 0) return 0;
  
  // Calculate full calendar months
  const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
  const monthsDiff = endDate.getMonth() - startDate.getMonth();
  let totalMonths = yearsDiff * 12 + monthsDiff;
  
  // Add partial month if there are remaining days
  if (endDate.getDate() > startDate.getDate()) {
    totalMonths += 1;
  }
  
  // Ensure minimum 1 month for any positive duration
  return Math.max(1, totalMonths);
}

/**
 * Calculate end date from start date + duration in months
 * 
 * @param startDate - Investment start date
 * @param durationMonths - Duration in months
 * @returns Calculated end date
 */
export function calculateEndDate(startDate: Date, durationMonths: number): Date {
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  return endDate;
}

/**
 * Validate and auto-calculate investment financial fields
 * Used for maintaining consistency between dates, duration, and profit calculations
 * 
 * @param data - Investment data (partial or complete)
 * @returns Validated data with auto-calculated fields
 */
export function validateInvestmentFinancials(data: {
  faceValue: number;
  expectedIrr: number;
  startDate: Date;
  endDate?: Date;
  durationMonths?: number;
  totalExpectedProfit?: number;
}): {
  faceValue: number;
  expectedIrr: number;
  startDate: Date;
  endDate: Date;
  durationMonths: number;
  totalExpectedProfit: number;
} {
  let { faceValue, expectedIrr, startDate, endDate, durationMonths, totalExpectedProfit } = data;

  // If durationMonths provided but no endDate, calculate endDate
  if (durationMonths && !endDate) {
    endDate = calculateEndDate(startDate, durationMonths);
  }
  
  // If endDate provided but no durationMonths, calculate durationMonths
  if (endDate && !durationMonths) {
    durationMonths = calculateDurationMonths(startDate, endDate);
  }
  
  // If neither provided, throw error
  if (!endDate || !durationMonths) {
    throw new Error("Either endDate or durationMonths must be provided");
  }
  
  // Auto-calculate profit if not provided or if it's zero
  if (!totalExpectedProfit || totalExpectedProfit === 0) {
    totalExpectedProfit = calculateExpectedProfit(faceValue, expectedIrr, durationMonths);
  }
  
  return {
    faceValue,
    expectedIrr,
    startDate,
    endDate,
    durationMonths,
    totalExpectedProfit,
  };
}
