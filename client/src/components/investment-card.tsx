import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage, formatDate, calculateDaysUntil, calculateROI, getInvestmentStatusConfig, METRIC_COLOR_MAP, cn } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Edit, TrendingUp, Calendar, Target, AlertTriangle, Clock, DollarSign, CheckCircle } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";
import { getPlatformBadgeClasses, getPlatformBorderClasses } from "@/lib/platform-colors";

interface InvestmentCardProps {
  investment: InvestmentWithPlatform;
  totalReturns?: number;
  onEdit: () => void;
  onCompletePayment?: () => void;
}

export function InvestmentCard({ investment, totalReturns = 0, onEdit, onCompletePayment }: InvestmentCardProps) {
  const { t, language } = useLanguage();
  const daysRemaining = calculateDaysUntil(investment.endDate);
  const isActive = investment.status === "active";
  const isCompleted = investment.status === "completed";
  
  // Calculate investment duration and expected profit using calendar months
  const startDate = new Date(investment.startDate);
  const endDate = new Date(investment.endDate);
  const durationMonths = Math.max(1,
    (endDate.getFullYear() - startDate.getFullYear()) * 12 + 
    (endDate.getMonth() - startDate.getMonth())
  );
  const expectedProfit = parseFloat(investment.faceValue) * (parseFloat(investment.expectedIrr) / 100) * (durationMonths / 12);
  
  const roi = calculateROI(investment.faceValue, totalReturns);
  const hasReturns = totalReturns > 0;
  
  // Calculate delay duration for completed investments
  const delayDays = isCompleted && investment.actualEndDate
    ? Math.floor((new Date(investment.actualEndDate).getTime() - new Date(investment.endDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const isDelayed = delayDays > 0;
  const isDistressed = delayDays >= 90; // 3+ months delay

  // Format delay display
  const getDelayDisplay = () => {
    if (delayDays >= 30) {
      const months = Math.floor(delayDays / 30);
      return language === "ar" ? `${months}ش` : `${months}m`;
    }
    return language === "ar" ? `${delayDays}ي` : `${delayDays}d`;
  };

  const statusConfig = getInvestmentStatusConfig(investment.status);
  const platformBadgeClasses = getPlatformBadgeClasses(investment.platform?.name);
  const platformBorderClasses = getPlatformBorderClasses(investment.platform?.name);

  return (
    <Card className={`hover-elevate transition-all duration-200 border-l-4 ${platformBorderClasses}`} data-testid={`card-investment-${investment.id}`}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            {investment.platform && (
              <Badge variant="outline" className={`mb-2 text-xs ${platformBadgeClasses}`}>
                {investment.platform.name}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg line-clamp-2">{investment.name}</CardTitle>
              {investment.needsReview === 1 && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/30 text-xs px-1.5 py-0 h-5" data-testid="badge-needs-review">
                  <AlertTriangle className="h-3 w-3" />
                </Badge>
              )}
            </div>
          </div>
          <Badge className={statusConfig.badge} variant="outline" data-testid={`badge-status-${investment.status}`}>
            {t(`investments.${investment.status}`)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{t("investments.amount")}</div>
            <div className="text-lg font-bold">{formatCurrency(investment.faceValue)}</div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs font-semibold text-chart-2" data-testid={`apr-${investment.id}`}>
                {formatPercentage(investment.expectedIrr)}
              </span>
              <span className={cn("text-xs font-semibold", METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark)} data-testid={`roi-${investment.id}`}>
                {formatPercentage(roi)}
              </span>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {t("investments.irr")}
            </div>
            <div className="text-lg font-bold text-chart-1">{formatPercentage(investment.expectedIrr)}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{language === "ar" ? "الربح المتوقع" : "Expected Profit"}</div>
            <div className="text-lg font-bold text-primary">{formatCurrency(expectedProfit)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">{language === "ar" ? "المدة" : "Duration"}</div>
            <div className="text-lg font-bold">{durationMonths} {language === "ar" ? "شهر" : "months"}</div>
          </div>
        </div>
        
        {hasReturns && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {t("investments.actualROI")}
              </div>
              <div className={cn("text-lg font-bold", roi >= 0 ? cn(METRIC_COLOR_MAP.roi.colorLight, METRIC_COLOR_MAP.roi.colorDark) : 'text-destructive')} data-testid={`stat-roi-${investment.id}`}>
                {formatPercentage(roi)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">{t("dashboard.totalReturns")}</div>
              <div className="text-lg font-bold text-chart-2">{formatCurrency(totalReturns)}</div>
            </div>
          </div>
        )}

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{t("investments.startDate")}: {formatDate(investment.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>{t("investments.expectedEndDate")}: {formatDate(investment.endDate)}</span>
          </div>
          {isCompleted && investment.actualEndDate && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className={isDelayed ? "text-destructive font-medium" : "text-muted-foreground"}>
                {t("investments.actualEndDate")}: {formatDate(investment.actualEndDate)}
              </span>
            </div>
          )}
          {isActive && daysRemaining > 0 && (
            <div className="text-xs text-primary font-medium">
              {daysRemaining} {t("investments.daysRemaining")}
            </div>
          )}
          {isDelayed && (
            <div className={`flex items-center gap-2 text-xs font-medium ${isDistressed ? "text-destructive" : "text-orange-500"}`} data-testid="delay-indicator">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("investments.delayed")} {getDelayDisplay()}</span>
              {isDistressed && <Badge variant="destructive" className="ml-1 text-xs">{t("investments.distressed")}</Badge>}
            </div>
          )}
        </div>

        {investment.riskScore !== null && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">{t("investments.riskScore")}</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    investment.riskScore < 30
                      ? "bg-chart-2"
                      : investment.riskScore < 70
                      ? "bg-primary"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${investment.riskScore}%` }}
                />
              </div>
              <span className="text-xs font-medium">{investment.riskScore}/100</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4 gap-2">
        {isActive && onCompletePayment && (
          <Button
            variant="default"
            size="sm"
            onClick={onCompletePayment}
            data-testid={`button-complete-payment-${investment.id}`}
            className="flex-1 hover-elevate"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            {t("investments.confirmPayment") || "Confirm Payment"}
          </Button>
        )}
        <Button
          variant={isActive ? "outline" : "ghost"}
          size="sm"
          onClick={onEdit}
          data-testid={`button-edit-investment-${investment.id}`}
          className={isActive && onCompletePayment ? "flex-1 hover-elevate" : "w-full hover-elevate"}
        >
          <Edit className="h-4 w-4 mr-2" />
          {t("investments.editInvestment")}
        </Button>
      </CardFooter>
    </Card>
  );
}
