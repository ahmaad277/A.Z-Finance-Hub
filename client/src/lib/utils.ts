import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string | null | undefined, currency = "SAR"): string {
  if (amount === null || amount === undefined) {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  
  if (isNaN(num)) {
    return new Intl.NumberFormat("en-SA", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercentage(value: number | string | null | undefined): string {
  if (value === null || value === undefined) {
    return "0.00%";
  }
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(num)) {
    return "0.00%";
  }
  
  return `${num.toFixed(2)}%`;
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function calculateDaysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function calculateIRR(cashflows: Array<{ date: Date; amount: number }>): number {
  // Simplified IRR calculation for display purposes
  const totalInvestment = Math.abs(cashflows[0]?.amount || 0);
  const totalReturns = cashflows.slice(1).reduce((sum, cf) => sum + cf.amount, 0);
  const years = cashflows.length > 1 
    ? (cashflows[cashflows.length - 1].date.getTime() - cashflows[0].date.getTime()) / (1000 * 60 * 60 * 24 * 365)
    : 0;
  
  if (years === 0 || totalInvestment === 0) return 0;
  return ((totalReturns / totalInvestment) / years) * 100;
}

export function calculateROI(investmentAmount: number | string, totalReturns: number | string): number {
  const amount = typeof investmentAmount === "string" ? parseFloat(investmentAmount) : investmentAmount;
  const returns = typeof totalReturns === "string" ? parseFloat(totalReturns) : totalReturns;
  
  if (isNaN(amount) || isNaN(returns) || amount === 0) return 0;
  // ROI = (Profit / Investment) * 100
  // totalReturns already represents the profit (received cashflows)
  return (returns / amount) * 100;
}

export function getInvestmentTotalReturns(
  investmentId: string,
  cashflows: Array<{ investmentId: string; amount: number | string; status: string; type?: string }>
): number {
  return cashflows
    .filter(cf => 
      cf.investmentId === investmentId && 
      cf.status === "received" &&
      cf.type === "profit" // Only count profit cashflows, not principal returns
    )
    .reduce((sum, cf) => {
      const amount = typeof cf.amount === "string" ? parseFloat(cf.amount) : cf.amount;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
}

export function convertArabicToEnglishNumbers(str: string): string {
  const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  
  let result = str;
  arabicNumbers.forEach((arabic, index) => {
    result = result.replace(new RegExp(arabic, 'g'), englishNumbers[index]);
  });
  
  return result;
}

export function normalizeNumberInput(value: string): string {
  return convertArabicToEnglishNumbers(value);
}
