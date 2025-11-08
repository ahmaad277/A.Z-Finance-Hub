import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatPercentage } from "@/lib/utils";
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
      id: "returns-ratio",
      icon: TrendingUp,
      label: isRTL ? "نسبة العائد" : "Returns Ratio",
      value: formatPercentage(metrics.returnsRatio),
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-600/10",
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
      label: isRTL ? "متوسط APR المرجح" : "Weighted APR",
      value: formatPercentage(metrics.weightedAPR),
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-purple-600/10",
    },
    {
      id: "portfolio-roi",
      icon: Target,
      label: isRTL ? "العائد على الاستثمار" : "Portfolio ROI",
      value: formatPercentage(metrics.portfolioROI),
      subtitle: formatCurrency(metrics.totalProfitAmount),
      color: "text-indigo-600 dark:text-indigo-400",
      bgColor: "bg-indigo-600/10",
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
    <div>
      <h3 className="text-lg font-semibold mb-3" data-testid="heading-financial-metrics">
        {isRTL ? "المؤشرات المالية" : "Financial Metrics"}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-3">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card 
              key={card.id} 
              className="hover-elevate transition-all duration-200" 
              data-testid={`metric-card-${card.id}`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-0.5 pt-2 px-3">
                <CardTitle className="text-xs font-medium text-muted-foreground line-clamp-1">
                  {card.label}
                </CardTitle>
                <div className={`${card.bgColor} ${card.color} rounded-md p-1.5 shrink-0`}>
                  <Icon className="h-3 w-3" />
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-2 pt-0.5">
                <div className="text-lg font-bold" data-testid={`metric-value-${card.id}`}>
                  {card.value}
                </div>
                {card.subtitle && (
                  <div className="text-xs text-muted-foreground mt-0.5" data-testid={`metric-subtitle-${card.id}`}>
                    {card.subtitle}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Investment Status Chart as a metric card */}
      <div className="mt-3">
        <InvestmentStatusChart metrics={metrics} />
      </div>
    </div>
  );
}
