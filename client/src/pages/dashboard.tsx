import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Wallet, Target, Download, Banknote, Clock, AlertTriangle, ChevronDown, ChevronUp, Filter, PieChart } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { PortfolioChart } from "@/components/portfolio-chart";
import { UpcomingCashflows } from "@/components/upcoming-cashflows";
import { RecentInvestments } from "@/components/recent-investments";
import { PlatformCard } from "@/components/platform-card";
import { CashTransactionDialog } from "@/components/cash-transaction-dialog";
import { GoalCalculator } from "@/components/goal-calculator";
import { DateRangeFilter } from "@/components/date-range-filter";
import { FinancialMetricsOnly } from "@/components/financial-metrics-only";
import { InvestmentStatusChart } from "@/components/investment-status-chart";
import { generateComprehensiveReport, downloadCSV } from "@/lib/export-utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { calculateDashboardMetrics } from "@/lib/dashboardMetrics";
import type { PortfolioStats, InvestmentWithPlatform, CashflowWithInvestment, AnalyticsData, UserSettings, Platform, CashTransaction } from "@shared/schema";

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
  const [, setLocation] = useLocation();
  const { data: stats, isLoading } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
  });

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  // Date Range Filter for analytics
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | undefined>();

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Platform filter state
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

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

  const { data: cashBalance } = useQuery<{balance: number}>({
    queryKey: ["/api/cash/balance"],
  });

  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  // Calculate dashboard metrics for mobile view
  const dashboardMetrics = useMemo(() => {
    if (!investments || !cashflows || !platforms || !cashTransactions) {
      return null;
    }
    return calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows);
  }, [investments, cashflows, platforms, cashTransactions]);

  // Calculate filtered stats based on selected platform
  const filteredStats = useMemo(() => {
    if (!stats || !investments || !cashflows || selectedPlatform === "all") {
      return stats;
    }

    const platformInvestments = investments.filter(inv => inv.platformId === selectedPlatform);
    const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
    const platformCashflows = cashflows.filter(cf => platformInvestmentIds.has(cf.investmentId));

    const totalCapital = platformInvestments
      .filter((inv) => inv.status === "active")
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    const totalReturns = platformCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const activeInvestments = platformInvestments.filter((inv) => inv.status === "active").length;

    const averageIrr = platformInvestments.length > 0
      ? platformInvestments.reduce((sum, inv) => sum + parseFloat(inv.expectedIrr), 0) / platformInvestments.length
      : 0;

    const upcomingCashflow = platformCashflows
      .filter((cf) => cf.status === "expected" || cf.status === "upcoming")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const target2040 = 10000000;
    const progressTo2040 = (totalCapital / target2040) * 100;

    const totalCashBalance = platformCashflows
      .filter((cf) => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    const reinvestedAmount = platformInvestments
      .filter((inv) => inv.isReinvestment === 1 && (inv.status === "active" || inv.status === "pending"))
      .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

    const availableCash = totalCashBalance - reinvestedAmount;

    const completedInvestments = platformInvestments.filter((inv) => inv.status === "completed");
    const averageDuration = completedInvestments.length > 0
      ? completedInvestments.reduce((sum, inv) => {
          const start = new Date(inv.startDate);
          const end = new Date(inv.actualEndDate || inv.endDate);
          const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          return sum + duration;
        }, 0) / completedInvestments.length
      : 0;

    const now = new Date();
    const distressedCount = platformInvestments.filter((inv) => {
      if (inv.status !== "active") return false;
      const endDate = new Date(inv.endDate);
      const monthsDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      return monthsDelayed >= 3;
    }).length;

    return {
      totalCapital,
      totalReturns,
      averageIrr,
      activeInvestments,
      upcomingCashflow,
      progressTo2040,
      totalCashBalance,
      availableCash,
      reinvestedAmount,
      averageDuration: Math.round(averageDuration),
      distressedCount,
    };
  }, [stats, investments, cashflows, selectedPlatform]);

  // Use filtered or global stats
  const displayStats = filteredStats || stats;

  // Calculate status breakdown for chart
  const statusBreakdown = useMemo(() => {
    if (!investments) return null;

    const filteredInvestments = selectedPlatform === "all" 
      ? investments 
      : investments.filter(inv => inv.platformId === selectedPlatform);

    // Only count active and completed investments for the breakdown
    const relevantInvestments = filteredInvestments.filter(inv => 
      inv.status === "active" || inv.status === "completed"
    );
    
    const total = relevantInvestments.length;
    if (total === 0) return null;

    const now = new Date();
    let activeCount = 0;
    let completedCount = 0;
    let delayedCount = 0;
    let distressedCount = 0;

    relevantInvestments.forEach(inv => {
      if (inv.status === "completed") {
        completedCount++;
      } else if (inv.status === "active") {
        const endDate = new Date(inv.endDate);
        const daysDelayed = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysDelayed >= 90) { // 3+ months
          distressedCount++;
        } else if (daysDelayed > 0) {
          delayedCount++;
        } else {
          activeCount++;
        }
      }
    });

    return {
      active: ((activeCount / total) * 100).toFixed(1),
      completed: ((completedCount / total) * 100).toFixed(1),
      delayed: ((delayedCount / total) * 100).toFixed(1),
      distressed: ((distressedCount / total) * 100).toFixed(1),
      activeCount,
      completedCount,
      delayedCount,
      distressedCount,
      total
    };
  }, [investments, selectedPlatform]);

  // Calculate platform stats for Platform Cards
  const platformStats = useMemo(() => {
    if (!platforms || !investments || !cashflows) return [];

    return platforms.map(platform => {
      const platformInvestments = investments.filter(inv => inv.platformId === platform.id);
      const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
      const platformCashflows = cashflows.filter(cf => platformInvestmentIds.has(cf.investmentId));

      const totalReturns = platformCashflows
        .filter(cf => cf.status === "received")
        .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

      const activeInvestments = platformInvestments.filter(inv => inv.status === "active");
      const totalIrr = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.expectedIrr), 0);
      const averageIrr = activeInvestments.length > 0 ? totalIrr / activeInvestments.length : 0;

      const totalDuration = activeInvestments.reduce((sum, inv) => {
        const start = new Date(inv.startDate);
        const end = new Date(inv.endDate);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      const averageDuration = activeInvestments.length > 0 ? totalDuration / activeInvestments.length : 0;

      return {
        platform,
        investments: platformInvestments,
        totalReturns,
        averageIrr,
        averageDuration,
      };
    });
  }, [platforms, investments, cashflows]);

  const handleExport = (reportType: 'monthly' | 'quarterly') => {
    if (stats && investments && cashflows && analytics) {
      const csv = generateComprehensiveReport(stats, investments, cashflows, analytics, reportType);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`${reportType}-report-${date}.csv`, csv);
    }
  };

  // Vision 2040 Target & Progress Calculations
  const target2040 = settings?.targetCapital2040 ? parseFloat(settings.targetCapital2040) : 10000000;
  const initialPortfolio = 600000; // Starting portfolio value
  const currentDate = new Date();
  const targetDate = new Date(2040, 0, 1); // January 1, 2040
  const startDate = new Date(2024, 0, 1); // Assuming starting from 2024
  
  const totalYears = (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const elapsedYears = (currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  const remainingYears = totalYears - elapsedYears;
  
  // Use actual portfolio value or initial portfolio as fallback
  const currentPortfolioValue = displayStats && (displayStats.totalCapital + displayStats.totalCashBalance) > 0
    ? displayStats.totalCapital + displayStats.totalCashBalance
    : initialPortfolio;
    
  const currentProgress = Math.min(Math.max((currentPortfolioValue / target2040) * 100, 0), 100);
  
  // Expected progress based on time elapsed (clamped to [0,100])
  const expectedProgressPercent = Math.min(Math.max((elapsedYears / totalYears) * 100, 0), 100);
  const expectedValue = (target2040 * expectedProgressPercent) / 100;
  
  // Required annual return to reach target (safe division with fallback, clamped to [0,100])
  const requiredAnnualReturn = remainingYears > 0 && currentPortfolioValue > 0 && currentPortfolioValue < target2040
    ? Math.min(Math.max((Math.pow(target2040 / currentPortfolioValue, 1 / remainingYears) - 1) * 100, 0), 100)
    : 0;

  const cashStatCards = [
    {
      key: "totalCashBalance",
      value: displayStats ? formatCurrency(displayStats.totalCashBalance) : "-",
      icon: Wallet,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  // Calculate weighted average APR for additional metrics
  const weightedAvgAPR = useMemo(() => {
    if (!investments || investments.length === 0) return 0;
    
    const activeInvestments = selectedPlatform === "all" 
      ? investments.filter(inv => inv.status === "active")
      : investments.filter(inv => inv.status === "active" && inv.platformId === selectedPlatform);
    
    if (activeInvestments.length === 0) return 0;
    
    const totalValue = activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const weightedSum = activeInvestments.reduce((sum, inv) => {
      const weight = parseFloat(inv.amount) / totalValue;
      return sum + (parseFloat(inv.expectedIrr) * weight);
    }, 0);
    
    return weightedSum;
  }, [investments, selectedPlatform]);

  // Calculate next payment expected
  const nextPayment = useMemo(() => {
    if (!cashflows) return null;
    
    const upcomingCashflows = selectedPlatform === "all"
      ? cashflows.filter(cf => (cf.status === "expected" || cf.status === "upcoming"))
      : cashflows.filter(cf => {
          const investment = investments?.find(inv => inv.id === cf.investmentId);
          return (cf.status === "expected" || cf.status === "upcoming") && investment?.platformId === selectedPlatform;
        });
    
    if (upcomingCashflows.length === 0) return null;
    
    // Sort by due date
    const sortedCashflows = upcomingCashflows.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    
    return {
      amount: parseFloat(sortedCashflows[0].amount),
      date: new Date(sortedCashflows[0].dueDate),
      daysUntil: Math.ceil((new Date(sortedCashflows[0].dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    };
  }, [cashflows, investments, selectedPlatform]);

  const additionalStatCards = [
    {
      key: "weightedAvgAPR",
      value: formatPercentage(weightedAvgAPR),
      icon: TrendingUp,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      key: "nextPaymentExpected",
      value: nextPayment ? formatCurrency(nextPayment.amount) : "-",
      secondaryValue: nextPayment ? `${t("cashflows.inDays").replace("{0}", nextPayment.daysUntil.toString())}` : t("dashboard.noDataYet"),
      icon: Banknote,
      color: nextPayment && nextPayment.daysUntil <= 7 ? "text-chart-2" : "text-primary",
      bgColor: nextPayment && nextPayment.daysUntil <= 7 ? "bg-chart-2/10" : "bg-primary/10",
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
    <div className="space-y-4 md:space-y-6" data-testid="page-dashboard">
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex-shrink min-w-0">{t("dashboard.title")}</h1>
          <div className="flex flex-row items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Platform Filter - Icon Only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" data-testid="button-platform-filter" className="h-9 w-9">
                  <Filter className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => setSelectedPlatform("all")}
                  data-testid="menu-filter-all"
                  className={selectedPlatform === "all" ? "bg-accent" : ""}
                >
                  {t("dashboard.allPlatforms")}
                </DropdownMenuItem>
                {platforms?.map((platform) => (
                  <DropdownMenuItem 
                    key={platform.id} 
                    onClick={() => setSelectedPlatform(platform.id)}
                    data-testid={`menu-filter-${platform.id}`}
                    className={selectedPlatform === platform.id ? "bg-accent" : ""}
                  >
                    {platform.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Cash Transaction Buttons */}
            <CashTransactionDialog type="deposit" />
            <CashTransactionDialog type="withdrawal" />
            
            {/* Export Report */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-export-report" className="h-9 px-2 sm:px-4">
                  <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t("export.report")}</span>
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
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {/* 1. Financial Metrics Only (8 metrics) */}
      {dashboardMetrics && (
        <motion.div
          key="financial-metrics"
          {...fadeInUp}
        >
          <FinancialMetricsOnly metrics={dashboardMetrics} />
        </motion.div>
      )}

      {/* 2. Investment Status Pie Chart */}
      {dashboardMetrics && (
        <motion.div
          key="status-chart"
          {...fadeInUp}
        >
          <Card data-testid="card-status-chart-wrapper">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex-1">
                <InvestmentStatusChart 
                  metrics={dashboardMetrics} 
                  isCollapsed={isSectionCollapsed('status-chart')} 
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleSection('status-chart')}
                data-testid="button-toggle-status-chart"
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                {isSectionCollapsed('status-chart') ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            </CardHeader>
          </Card>
        </motion.div>
      )}

      {/* 3. Vision 2040 Progress Widget */}
      <Card className="hover-elevate transition-all duration-200" data-testid="card-vision-2040">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-chart-2/10 text-chart-2 rounded-md p-2">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("dashboard.vision2040Progress")}</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">{t("dashboard.vision2040Subtitle")}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Current Progress */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("dashboard.currentProgress")}</p>
              <p className="text-2xl font-bold">{formatPercentage(currentProgress)}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(currentPortfolioValue)}</p>
            </div>
            
            {/* Expected Progress */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("dashboard.expectedProgress")}</p>
              <p className="text-2xl font-bold">{formatPercentage(expectedProgressPercent)}</p>
              <p className="text-sm text-muted-foreground">{formatCurrency(expectedValue)}</p>
            </div>
            
            {/* Target */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("dashboard.target2040")}</p>
              <p className="text-2xl font-bold">{formatCurrency(target2040)}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.by2040")}</p>
            </div>
            
            {/* Required Annual Return */}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t("dashboard.requiredAnnualReturn")}</p>
              <p className="text-2xl font-bold text-chart-1">{formatPercentage(requiredAnnualReturn)}</p>
              <p className="text-sm text-muted-foreground">{t("dashboard.toReachTarget")}</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{formatCurrency(initialPortfolio)}</span>
              <span className="font-medium">{Math.round(elapsedYears * 10) / 10} / {Math.round(totalYears)} {t("dashboard.years")}</span>
              <span className="text-muted-foreground">{formatCurrency(target2040)}</span>
            </div>
            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute h-full bg-chart-2 transition-all duration-500"
                style={{ width: `${Math.min(currentProgress, 100)}%` }}
              />
              <div 
                className="absolute h-full border-r-2 border-chart-1 opacity-50"
                style={{ left: `${Math.min(expectedProgressPercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {currentProgress >= expectedProgressPercent 
                ? t("dashboard.aheadOfSchedule") 
                : t("dashboard.behindSchedule")}
            </p>
          </div>
        </CardContent>
      </Card>


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
                              {card.secondaryValue && (
                                <p className="text-xs text-muted-foreground mt-1">{card.secondaryValue}</p>
                              )}
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

      {/* Goal Calculator - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && (
          <motion.div
            key="goal-calculator"
            {...fadeInUp}
          >
            <GoalCalculator />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Investment Status Breakdown - Pro Mode Only */}
      <AnimatePresence mode="wait">
        {(!settings || settings.viewMode === "pro") && statusBreakdown && (
          <motion.div
            key="status-breakdown"
            {...fadeInUp}
          >
            <Card data-testid="card-status-breakdown">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    {t("dashboard.statusBreakdown")}
                  </div>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSection('status-breakdown')}
                  data-testid="button-toggle-status-breakdown"
                  className="h-8 w-8 p-0"
                >
                  {isSectionCollapsed('status-breakdown') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </Button>
              </CardHeader>
              <AnimatePresence initial={false}>
                {!isSectionCollapsed('status-breakdown') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ overflow: "hidden" }}
                  >
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-4">
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-chart-1/10 border border-chart-1/20">
                          <div className="text-3xl font-bold text-chart-1">{statusBreakdown.active}%</div>
                          <div className="text-sm text-muted-foreground mt-1">{t("dashboard.activeStatus")}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {statusBreakdown.activeCount} / {statusBreakdown.total}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-chart-2/10 border border-chart-2/20">
                          <div className="text-3xl font-bold text-chart-2">{statusBreakdown.completed}%</div>
                          <div className="text-sm text-muted-foreground mt-1">{t("dashboard.completedStatus")}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {statusBreakdown.completedCount} / {statusBreakdown.total}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{statusBreakdown.delayed}%</div>
                          <div className="text-sm text-muted-foreground mt-1">{t("dashboard.delayedStatus")}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {statusBreakdown.delayedCount} / {statusBreakdown.total}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="text-3xl font-bold text-destructive">{statusBreakdown.distressed}%</div>
                          <div className="text-sm text-muted-foreground mt-1">{t("dashboard.distressedStatus")}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {statusBreakdown.distressedCount} / {statusBreakdown.total}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Platforms Overview */}
      {platformStats.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">{t("dashboard.platformsOverview")}</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {platformStats.map(({ platform, investments, totalReturns, averageIrr, averageDuration }) => (
              <PlatformCard
                key={platform.id}
                platform={platform}
                investments={investments}
                totalReturns={totalReturns}
                averageIrr={averageIrr}
                averageDuration={averageDuration}
                onClick={() => setLocation(`/platform/${platform.id}`)}
              />
            ))}
          </div>
        </div>
      )}

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
