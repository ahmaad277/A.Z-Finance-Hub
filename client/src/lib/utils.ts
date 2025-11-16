import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Centralized color mapping for financial metrics (APR and ROI).
 * 
 * IMPORTANT: Use separate colorLight and colorDark properties instead of 
 * concatenating them (e.g., "text-blue-600 dark:text-blue-400") because 
 * Tailwind's twMerge utility will remove the base class when it encounters
 * the dark variant as a single string.
 * 
 * Usage: cn("text-lg font-bold", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)
 * 
 * Color scheme:
 * - APR: Uses CSS variable --chart-2 (automatically adapts to dark mode)
 *   - Light: rgb(74,222,128), Dark: rgb(22,162,73)
 * - ROI: Uses explicit Tailwind classes for light/dark modes
 *   - Light: rgb(37,99,235), Dark: rgb(96,165,250)
 */
export const METRIC_COLOR_MAP = {
  apr: {
    colorLight: "text-chart-2",
    colorDark: "", // Not needed - CSS variable adapts automatically
    bgColor: "bg-chart-2/10",
  },
  roi: {
    colorLight: "text-blue-600",
    colorDark: "dark:text-blue-400",
    bgColor: "bg-blue-600/10",
  },
} as const;

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

export interface InvestmentStatusConfig {
  badge: string;
  rowBackground: string;
  borderLeft: string;
}

export function getInvestmentStatusConfig(status: string): InvestmentStatusConfig {
  const configs: Record<string, InvestmentStatusConfig> = {
    active: {
      badge: "bg-chart-2/10 text-chart-2 border-chart-2/20",
      rowBackground: "bg-chart-2/5 hover:bg-chart-2/10",
      borderLeft: "border-l-chart-2",
    },
    completed: {
      badge: "bg-muted text-muted-foreground",
      rowBackground: "bg-muted/50 hover:bg-muted/70",
      borderLeft: "border-l-muted-foreground",
    },
    late: {
      badge: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      rowBackground: "bg-yellow-500/5 hover:bg-yellow-500/10",
      borderLeft: "border-l-yellow-500",
    },
    defaulted: {
      badge: "bg-destructive/10 text-destructive border-destructive/20",
      rowBackground: "bg-destructive/5 hover:bg-destructive/10",
      borderLeft: "border-l-destructive",
    },
    pending: {
      badge: "bg-primary/10 text-primary border-primary/20",
      rowBackground: "bg-primary/5 hover:bg-primary/10",
      borderLeft: "border-l-primary",
    },
  };

  // Neutral fallback for unknown statuses
  const neutralFallback: InvestmentStatusConfig = {
    badge: "bg-muted text-muted-foreground border-muted-foreground/20",
    rowBackground: "bg-muted/30 hover:bg-muted/50",
    borderLeft: "border-l-muted-foreground",
  };

  return configs[status] || neutralFallback;
}

/**
 * Format investment display name with number prefix
 * Returns: "#12 — Name" (both English and Arabic)
 * Falls back to just the name if number is missing
 */
export function formatInvestmentDisplayName(
  investment: { name: string; investmentNumber?: number | null },
  numberPrefix: string = "Investment #"
): string {
  if (!investment.investmentNumber) {
    return investment.name;
  }
  return `#${investment.investmentNumber} — ${investment.name}`;
}
