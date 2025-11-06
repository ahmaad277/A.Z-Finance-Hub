import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, DollarSign, Target, Percent } from "lucide-react";
import type { PortfolioStats } from "@shared/schema";
import { useLanguage } from "@/lib/language-provider";
import type { WidgetProps } from "@/types/widgets";

export function StatsOverviewWidget({ isEditing }: WidgetProps) {
  const { data: stats } = useQuery<PortfolioStats>({ 
    queryKey: ["/api/portfolio/stats"],
    enabled: !isEditing,
  });
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const statCards = [
    {
      title: t("dashboard.totalCapital"),
      value: stats?.totalCapital || 0,
      icon: DollarSign,
      color: "text-blue-600",
      testId: "total-capital",
    },
    {
      title: t("dashboard.totalReturns"),
      value: stats?.totalReturns || 0,
      icon: TrendingUp,
      color: "text-green-600",
      testId: "total-returns",
    },
    {
      title: t("dashboard.averageIrr"),
      value: stats?.averageIrr || 0,
      icon: Percent,
      color: "text-purple-600",
      suffix: "%",
      testId: "average-irr",
    },
    {
      title: t("dashboard.progressTo2040"),
      value: stats?.progressTo2040 || 0,
      icon: Target,
      color: "text-orange-600",
      suffix: "%",
      testId: "progress-2040",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {statCards.map((stat) => (
        <Card key={stat.testId} className="hover-elevate" data-testid={`card-stat-${stat.testId}`}>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold" data-testid={`stat-${stat.testId}`}>
              {stat.value.toLocaleString(isRTL ? "ar-SA" : "en-US", {
                minimumFractionDigits: stat.suffix === "%" ? 2 : 0,
                maximumFractionDigits: 2,
              })}
              {stat.suffix}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
