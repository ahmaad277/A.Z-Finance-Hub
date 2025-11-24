import { useMemo } from "react";
import { formatCurrency, formatPercentage, formatDate, calculateROI, getInvestmentStatusConfig, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";

// Hook: Calculate all investment metrics once
function useInvestmentMetrics(investment: InvestmentWithPlatform, cashflows: CashflowWithInvestment[]) {
  return useMemo(() => {
    // Calculate investment duration in months
    const durationMonths = Math.round(
      (new Date(investment.endDate).getTime() - new Date(investment.startDate).getTime()) / 
      (1000 * 60 * 60 * 24 * 30)
    );
    
    // Get cashflows for this investment
    const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);
    
    // Count only PROFIT payments (exclude principal from payment progress)
    const profitCashflows = investmentCashflows.filter(cf => cf.type === "profit");
    const receivedPayments = profitCashflows.filter(cf => cf.status === "received").length;
    const totalPayments = profitCashflows.length;
    
    // Use totalExpectedProfit from investment record
    const totalExpectedProfit = parseFloat(investment.totalExpectedProfit || "0");
    
    // Calculate total returns received so far (PROFIT ONLY - exclude principal)
    const totalReturns = investmentCashflows
      .filter(cf => cf.status === "received" && cf.type === "profit")
      .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
    
    // Calculate ROI
    const roi = calculateROI(parseFloat(investment.faceValue), totalReturns);
    
    // Calculate average payment amount (PROFIT ONLY - exclude principal)
    const avgPayment = totalPayments > 0 
      ? profitCashflows.reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0) / totalPayments
      : 0;

    return {
      durationMonths,
      investmentCashflows,
      profitCashflows,
      receivedPayments,
      totalPayments,
      totalExpectedProfit,
      totalReturns,
      roi,
      avgPayment,
    };
  }, [investment, cashflows]);
}


interface InvestmentRowProps {
  investment: InvestmentWithPlatform;
  cashflows: CashflowWithInvestment[];
  onEdit: () => void;
  onCompletePayment?: () => void;
  onDelete?: () => void;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkPaymentAsReceived?: (cashflowId: string) => void;
  // Optional controlled view mode (if provided, component becomes controlled)
  viewMode?: "ultra-compact" | "compact" | "expanded";
  onCycleViewMode?: () => void;
}

export function InvestmentRow({ 
  investment, 
  cashflows, 
  onEdit, 
  onCompletePayment, 
  onDelete, 
  onAddPayment, 
  onRemovePayment, 
  onMarkPaymentAsReceived,
  viewMode: controlledViewMode,
  onCycleViewMode,
}: InvestmentRowProps) {
  const { t, language } = useLanguage();
  
  // Use controlled mode if props provided, otherwise use internal state
  const [internalViewMode, , internalCycleMode] = usePersistedViewMode();
  const viewMode = controlledViewMode ?? internalViewMode;
  const cycleMode = onCycleViewMode ?? internalCycleMode;
  
  // Calculate all metrics once using hook
  const metrics = useInvestmentMetrics(investment, cashflows);
  const {
    durationMonths,
    investmentCashflows,
    profitCashflows,
    receivedPayments,
    totalPayments,
    totalExpectedProfit,
    totalReturns,
    roi,
    avgPayment,
  } = metrics;
  
  const statusConfig = getInvestmentStatusConfig(investment.status);
  const platformBorderClasses = getPlatformBorderClasses(investment.platform?.name);

  return (
    <div
      className={`
        flex flex-col rounded-lg border-l-4 transition-all duration-200
        ${statusConfig.rowBackground} ${platformBorderClasses}
      `}
      data-testid={`row-investment-${investment.id}`}
    >
      {/* Ultra-Compact Strip View - Smallest view with APR(blue)+ROI(green) */}
      {viewMode === "ultra-compact" && (
        <div 
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
          onClick={cycleMode}
          data-testid={`ultra-compact-view-${investment.id}`}
        >
          {/* Platform + Status */}
          <div className="flex items-center gap-1 shrink-0">
            {investment.platform && (
              <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${getPlatformBadgeClasses(investment.platform.name)}`}>
                {investment.platform.name}
              </Badge>
            )}
            <Badge 
              className={`${statusConfig.badge} text-[10px] px-1 py-0 h-4`}
              variant="outline"
            >
              {t(`investments.${investment.status}`)}
            </Badge>
          </div>

          {/* Investment Number (or Name if no number) */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs line-clamp-1">
              {investment.investmentNumber ? `#${investment.investmentNumber}` : investment.name}
            </h3>
          </div>

          {/* APR (blue) + ROI (green) - Inline with slightly larger font */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[9px] text-muted-foreground uppercase">{t("investments.aprShort")}</span>
              <span className="text-xs font-bold text-chart-1">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[9px] text-muted-foreground uppercase">{t("investments.roiShort")}</span>
              <span className={`text-xs font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {formatPercentage(roi)}
              </span>
            </div>
          </div>

          {/* Face Value */}
          <div className="text-right shrink-0">
            <div className="text-xs font-bold">
              {formatCurrency(parseFloat(investment.faceValue))}
            </div>
          </div>
        </div>
      )}

      {/* Compact View - Taller 3-column layout */}
      {viewMode === "compact" && (
        <div 
          className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 cursor-pointer hover:bg-muted/20"
          onClick={cycleMode}
          data-testid={`compact-view-${investment.id}`}
        >
          {/* RIGHT COLUMN - Platform/Status/Duration + Number/Name */}
          <div className="flex flex-col gap-1 min-w-0">
            {/* Top: Platform + Status + Duration */}
            <div className="flex items-center gap-1 flex-wrap">
              {investment.platform && (
                <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${getPlatformBadgeClasses(investment.platform.name)}`}>
                  {investment.platform.name}
                </Badge>
              )}
              <Badge 
                className={`${statusConfig.badge} text-[10px] px-1 py-0 h-4`}
                variant="outline"
              >
                {t(`investments.${investment.status}`)}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {durationMonths}{language === "ar" ? "ش" : "m"}
              </span>
            </div>
            
            {/* Bottom: Number + Name as title */}
            <h3 className="font-semibold text-sm line-clamp-1" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
              {formatInvestmentDisplayName(investment, t("investments.number"))}
            </h3>
          </div>

          {/* CENTER COLUMN - APR (blue) + ROI (green) - Values only, no labels */}
          <div className="flex flex-col gap-0.5 justify-center items-center">
            {/* APR (blue) */}
            <div className="text-sm font-bold text-chart-1">
              {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
            </div>
            
            {/* ROI (green) */}
            <div className={`text-sm font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {formatPercentage(roi)}
            </div>
          </div>

          {/* LEFT COLUMN - Face Value + Expected Profit - Values only, no labels */}
          <div className="flex flex-col gap-0.5 justify-center items-end">
            {/* Face Value */}
            <div className="text-sm font-bold">
              {formatCurrency(parseFloat(investment.faceValue))}
            </div>
            
            {/* Expected Profit (green) */}
            <div className="text-sm font-bold text-chart-2">
              {formatCurrency(totalExpectedProfit)}
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Exact Compact Copy at Top + Organized Details Below */}
      {viewMode === "expanded" && (
        <div className="flex flex-col" data-testid={`expanded-view-${investment.id}`}>
          {/* TOP SECTION: Exact copy of Compact View (3-column grid with label-free values) */}
          <div 
            className="grid grid-cols-[auto_1fr_auto] gap-3 p-3 cursor-pointer hover:bg-muted/20"
            onClick={cycleMode}
          >
            {/* RIGHT COLUMN - Platform/Status/Duration + Number/Name */}
            <div className="flex flex-col gap-1 min-w-0">
              {/* Top: Platform + Status + Duration */}
              <div className="flex items-center gap-1 flex-wrap">
                {investment.platform && (
                  <Badge variant="outline" className={`text-[10px] px-1 py-0 h-4 ${getPlatformBadgeClasses(investment.platform.name)}`}>
                    {investment.platform.name}
                  </Badge>
                )}
                <Badge 
                  className={`${statusConfig.badge} text-[10px] px-1 py-0 h-4`}
                  variant="outline"
                >
                  {t(`investments.${investment.status}`)}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {durationMonths}{language === "ar" ? "ش" : "m"}
                </span>
              </div>
              
              {/* Bottom: Number + Name as title */}
              <h3 className="font-semibold text-sm line-clamp-1" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
                {formatInvestmentDisplayName(investment, t("investments.number"))}
              </h3>
            </div>

            {/* CENTER COLUMN - APR (blue) + ROI (green) - Values only, no labels */}
            <div className="flex flex-col gap-0.5 justify-center items-center">
              {/* APR (blue) */}
              <div className="text-sm font-bold text-chart-1">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </div>
              
              {/* ROI (green) */}
              <div className={`text-sm font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {formatPercentage(roi)}
              </div>
            </div>

            {/* LEFT COLUMN - Face Value + Expected Profit - Values only, no labels */}
            <div className="flex flex-col gap-0.5 justify-center items-end">
              {/* Face Value */}
              <div className="text-sm font-bold">
                {formatCurrency(parseFloat(investment.faceValue))}
              </div>
              
              {/* Expected Profit (green) */}
              <div className="text-sm font-bold text-chart-2">
                {formatCurrency(totalExpectedProfit)}
              </div>
            </div>
          </div>

          {/* BOTTOM SECTION: Additional organized details */}
          <div className="border-t border-border/50 px-3 py-2 space-y-2">
            {/* Payment Progress - Redesigned: Payment Value (left) + Progress (center) + Count with +/- buttons (right) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                {/* Left: Payment Value */}
                <div>
                  <span className="text-muted-foreground">{t("investments.paymentValue")}: </span>
                  <span className="font-medium">{formatCurrency(avgPayment)}</span>
                </div>
                
                {/* Center: Payment Progress label */}
                <span className="text-muted-foreground">{t("investments.paymentProgress")}</span>
                
                {/* Right: Count with +/- buttons */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Decrement payment count
                    }}
                    data-testid={`button-decrease-payment-${investment.id}`}
                  >
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                  <span className="font-medium min-w-[3ch] text-center">{receivedPayments}/{totalPayments}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation();
                      // TODO: Increment payment count
                    }}
                    data-testid={`button-increase-payment-${investment.id}`}
                  >
                    <ChevronUp className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-chart-2 transition-all duration-300"
                  style={{ width: `${totalPayments > 0 ? (receivedPayments / totalPayments) * 100 : 0}%` }}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-muted-foreground">{t("investments.startDate")}: </span>
                <span className="font-medium">{formatDate(investment.startDate)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">{t("investments.endDate")}: </span>
                <span className="font-medium">{formatDate(investment.endDate)}</span>
              </div>
            </div>

            {/* Actions - Moved to bottom after additional info */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                data-testid={`button-edit-investment-${investment.id}`}
                className="h-8"
              >
                <Edit className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">{t("common.edit")}</span>
              </Button>
              {onDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  data-testid={`button-delete-investment-${investment.id}`}
                  className="h-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
