import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, calculateDaysUntil, METRIC_COLOR_MAP, cn, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import type { InvestmentWithPlatform } from "@shared/schema";
import { Building2, TrendingUp, Calendar, Percent, ArrowRight, AlertTriangle } from "lucide-react";
import { getPlatformTextClasses } from "@/lib/platform-colors";

interface InvestmentCompactRowProps {
  investment: InvestmentWithPlatform;
  paymentsReceived: number;
  totalPayments: number;
  onClick?: () => void;
}

export function InvestmentCompactRow({ 
  investment, 
  paymentsReceived, 
  totalPayments,
  onClick 
}: InvestmentCompactRowProps) {
  const { language } = useLanguage();

  // Calculate days until maturity
  const daysUntilMaturity = calculateDaysUntil(investment.endDate);

  // Calculate duration in months
  const startDate = new Date(investment.startDate);
  const endDate = new Date(investment.endDate);
  const months = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30));

  // Use the expectedIrr (APR) entered during investment creation
  const apr = parseFloat(investment.expectedIrr) || 0;

  // Calculate ROI (profit only)
  const faceValue = parseFloat(investment.faceValue);
  const totalExpectedProfit = parseFloat(investment.totalExpectedProfit);
  const roi = faceValue > 0 ? (totalExpectedProfit / faceValue) * 100 : 0;

  // Calculate payment progress percentage
  const progressPercentage = totalPayments > 0 ? (paymentsReceived / totalPayments) * 100 : 0;

  // Determine countdown color based on days
  const getCountdownColor = (days: number) => {
    if (days > 30) return "text-chart-2";
    if (days >= 7) return "text-yellow-500";
    return "text-destructive";
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      active: {
        className: "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20",
        label: "Active",
      },
      completed: {
        className: "bg-muted text-muted-foreground hover:bg-muted/80",
        label: "Completed",
      },
      late: {
        className: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
        label: "Late",
      },
      defaulted: {
        className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        label: "Defaulted",
      },
    };

    const config = configs[status] || configs.active;
    return (
      <Badge className={`${config.className} text-[10px] px-1.5 py-0 h-4`}>
        {config.label}
      </Badge>
    );
  };

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 border-b last:border-0 hover-elevate cursor-pointer h-10 text-xs"
      data-testid={`compact-investment-row-${investment.id}`}
    >
      {/* Name & Platform - 30% */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="font-medium truncate leading-tight" title={formatInvestmentDisplayName(investment, "")}>
              {formatInvestmentDisplayName(investment, "")}
            </span>
            {investment.needsReview === 1 && (
              <Badge 
                className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30 text-[9px] px-1.5 py-0.5 h-4 shrink-0"
                data-testid="badge-needs-review"
              >
                <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                Check!
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
            <span className={`truncate font-medium ${getPlatformTextClasses(investment.platform?.name)}`}>
              {investment.platform?.name || "Unknown"}
            </span>
          </div>
        </div>
        {getStatusBadge(investment.status)}
      </div>

      {/* Countdown - Mobile Hidden */}
      <div className="hidden sm:flex items-center gap-1 w-16 shrink-0">
        <Calendar className={`h-3 w-3 shrink-0 ${getCountdownColor(daysUntilMaturity)}`} />
        <span className={`font-semibold ${getCountdownColor(daysUntilMaturity)}`}>
          {daysUntilMaturity}d
        </span>
      </div>

      {/* Duration - Mobile Hidden */}
      <div className="hidden md:flex items-center justify-center w-12 shrink-0">
        <span className="text-muted-foreground font-medium">{months}m</span>
      </div>

      {/* APR - Always Visible */}
      <div className="flex items-center justify-center w-16 shrink-0">
        <div className="flex items-center gap-0.5">
          <Percent className="h-3 w-3 text-chart-2 shrink-0" />
          <span className="font-semibold text-chart-2">{apr.toFixed(1)}%</span>
        </div>
      </div>

      {/* ROI - Always Visible */}
      <div className="flex items-center justify-center w-16 shrink-0">
        <div className="flex items-center gap-0.5">
          <TrendingUp className={cn("h-3 w-3 shrink-0", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} />
          <span className={cn("font-semibold", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} data-testid={`compact-roi-${investment.id}`}>{roi.toFixed(1)}%</span>
        </div>
      </div>

      {/* Payments Progress - Always Visible */}
      <div className="flex items-center gap-2 w-20 shrink-0">
        <div className="flex flex-col items-end flex-1">
          <span className="font-semibold text-[11px] leading-tight">
            {paymentsReceived}/{totalPayments}
          </span>
          <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-chart-2 transition-all"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Arrow - Desktop Only */}
      <ArrowRight className="hidden xl:block h-4 w-4 text-muted-foreground shrink-0" />
    </div>
  );
}
