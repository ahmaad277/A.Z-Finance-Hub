import { useState } from "react";
import { formatCurrency, formatPercentage, formatDate, calculateROI, getInvestmentStatusConfig, formatInvestmentDisplayName } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaymentScheduleManager } from "@/components/payment-schedule-manager";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";

interface InvestmentRowProps {
  investment: InvestmentWithPlatform;
  cashflows: CashflowWithInvestment[];
  onEdit: () => void;
  onCompletePayment?: () => void;
  onDelete?: () => void;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkPaymentAsReceived?: (cashflowId: string) => void;
}

type ViewMode = "ultra-compact" | "compact" | "expanded";

export function InvestmentRow({ investment, cashflows, onEdit, onCompletePayment, onDelete, onAddPayment, onRemovePayment, onMarkPaymentAsReceived }: InvestmentRowProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  
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
  
  // Calculate total expected return (sum of all cashflows - both received and pending)
  const totalExpectedReturn = investmentCashflows
    .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
  
  // Use totalExpectedProfit from investment record instead of calculating from cashflows
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
  
  const statusConfig = getInvestmentStatusConfig(investment.status);
  const platformBorderClasses = getPlatformBorderClasses(investment.platform?.name);
  
  // Handle view mode toggle (cycle through modes on click)
  const handleToggleView = () => {
    if (viewMode === "ultra-compact") setViewMode("compact");
    else if (viewMode === "compact") setViewMode("expanded");
    else setViewMode("ultra-compact");
  };

  return (
    <div
      className={`
        flex flex-col rounded-lg border-l-4 transition-all duration-200
        ${statusConfig.rowBackground} ${platformBorderClasses}
      `}
      data-testid={`row-investment-${investment.id}`}
    >
      {/* Ultra-Compact Strip View (Mobile/Desktop) - Maximum density, no profit/ROI */}
      {viewMode === "ultra-compact" && (
        <div 
          className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/20"
          onClick={handleToggleView}
          data-testid={`ultra-compact-view-${investment.id}`}
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

          {/* APR + Face Value */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">{t("investments.expectedIrr")}</div>
              <div className="text-xs font-bold text-chart-1">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "قيمة اسمية" : "Face Value"}
              </div>
              <div className="text-xs font-bold">
                {formatCurrency(parseFloat(investment.faceValue))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact View - 3-section layout */}
      {viewMode === "compact" && (
        <div 
          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/20"
          onClick={handleToggleView}
          data-testid={`compact-view-${investment.id}`}
        >
            onMarkAsReceived={onMarkPaymentAsReceived}
          />
          
          {/* Sukuk Structure: Face Value & Expected Profit */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
            <div>
              <div className="text-muted-foreground">
                {language === "ar" ? "القيمة الاسمية" : "Face Value"}
              </div>
              <div className="font-bold">
                {formatCurrency(parseFloat(investment.faceValue || "0"))}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "رأس المال" : "Principal"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">
                {language === "ar" ? "الربح المتوقع" : "Expected Profit"}
              </div>
              <div className="font-bold text-chart-1">
                {formatCurrency(totalExpectedProfit)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "بدون رأس المال" : "Ex. principal"}
              </div>
            </div>
          </div>
          
          {/* Profit Payment Structure & End Date */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
            <div>
              <div className="text-muted-foreground">
                {language === "ar" ? "هيكل الدفع" : "Payment Structure"}
              </div>
              <div className="font-medium">
                {investment.profitPaymentStructure === "periodic"
                  ? language === "ar" ? "دفعات دورية" : "Periodic Payments"
                  : language === "ar" ? "عند الاستحقاق" : "At Maturity"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("investments.expectedEndDate")}</div>
              <div className="font-medium">{formatDate(investment.endDate)}</div>
            </div>
          </div>
          
          {/* Received Returns */}
          <div className="grid grid-cols-1 gap-2 text-xs pt-2 border-t border-border/50">
            <div>
              <div className="text-muted-foreground">{t("dashboard.totalReturns")}</div>
              <div className="font-bold text-chart-2">
                {formatCurrency(totalReturns)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "مستلمة" : "Received"}
              </div>
            </div>
          </div>
          
          {/* Annual Return & ROI */}
          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
            <div>
              <div className="text-muted-foreground">{t("investments.expectedIrr")}</div>
              <div className="font-bold text-chart-1">
                {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("investments.roi")}</div>
              <div className={`font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
                {formatPercentage(roi)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            {investment.status === "active" && onCompletePayment && (
              <Button
                variant="default"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onCompletePayment();
                }}
                data-testid={`button-complete-payment-${investment.id}`}
                className="h-7 text-xs flex-1"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {t("investments.confirmPayment")}
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
              className="h-7 text-xs flex-1"
            >
              <Edit className="h-3 w-3 mr-1" />
              {t("common.edit")}
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
                className="h-7 text-xs"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Desktop View */}
      <div className="hidden lg:flex lg:items-center gap-3 p-3">
        {/* Investment Name & Platform */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {investment.platform && (
              <Badge variant="outline" className="text-xs shrink-0">
                {investment.platform.name}
              </Badge>
            )}
            <Badge 
              className={`${statusConfig.badge} text-xs shrink-0`}
              variant="outline"
              data-testid={`badge-status-${investment.status}`}
            >
              {t(`investments.${investment.status}`)}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm line-clamp-1" title={formatInvestmentDisplayName(investment, t("investments.number"))}>
            {formatInvestmentDisplayName(investment, t("investments.number"))}
          </h3>
        </div>
      
        {/* Desktop: Duration */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[60px]">
          <div className="text-xs text-muted-foreground">{t("investments.duration")}</div>
          <div className="text-sm font-bold">{durationMonths}{language === "ar" ? "ش" : "m"}</div>
        </div>
        
        {/* Desktop: Expected End Date */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[90px]">
          <div className="text-xs text-muted-foreground">{t("investments.expectedEndDate")}</div>
          <div className="text-sm font-medium">{formatDate(investment.endDate)}</div>
        </div>
        
        {/* Desktop: Face Value */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[95px]">
          <div className="text-xs text-muted-foreground">
            {language === "ar" ? "القيمة الاسمية" : "Face Value"}
          </div>
          <div className="text-sm font-bold">{formatCurrency(parseFloat(investment.faceValue || "0"))}</div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "رأس المال" : "Principal"}
          </div>
        </div>
        
        {/* Desktop: Expected Profit */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[95px]">
          <div className="text-xs text-muted-foreground">
            {language === "ar" ? "الربح المتوقع" : "Expected Profit"}
          </div>
          <div className="text-sm font-bold text-chart-1">
            {formatCurrency(totalExpectedProfit)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "بدون رأس المال" : "Ex. principal"}
          </div>
        </div>
        
        {/* Desktop: Profit Payment Structure */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[85px]">
          <div className="text-xs text-muted-foreground">
            {language === "ar" ? "هيكل الدفع" : "Structure"}
          </div>
          <div className="text-sm font-medium">
            {investment.profitPaymentStructure === "periodic"
              ? language === "ar" ? "دوري" : "Periodic"
              : language === "ar" ? "استحقاق" : "Maturity"}
          </div>
        </div>
        
        {/* Desktop: Received Returns */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[110px]">
          <div className="text-xs text-muted-foreground">{t("dashboard.totalReturns")}</div>
          <div className="text-sm font-bold text-chart-2">
            {formatCurrency(totalReturns)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "مستلمة" : "Received"}
          </div>
        </div>
        
        {/* Desktop: Annual Return (APR) */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[90px]">
          <div className="text-xs text-muted-foreground">
            {t("investments.expectedIrr")}
          </div>
          <div className="text-sm font-bold text-chart-1">
            {formatPercentage(parseFloat(investment.expectedIrr || "0"))}
          </div>
        </div>

        {/* Desktop: ROI */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[70px]">
          <div className="text-xs text-muted-foreground">{t("investments.roi")}</div>
          <div className={`text-sm font-bold ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
            {formatPercentage(roi)}
          </div>
        </div>
        
        {/* Desktop: Payment Info */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[100px]">
          <div className="text-xs text-muted-foreground">{t("investments.avgPayment")}</div>
          <div className="text-sm font-medium">{formatCurrency(avgPayment)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {totalPayments} {language === "ar" ? "دفعات" : "payments"}
          </div>
        </div>
        
        {/* Desktop: Payment Progress Boxes */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[120px]">
          <div className="text-xs text-muted-foreground mb-1">
            {language === "ar" ? "تقدم الدفعات" : "Progress"}
          </div>
          <div className="flex items-center gap-[2px] flex-wrap justify-center max-w-[100px]">
            {Array.from({ length: totalPayments }).map((_, index) => (
              <div
                key={index}
                className={`
                  w-[6px] h-[6px] rounded-[1px] transition-all
                  ${index < receivedPayments
                    ? 'bg-chart-2'
                    : 'bg-muted-foreground/30'
                  }
                `}
                title={
                  index < receivedPayments
                    ? language === "ar" ? "مستلمة" : "Received"
                    : language === "ar" ? "متبقية" : "Remaining"
                }
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <span className="text-chart-2 font-medium">{receivedPayments}</span>
            {" / "}
            <span className="text-muted-foreground">{totalPayments}</span>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {investment.status === "active" && onCompletePayment && (
            <Button
              variant="default"
              size="sm"
              onClick={onCompletePayment}
              data-testid={`button-complete-payment-${investment.id}`}
              className="h-8"
            >
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xl:inline">{t("investments.confirmPayment")}</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            data-testid={`button-edit-investment-${investment.id}`}
            className="h-8"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            <span className="hidden xl:inline">{t("common.edit")}</span>
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              data-testid={`button-delete-investment-${investment.id}`}
              className="h-8"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              <span className="hidden xl:inline">{t("investments.deleteInvestment")}</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
