import { useMemo } from "react";
import { formatCurrency, formatPercentage, formatDate, calculateROI, getInvestmentStatusConfig, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentScheduleManager } from "@/components/payment-schedule-manager";
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

          {/* Investment Name */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs line-clamp-1" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
              {formatInvestmentDisplayName(investment, t("investments.number"))}
            </h3>
          </div>

          {/* APR (blue) + ROI (green) - Inline with mini labels */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-baseline gap-0.5">
              <span className="text-[8px] text-muted-foreground uppercase">{t("investments.aprShort")}</span>
              <span className="text-[10px] font-bold text-chart-1">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </span>
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-[8px] text-muted-foreground uppercase">{t("investments.roiShort")}</span>
              <span className={`text-[10px] font-bold ${roi >= 0 ? 'text-success' : 'text-destructive'}`}>
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

      {/* Compact View - With Duration, APR (green) only */}
      {viewMode === "compact" && (
        <div 
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
          onClick={cycleMode}
          data-testid={`compact-view-${investment.id}`}
        >
          {/* Platform + Status + Duration */}
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
            <span className="text-[10px] text-muted-foreground">
              {durationMonths}{language === "ar" ? "ش" : "m"}
            </span>
          </div>

          {/* Investment Number + Name */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-xs line-clamp-1" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
              {formatInvestmentDisplayName(investment, t("investments.number"))}
            </h3>
          </div>

          {/* APR (green) + Face Value */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">{t("investments.expectedIrr")}</div>
              <div className="text-xs font-bold text-success">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">
                {t("investments.faceValue")}
              </div>
              <div className="text-xs font-bold">
                {formatCurrency(parseFloat(investment.faceValue))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expanded View - Compact + Timeline + Status Details */}
      {viewMode === "expanded" && (
        <div className="flex flex-col" data-testid={`expanded-view-${investment.id}`}>
          {/* Reuse Compact View Layout */}
          <div 
            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 cursor-pointer hover:bg-muted/20"
            onClick={cycleMode}
          >
            {/* LEFT COLUMN */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {investment.platform && (
                  <Badge variant="outline" className={`text-xs shrink-0 ${getPlatformBadgeClasses(investment.platform.name)}`}>
                    {investment.platform.name}
                  </Badge>
                )}
                <Badge 
                  className={`${statusConfig.badge} text-xs shrink-0`}
                  variant="outline"
                >
                  {t(`investments.${investment.status}`)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {durationMonths}{language === "ar" ? " شهر" : " months"} • {formatDate(investment.endDate)}
                </span>
              </div>
              <h3 className="font-semibold text-sm line-clamp-1 mb-2" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
                {formatInvestmentDisplayName(investment, t("investments.number"))}
              </h3>
            </div>

            {/* CENTER COLUMN */}
            <div className="grid grid-cols-2 gap-4 min-w-[180px] shrink-0">
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("investments.expectedIrr")}</div>
                <div className="text-lg font-bold text-chart-1">
                  {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t("investments.roi")}</div>
                <div className={`text-lg font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                  {formatPercentage(roi)}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="grid grid-cols-2 gap-4 min-w-[200px] shrink-0">
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {language === "ar" ? "القيمة الاسمية" : "Face Value"}
                </div>
                <div className="text-sm font-bold">
                  {formatCurrency(parseFloat(investment.faceValue))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {language === "ar" ? "الربح المتوقع" : "Expected Profit"}
                </div>
                <div className="text-sm font-bold text-chart-1">
                  {formatCurrency(totalExpectedProfit)}
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-2 shrink-0">
              {investment.status === "active" && onCompletePayment && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCompletePayment();
                  }}
                  data-testid={`button-complete-payment-${investment.id}`}
                  className="h-8"
                >
                  <CheckCircle className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">{t("investments.confirmPayment")}</span>
                </Button>
              )}
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

          {/* Payment Schedule Manager - Only render if callbacks are provided */}
          {onAddPayment && onRemovePayment && onMarkPaymentAsReceived && (
            <div className="border-t border-border/50 p-3">
              <PaymentScheduleManager
                investmentId={investment.id}
                cashflows={investmentCashflows}
                expectedProfit={metrics.totalExpectedProfit}
                onAddPayment={onAddPayment}
                onRemovePayment={onRemovePayment}
                onMarkAsReceived={onMarkPaymentAsReceived}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
