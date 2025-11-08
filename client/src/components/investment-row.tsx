import { useState } from "react";
import { formatCurrency, formatPercentage, formatDate, calculateROI } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, CheckCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";

interface InvestmentRowProps {
  investment: InvestmentWithPlatform;
  cashflows: CashflowWithInvestment[];
  onEdit: () => void;
  onCompletePayment?: () => void;
  onDelete?: () => void;
}

export function InvestmentRow({ investment, cashflows, onEdit, onCompletePayment, onDelete }: InvestmentRowProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate investment duration in months
  const durationMonths = Math.round(
    (new Date(investment.endDate).getTime() - new Date(investment.startDate).getTime()) / 
    (1000 * 60 * 60 * 24 * 30)
  );
  
  // Get cashflows for this investment
  const investmentCashflows = cashflows.filter(cf => cf.investmentId === investment.id);
  const receivedPayments = investmentCashflows.filter(cf => cf.status === "received").length;
  const totalPayments = investmentCashflows.length;
  
  // Calculate total expected return (sum of all cashflows - both received and pending)
  const totalExpectedReturn = investmentCashflows
    .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
  
  // Calculate expected profit only (excluding principal returns)
  const expectedProfitOnly = investmentCashflows
    .filter(cf => cf.distributionType === "profit")
    .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
  
  // Calculate total returns received so far
  const totalReturns = investmentCashflows
    .filter(cf => cf.status === "received")
    .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0);
  
  // Calculate ROI
  const roi = calculateROI(parseFloat(investment.amount), totalReturns);
  
  // Calculate average payment amount
  const avgPayment = totalPayments > 0 
    ? investmentCashflows.reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0) / totalPayments
    : 0;
  
  // Status colors for row background
  const getStatusColors = (status: string) => {
    switch (status) {
      case "active":
        return "bg-chart-2/5 hover:bg-chart-2/10 border-l-chart-2";
      case "completed":
        return "bg-muted/50 hover:bg-muted/70 border-l-muted-foreground";
      case "pending":
        return "bg-primary/5 hover:bg-primary/10 border-l-primary";
      default:
        return "bg-card hover:bg-muted/30 border-l-muted-foreground";
    }
  };
  
  // Status badge color
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "pending":
        return "bg-primary/10 text-primary border-primary/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  
  return (
    <div
      className={`
        flex flex-col rounded-lg border-l-4 transition-all duration-200
        ${getStatusColors(investment.status)}
      `}
      data-testid={`row-investment-${investment.id}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Compact Mobile View */}
      <div 
        className="flex items-center gap-2 p-2 lg:hidden cursor-pointer hover:bg-muted/20"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            {investment.platform && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 shrink-0">
                {investment.platform.name}
              </Badge>
            )}
            <Badge 
              className={`${getStatusBadgeColor(investment.status)} text-[10px] px-1 py-0 h-4 shrink-0`}
              variant="outline"
              data-testid={`badge-status-${investment.status}`}
            >
              {t(`investments.${investment.status}`)}
            </Badge>
          </div>
          <h3 className="font-semibold text-xs line-clamp-1" title={investment.name}>
            {investment.name}
          </h3>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="text-xs font-bold">{formatCurrency(parseFloat(investment.amount))}</div>
            <div className={`text-[10px] ${roi >= 0 ? 'text-chart-2' : 'text-destructive'}`}>
              {formatPercentage(roi)}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Expanded Mobile View */}
      {isExpanded && (
        <div className="lg:hidden p-3 pt-0 space-y-3 border-t border-border/50">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-muted-foreground">{t("dialog.totalExpectedReturn")}</div>
              <div className="font-bold text-primary">
                {formatCurrency(expectedProfitOnly)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "أرباح فقط" : "Profit only"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("dashboard.totalReturns")}</div>
              <div className={`font-bold ${totalReturns > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
                {formatCurrency(totalReturns)}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {language === "ar" ? "مستلمة" : "Received"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("investments.expectedEndDate")}</div>
              <div className="font-medium">{formatDate(investment.endDate)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">{t("dialog.paymentValue")}</div>
              <div className="font-medium">{formatCurrency(avgPayment)}</div>
              <div className="text-[10px] text-muted-foreground">
                {totalPayments} {language === "ar" ? "دفعات" : "payments"}
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <div className="text-muted-foreground mb-1">
                {language === "ar" ? "تقدم الدفعات" : "Progress"}
              </div>
              <div className="flex items-center gap-[2px] flex-wrap">
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
                  />
                ))}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">
                <span className="text-chart-2 font-medium">{receivedPayments}</span>
                {" / "}
                <span>{totalPayments}</span>
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
              className={`${getStatusBadgeColor(investment.status)} text-xs shrink-0`}
              variant="outline"
              data-testid={`badge-status-${investment.status}`}
            >
              {t(`investments.${investment.status}`)}
            </Badge>
          </div>
          <h3 className="font-semibold text-sm line-clamp-1" title={investment.name}>
            {investment.name}
          </h3>
        </div>
      
        {/* Desktop: Duration */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[60px]">
          <div className="text-xs text-muted-foreground">{t("investments.duration")}</div>
          <div className="text-sm font-bold">{durationMonths}{language === "ar" ? "ش" : "m"}</div>
        </div>
        
        {/* Desktop: Expected End Date */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[100px]">
          <div className="text-xs text-muted-foreground">{t("investments.expectedEndDate")}</div>
          <div className="text-sm font-medium">{formatDate(investment.endDate)}</div>
        </div>
        
        {/* Desktop: Amount (Nominal Value) */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[100px]">
          <div className="text-xs text-muted-foreground">{t("investments.amount")}</div>
          <div className="text-sm font-bold">{formatCurrency(parseFloat(investment.amount))}</div>
        </div>
        
        {/* Desktop: Total Expected Profit */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[110px]">
          <div className="text-xs text-muted-foreground">{t("dialog.totalExpectedReturn")}</div>
          <div className="text-sm font-bold text-primary">
            {formatCurrency(expectedProfitOnly)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "أرباح فقط" : "Profit only"}
          </div>
        </div>
        
        {/* Desktop: Net Profit (Total Returns Received) */}
        <div className="flex flex-col items-center justify-center px-3 min-w-[110px]">
          <div className="text-xs text-muted-foreground">{t("dashboard.totalReturns")}</div>
          <div className={`text-sm font-bold ${totalReturns > 0 ? 'text-chart-2' : 'text-muted-foreground'}`}>
            {formatCurrency(totalReturns)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "مستلمة" : "Received"}
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
