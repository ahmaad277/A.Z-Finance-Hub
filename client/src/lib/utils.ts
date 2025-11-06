import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = "SAR"): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function formatPercentage(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
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
  
  if (amount === 0) return 0;
  return ((returns - amount) / amount) * 100;
}

export function getInvestmentTotalReturns(
  investmentId: string,
  cashflows: Array<{ investmentId: string; amount: number | string; status: string }>
): number {
  return cashflows
    .filter(cf => cf.investmentId === investmentId && cf.status === "received")
    .reduce((sum, cf) => sum + (typeof cf.amount === "string" ? parseFloat(cf.amount) : cf.amount), 0);
}
