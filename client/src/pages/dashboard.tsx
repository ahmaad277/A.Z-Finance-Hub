import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TrendingUp, Wallet, BarChart3, Target, Download } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { PortfolioChart } from "@/components/portfolio-chart";
import { UpcomingCashflows } from "@/components/upcoming-cashflows";
import { RecentInvestments } from "@/components/recent-investments";
import { generateComprehensiveReport, downloadCSV } from "@/lib/export-utils";
import type { PortfolioStats, InvestmentWithPlatform, CashflowWithInvestment, AnalyticsData } from "@shared/schema";

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
  });

  const { data: investments } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: analytics } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  const handleExport = (reportType: 'monthly' | 'quarterly') => {
    if (stats && investments && cashflows && analytics) {
      const csv = generateComprehensiveReport(stats, investments, cashflows, analytics, reportType);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`${reportType}-report-${date}.csv`, csv);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("dashboard.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("dashboard.subtitle")}
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" data-testid="button-export-report">
              <Download className="h-4 w-4 mr-2" />
              {t("export.report")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('monthly')} data-testid="menu-export-monthly">
              {t("export.monthly")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('quarterly')} data-testid="menu-export-quarterly">
              {t("export.quarterly")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
