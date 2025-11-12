import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatPercentage, METRIC_COLOR_MAP, cn } from "@/lib/utils";
import { InvestmentStatusChart } from "@/components/investment-status-chart";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  Droplet, 
  Percent, 
  Target, 
  Calendar, 
  Activity
} from "lucide-react";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface FinancialMetricsOnlyProps {
  metrics: DashboardMetrics;
}

export function FinancialMetricsOnly({ metrics }: FinancialMetricsOnlyProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const metricCards = [
    {
      id: "portfolio-value",
      icon: Wallet,
      label: isRTL ? "قيمة المحفظة" : "Portfolio Value",
      value: formatCurrency(metrics.portfolioValue),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      id: "cash-available",
      icon: DollarSign,
      label: isRTL ? "الكاش المتاح" : "Cash Available",
      value: formatCurrency(metrics.totalCash),
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-600/10",
    },
    {
      id: "active-apr",
      icon: TrendingUp,
      label: t("metrics.activeAPR"),
      value: formatPercentage(metrics.activeAPR),
      subtitle: t("metrics.activeAPRSubtitle"),
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "cash-ratio",
      icon: Droplet,
      label: isRTL ? "نسبة الكاش" : "Cash Ratio",
      value: formatPercentage(metrics.cashRatio),
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-600/10",
    },
    {
      id: "weighted-apr",
      icon: Percent,
      label: t("metrics.historicalAPR"),
      value: formatPercentage(metrics.weightedAPR),
      subtitle: t("metrics.historicalAPRSubtitle"),
      colorLight: METRIC_COLOR_MAP.apr.colorLight,
      colorDark: METRIC_COLOR_MAP.apr.colorDark,
      bgColor: METRIC_COLOR_MAP.apr.bgColor,
    },
    {
      id: "portfolio-roi",
      icon: Target,
      label: t("metrics.portfolioROI"),
      value: formatPercentage(metrics.portfolioROI),
      subtitle: formatCurrency(metrics.totalProfitAmount),
      colorLight: METRIC_COLOR_MAP.roi.colorLight,
      colorDark: METRIC_COLOR_MAP.roi.colorDark,
      bgColor: METRIC_COLOR_MAP.roi.bgColor,
    },
    {
      id: "avg-duration",
      icon: Calendar,
      label: isRTL ? "متوسط المدة" : "Avg Duration",
      value: isRTL ? `${metrics.avgDuration} شهر` : `${metrics.avgDuration} months`,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-600/10",
    },
    {
      id: "avg-amount",
      icon: Activity,
      label: isRTL ? "متوسط القيمة" : "Avg Amount",
      value: formatCurrency(metrics.avgAmount),
      color: "text-teal-600 dark:text-teal-400",
      bgColor: "bg-teal-600/10",
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 sm:gap-6">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.id} 
              className="hover-elevate" 
              data-testid={`metric-card-${card.id}`}
            >
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground line-clamp-1">
                  {card.label}
                </CardTitle>
                <div className={`${card.bgColor} ${card.color} rounded-md p-2 shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className={cn("text-xl font-bold tracking-tight", card.colorLight, card.colorDark)} data-testid={`metric-value-${card.id}`}>
                  {card.value}
                </div>
                {card.subtitle && (
                  <div className="text-xs text-muted-foreground mt-1" data-testid={`metric-subtitle-${card.id}`}>
                    {card.subtitle}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Investment Status Chart as a metric card */}
      <InvestmentStatusChart metrics={metrics} />
    </div>
  );
}
