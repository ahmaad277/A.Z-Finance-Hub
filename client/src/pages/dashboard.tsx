import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Wallet, BarChart3, Target } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { PortfolioChart } from "@/components/portfolio-chart";
import { UpcomingCashflows } from "@/components/upcoming-cashflows";
import { RecentInvestments } from "@/components/recent-investments";
import type { PortfolioStats } from "@shared/schema";

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
  });

  const statCards = [
    {
      key: "totalCapital",
      value: stats ? formatCurrency(stats.totalCapital) : "-",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "totalReturns",
      value: stats ? formatCurrency(stats.totalReturns) : "-",
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      key: "averageIrr",
      value: stats ? formatPercentage(stats.averageIrr) : "-",
      icon: BarChart3,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      key: "progressTo2040",
      value: stats ? formatPercentage(stats.progressTo2040) : "-",
      icon: Target,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-0 pb-2">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-dashboard">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.key} className="hover-elevate transition-all duration-200" data-testid={`card-stat-${card.key}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t(`dashboard.${card.key}`)}
              </CardTitle>
              <div className={`${card.bgColor} ${card.color} rounded-lg p-2`}>
                <card.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={`stat-${card.key}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4" data-testid="card-portfolio-performance">
          <CardHeader>
            <CardTitle>{t("dashboard.portfolioPerformance")}</CardTitle>
          </CardHeader>
          <CardContent>
            <PortfolioChart />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3" data-testid="card-upcoming-cashflows">
          <CardHeader>
            <CardTitle>{t("dashboard.upcomingCashflows")}</CardTitle>
          </CardHeader>
          <CardContent>
            <UpcomingCashflows />
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-recent-investments">
        <CardHeader>
          <CardTitle>{t("dashboard.recentInvestments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentInvestments />
        </CardContent>
      </Card>
    </div>
  );
}
