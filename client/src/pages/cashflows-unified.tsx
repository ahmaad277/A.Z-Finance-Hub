import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { AddCashDialog } from "@/components/add-cash-dialog";
import { CashflowForecastChart } from "@/components/cashflow-forecast-chart";
import { ForecastSummaryCards } from "@/components/forecast-summary-cards";
import { calculateMonthlyForecast, calculateForecastSummaries } from "@shared/cashflow-forecast";
import { 
  CheckCircle2, 
  Clock, 
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowRightLeft,
  DollarSign,
  Filter
} from "lucide-react";
import type { CashflowWithInvestment, CashTransaction } from "@shared/schema";

export default function CashflowsUnified() {
  const { t } = useLanguage();

  // Filter states for cash transactions
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Fetch cashflows from investments
  const { data: cashflows = [], isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
    refetchInterval: 60000, // Sync data every 60 seconds for multi-device usage
  });

  // Fetch cash transactions
  const { data: cashTransactions = [], isLoading: transactionsLoading } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
    refetchInterval: 60000, // Sync data every 60 seconds for multi-device usage
  });

  // Fetch cash balance
  const { data: cashBalanceResponse } = useQuery<{ balance: number }>({
    queryKey: ["/api/cash/balance"],
    refetchInterval: 60000, // Sync data every 60 seconds for multi-device usage
  });
  const cashBalance = cashBalanceResponse?.balance ?? 0;

  // Calculate investment cashflow statistics (profits only)
  const cashflowStats = useMemo(() => {
    const totalReceived = cashflows
      .filter(cf => cf.status === "received" && cf.type === "profit")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
    
    const totalExpected = cashflows
      .filter(cf => cf.status === "expected" && cf.type === "profit")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);

    return { totalReceived, totalExpected };
  }, [cashflows]);

  // Calculate cash transaction statistics
  const cashStats = useMemo(() => {
    const deposits = cashTransactions
      .filter(t => t.type === "deposit")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const withdrawals = cashTransactions
      .filter(t => t.type === "withdrawal")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const investments = cashTransactions
      .filter(t => t.type === "investment")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    
    const distributions = cashTransactions
      .filter(t => t.type === "distribution")
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return { deposits, withdrawals, investments, distributions };
  }, [cashTransactions]);

  // Calculate forecast data (memoized for performance)
  const forecastData = useMemo(() => {
    return calculateMonthlyForecast(cashflows, 60);
  }, [cashflows]);

  // Calculate forecast summaries
  const forecastSummaries = useMemo(() => {
    return calculateForecastSummaries(forecastData);
  }, [forecastData]);

  // Filter cash transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...cashTransactions];

    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    if (selectedPeriod !== "all") {
      const now = new Date();
      const filterDate = new Date();
      
      switch (selectedPeriod) {
        case "week":
          filterDate.setDate(now.getDate() - 7);
          break;
        case "month":
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case "quarter":
          filterDate.setMonth(now.getMonth() - 3);
          break;
        case "year":
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      filtered = filtered.filter(t => new Date(t.date) >= filterDate);
    }

    return filtered;
  }, [cashTransactions, selectedType, selectedPeriod]);

  // Combine all transactions for "All" tab
  const allTransactions = useMemo(() => {
    const cashflowTrans = cashflows.map(cf => ({
      id: `cf-${cf.id}`,
      date: cf.dueDate,
      type: "cashflow" as const,
      source: `${cf.investment.name} (${cf.investment.platform.name})`,
      amount: cf.amount,
      status: cf.status,
      cashflowType: cf.type,
      notes: t(`cashflows.${cf.type}`),
    }));

    const cashTrans = cashTransactions.map(ct => ({
      id: `ct-${ct.id}`,
      date: ct.date,
      type: "cash" as const,
      source: ct.source || "-",
      amount: ct.amount,
      transactionType: ct.type,
      notes: ct.notes || "-",
    }));

    return [...cashflowTrans, ...cashTrans].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [cashflows, cashTransactions, t]);

  const getCashflowStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return (
          <Badge className="bg-chart-2/10 text-chart-2 hover:bg-chart-2/20" data-testid={`badge-status-received`}>
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("cashflows.received")}
          </Badge>
        );
      case "expected":
        return (
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20" data-testid={`badge-status-expected`}>
            <Clock className="h-3 w-3 mr-1" />
            {t("cashflows.expected")}
          </Badge>
        );
      case "upcoming":
        return (
          <Badge variant="outline" data-testid={`badge-status-upcoming`}>
            <TrendingUp className="h-3 w-3 mr-1" />
            {t("cashflows.upcoming")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "deposit":
        return <TrendingUp className="h-4 w-4" />;
      case "withdrawal":
        return <TrendingDown className="h-4 w-4" />;
      case "investment":
        return <DollarSign className="h-4 w-4" />;
      case "distribution":
        return <ArrowRightLeft className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  const getCashTypeBadge = (type: string) => {
    const configs: Record<string, { className: string; label: string }> = {
      deposit: {
        className: "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20",
        label: t("cash.deposit"),
      },
      withdrawal: {
        className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        label: t("cash.withdrawal"),
      },
      investment: {
        className: "bg-primary/10 text-primary hover:bg-primary/20",
        label: t("cash.investment"),
      },
      distribution: {
        className: "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20",
        label: t("cash.distribution"),
      },
      transfer: {
        className: "bg-muted text-muted-foreground hover:bg-muted/80",
        label: t("cash.transfer"),
      },
    };

    const config = configs[type] || configs.transfer;
    return (
      <Badge className={config.className} data-testid={`badge-type-${type}`}>
        {getTypeIcon(type)}
        <span className="ml-1">{config.label}</span>
      </Badge>
    );
  };

  if (cashflowsLoading || transactionsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-96 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="page-cashflows-unified">
      {/* Header */}
      <div className="bg-primary/10 rounded-lg px-4 py-3 flex flex-row items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-shrink min-w-0">
          {t("cashflows.title")}
        </h1>
        <AddCashDialog />
      </div>

      {/* Combined Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="hover-elevate" data-testid="card-stat-availableBalance">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.availableBalance")}</p>
                <p className="text-2xl font-bold text-chart-2">{formatCurrency(cashBalance, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalReceived">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cashflows.totalReceived")}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashflowStats.totalReceived, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalExpected">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cashflows.expectedThisQuarter")}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashflowStats.totalExpected, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-totalDeposits">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.totalDeposits")}</p>
                <p className="text-2xl font-bold">{formatCurrency(cashStats.deposits, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-stat-fiveYearForecast">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("forecast.period.years5")}</p>
                <p className="text-2xl font-bold">{formatCurrency(forecastSummaries.months60.total, "SAR")}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cashflow Forecast Section */}
      {forecastData.some(month => month.total > 0) ? (
        <div className="space-y-4">
          <CashflowForecastChart data={forecastData} months={40} />
          <ForecastSummaryCards
            month1={forecastSummaries.month1}
            months3={forecastSummaries.months3}
            months6={forecastSummaries.months6}
            months12={forecastSummaries.months12}
            months24={forecastSummaries.months24}
            months60={forecastSummaries.months60}
          />
        </div>
      ) : cashflows.length > 0 ? (
        <Card data-testid="card-forecast-no-data">
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{t("forecast.noData")}</h3>
                <p className="text-sm text-muted-foreground">{t("forecast.noDataDesc")}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full" data-testid="tabs-cashflows">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" data-testid="tab-all">{t("cashflows.allTransactions")}</TabsTrigger>
          <TabsTrigger value="investment" data-testid="tab-investment">{t("cashflows.investmentCashflows")}</TabsTrigger>
          <TabsTrigger value="cash" data-testid="tab-cash">{t("cash.cashTransactions")}</TabsTrigger>
        </TabsList>

        {/* All Transactions Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card data-testid="card-all-transactions">
            <CardHeader>
              <CardTitle>{t("cashflows.allTransactions")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4 font-medium">{t("cashflows.date")}</th>
                      <th className="p-4 font-medium">{t("common.type")}</th>
                      <th className="p-4 font-medium hidden sm:table-cell">{t("cash.source")}</th>
                      <th className="p-4 font-medium text-right">{t("cashflows.amount")}</th>
                      <th className="p-4 font-medium hidden md:table-cell">{t("cash.notes")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {allTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-12 text-center text-muted-foreground">
                          {t("cashflows.noTransactions")}
                        </td>
                      </tr>
                    ) : (
                      allTransactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="hover-elevate transition-colors"
                          data-testid={`row-transaction-${transaction.id}`}
                        >
                          <td className="p-4">
                            <div className="font-medium">{formatDate(transaction.date)}</div>
                          </td>
                          <td className="p-4">
                            {transaction.type === "cashflow" ? (
                              <Badge variant="outline" className="capitalize">
                                {t("cashflows.investmentDistribution")}
                              </Badge>
                            ) : (
                              getCashTypeBadge(transaction.transactionType || "transfer")
                            )}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell">
                            {transaction.source}
                          </td>
                          <td className={`p-4 font-semibold text-right ${
                            transaction.type === "cashflow" || 
                            transaction.transactionType === "deposit" || 
                            transaction.transactionType === "distribution"
                              ? "text-chart-2"
                              : "text-destructive"
                          }`}>
                            {(transaction.type === "cashflow" || 
                              transaction.transactionType === "deposit" || 
                              transaction.transactionType === "distribution") ? "+" : "-"}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                            {transaction.notes}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Investment Cashflows Tab */}
        <TabsContent value="investment" className="space-y-4">
          <Card data-testid="card-investment-cashflows">
            <CardHeader>
              <CardTitle>{t("cashflows.allCashflows")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left text-sm text-muted-foreground">
                      <th className="p-4 font-medium">{t("cashflows.date")}</th>
                      <th className="p-4 font-medium">{t("cashflows.investment")}</th>
                      <th className="p-4 font-medium">{t("cashflows.platform")}</th>
                      <th className="p-4 font-medium">{t("cashflows.amount")}</th>
                      <th className="p-4 font-medium">{t("cashflows.status")}</th>
                      <th className="p-4 font-medium">{t("cashflows.type")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {cashflows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-muted-foreground">
                          {t("cashflows.noCashflows")}
                        </td>
                      </tr>
                    ) : (
                      cashflows.map((cashflow) => (
                        <tr
                          key={cashflow.id}
                          className="hover-elevate transition-colors"
                          data-testid={`row-cashflow-${cashflow.id}`}
                        >
                          <td className="p-4">
                            <div className="font-medium">{formatDate(cashflow.dueDate)}</div>
                            {cashflow.status === "upcoming" && (
                              <div className="text-xs text-muted-foreground">
                                {t("cashflows.inDays").replace("{0}", calculateDaysUntil(cashflow.dueDate).toString())}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="font-medium">{cashflow.investment.name}</div>
                          </td>
                          <td className="p-4">
                            <div className="text-sm text-muted-foreground">
                              {cashflow.investment.platform.name}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="font-semibold text-chart-2">
                              {formatCurrency(cashflow.amount)}
                            </div>
                          </td>
                          <td className="p-4">{getCashflowStatusBadge(cashflow.status)}</td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize" data-testid={`badge-type-${cashflow.type}`}>
                              {t(`cashflows.${cashflow.type}`)}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cash Transactions Tab */}
        <TabsContent value="cash" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("common.filters")}:</span>
                </div>
                
                <div className="flex flex-wrap gap-2 flex-1">
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[180px] h-9" data-testid="select-type">
                      <SelectValue placeholder={t("cash.selectType")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.all")}</SelectItem>
                      <SelectItem value="deposit">{t("cash.deposit")}</SelectItem>
                      <SelectItem value="withdrawal">{t("cash.withdrawal")}</SelectItem>
                      <SelectItem value="investment">{t("cash.investment")}</SelectItem>
                      <SelectItem value="distribution">{t("cash.distribution")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                    <SelectTrigger className="w-[180px] h-9" data-testid="select-period">
                      <SelectValue placeholder={t("cash.selectPeriod")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("common.allTime")}</SelectItem>
                      <SelectItem value="week">{t("common.lastWeek")}</SelectItem>
                      <SelectItem value="month">{t("common.lastMonth")}</SelectItem>
                      <SelectItem value="quarter">{t("common.lastQuarter")}</SelectItem>
                      <SelectItem value="year">{t("common.lastYear")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="text-sm text-muted-foreground">
                  {filteredTransactions.length} {t("cash.transactions")}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cash Transactions Table */}
          <Card data-testid="card-cash-transactions">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium text-sm">{t("cash.date")}</th>
                      <th className="text-left p-4 font-medium text-sm">{t("cash.type")}</th>
                      <th className="text-left p-4 font-medium text-sm hidden sm:table-cell">{t("cash.source")}</th>
                      <th className="text-right p-4 font-medium text-sm">{t("cash.amount")}</th>
                      <th className="text-left p-4 font-medium text-sm hidden md:table-cell">{t("cash.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-12 text-muted-foreground">
                          {t("cash.noTransactions")}
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b last:border-0 hover-elevate">
                          <td className="p-4 text-sm">{formatDate(transaction.date)}</td>
                          <td className="p-4">{getCashTypeBadge(transaction.type)}</td>
                          <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell capitalize">
                            {transaction.source || "-"}
                          </td>
                          <td className={`p-4 text-sm font-medium text-right ${
                            transaction.type === "deposit" || transaction.type === "distribution"
                              ? "text-chart-2"
                              : "text-destructive"
                          }`}>
                            {transaction.type === "deposit" || transaction.type === "distribution" ? "+" : "-"}
                            {formatCurrency(parseFloat(transaction.amount))}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">
                            {transaction.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
