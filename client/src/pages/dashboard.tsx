import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TrendingUp, Wallet, BarChart3, Target, Download, Banknote, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { PortfolioChart } from "@/components/portfolio-chart";
import { UpcomingCashflows } from "@/components/upcoming-cashflows";
import { RecentInvestments } from "@/components/recent-investments";
import { generateComprehensiveReport, downloadCSV } from "@/lib/export-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { PortfolioStats, InvestmentWithPlatform, CashflowWithInvestment, AnalyticsData, UserSettings } from "@shared/schema";

// Animation variants for smooth transitions
const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3, ease: "easeInOut" }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Dashboard() {
  const { t } = useLanguage();
  const { data: stats, isLoading } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  // Track collapsed sections locally
  const [collapsedSections, setCollapsedSections] = useState<string[]>([]);

  // Sync with settings when they load
  useEffect(() => {
    if (settings?.collapsedSections) {
      try {
        const parsed = JSON.parse(settings.collapsedSections);
        setCollapsedSections(Array.isArray(parsed) ? parsed : []);
      } catch {
        setCollapsedSections([]);
      }
    } else {
      setCollapsedSections([]);
    }
  }, [settings?.collapsedSections]);

  // Mutation to save collapsed sections
  const updateCollapsedSections = useMutation({
    mutationFn: async (sections: string[]) => {
      const response = await apiRequest("PUT", "/api/settings", {
        collapsedSections: JSON.stringify(sections),
      });
      return response.json();
    },
    onSuccess: (data) => {
      // Update the cache directly instead of invalidating to avoid race conditions
      queryClient.setQueryData(["/api/settings"], data);
    },
  });

  // Toggle section collapse state
  const toggleSection = (sectionId: string) => {
    const newCollapsed = collapsedSections.includes(sectionId)
      ? collapsedSections.filter(id => id !== sectionId)
      : [...collapsedSections, sectionId];
    
    setCollapsedSections(newCollapsed);
    updateCollapsedSections.mutate(newCollapsed);
  };

  const isSectionCollapsed = (sectionId: string) => collapsedSections.includes(sectionId);

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

  const mainStatCards = [
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

  const cashStatCards = [
    {
      key: "availableCash",
      value: stats ? formatCurrency(stats.availableCash) : "-",
      icon: Banknote,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      key: "totalCashBalance",
      value: stats ? formatCurrency(stats.totalCashBalance) : "-",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "reinvestedAmount",
      value: stats ? formatCurrency(stats.reinvestedAmount) : "-",
      icon: TrendingUp,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
  ];

  const additionalStatCards = [
    {
      key: "averageDuration",
      value: stats ? `${stats.averageDuration} ${t("dashboard.days")}` : "-",
      icon: Clock,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      key: "distressedCount",
      value: stats ? `${stats.distressedCount} ${t("dashboard.investments")}` : "-",
      icon: AlertTriangle,
      color: stats && stats.distressedCount > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: stats && stats.distressedCount > 0 ? "bg-destructive/10" : "bg-muted/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
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
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 w-32 rounded bg-muted" />
          </CardHeader>
          <CardContent>
            <div className="h-24 w-full rounded bg-muted" />
          </CardContent>
        </Card>
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
        {mainStatCards.map((card) => (
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

      {/* Cash Management Section - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && (
          <motion.div
            key="cash-management"
            {...fadeInUp}
          >
            <Card data-testid="card-cash-management">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{t("dashboard.cashManagement")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('cash-management')}
                  data-testid="button-toggle-cash-management"
                  className="h-8 w-8 p-0"
                >
                  {isSectionCollapsed('cash-management') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {!isSectionCollapsed('cash-management') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-3">
                        {cashStatCards.map((card) => (
                          <div key={card.key} className="flex items-center gap-4" data-testid={`cash-stat-${card.key}`}>
                            <div className={`${card.bgColor} ${card.color} rounded-lg p-3`}>
                              <card.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t(`dashboard.${card.key}`)}</p>
                              <p className="text-xl font-bold" data-testid={`stat-${card.key}`}>{card.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Additional Metrics Section - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && (
          <motion.div
            key="additional-metrics"
            {...fadeInUp}
          >
            <Card data-testid="card-additional-metrics">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{t("dashboard.additionalMetrics")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('additional-metrics')}
                  data-testid="button-toggle-additional-metrics"
                  className="h-8 w-8 p-0"
                >
                  {isSectionCollapsed('additional-metrics') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {!isSectionCollapsed('additional-metrics') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent>
                      <div className="grid gap-6 md:grid-cols-2">
                        {additionalStatCards.map((card) => (
                          <div key={card.key} className="flex items-center gap-4" data-testid={`additional-stat-${card.key}`}>
                            <div className={`${card.bgColor} ${card.color} rounded-lg p-3`}>
                              <card.icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">{t(`dashboard.${card.key}`)}</p>
                              <p className="text-xl font-bold" data-testid={`stat-${card.key}`}>{card.value}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analytics Charts and Lists - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && (
          <motion.div
            key="analytics-section"
            {...fadeInUp}
            className="space-y-6"
          >
            <div className="grid gap-6 lg:grid-cols-7">
              <Card className="lg:col-span-4" data-testid="card-portfolio-performance">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>{t("dashboard.portfolioPerformance")}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('portfolio-performance')}
                    data-testid="button-toggle-portfolio-performance"
                    className="h-8 w-8 p-0"
                  >
                    {isSectionCollapsed('portfolio-performance') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <AnimatePresence initial={false}>
                  {!isSectionCollapsed('portfolio-performance') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <CardContent>
                        <PortfolioChart />
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>

              <Card className="lg:col-span-3" data-testid="card-upcoming-cashflows">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                  <CardTitle>{t("dashboard.upcomingCashflows")}</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSection('upcoming-cashflows')}
                    data-testid="button-toggle-upcoming-cashflows"
                    className="h-8 w-8 p-0"
                  >
                    {isSectionCollapsed('upcoming-cashflows') ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </CardHeader>
                <AnimatePresence initial={false}>
                  {!isSectionCollapsed('upcoming-cashflows') && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      style={{ overflow: "hidden" }}
                    >
                      <CardContent>
                        <UpcomingCashflows />
                      </CardContent>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </div>

            <Card data-testid="card-recent-investments">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{t("dashboard.recentInvestments")}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('recent-investments')}
                  data-testid="button-toggle-recent-investments"
                  className="h-8 w-8 p-0"
                >
                  {isSectionCollapsed('recent-investments') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {!isSectionCollapsed('recent-investments') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent>
                      <RecentInvestments />
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
