import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddCashDialog } from "@/components/add-cash-dialog";
import { Wallet, TrendingUp, TrendingDown, ArrowRightLeft, DollarSign, Filter } from "lucide-react";
import type { CashTransaction } from "@shared/schema";

export default function Cash() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  // Filter states
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  const { data: cashTransactions = [], isLoading: transactionsLoading } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  const { data: cashBalanceResponse } = useQuery<{ balance: number }>({
    queryKey: ["/api/cash/balance"],
  });
  const cashBalance = cashBalanceResponse?.balance ?? 0;

  // Calculate statistics
  const stats = useMemo(() => {
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

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    let filtered = [...cashTransactions];

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter(t => t.type === selectedType);
    }

    // Filter by period
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

  const getTypeBadge = (type: string) => {
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

  if (transactionsLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
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
    <div className="space-y-4" data-testid="page-cash">
      {/* Header */}
      <div className="bg-primary/10 rounded-lg px-4 py-3 flex flex-row items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-shrink min-w-0">
          {t("cash.title")}
        </h1>
        <AddCashDialog />
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.availableBalance")}</p>
                <p className="text-2xl font-bold text-chart-2">{formatCurrency(cashBalance, language)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.totalDeposits")}</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.deposits, language)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-chart-2/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.totalWithdrawals")}</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.withdrawals, language)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t("cash.totalInvestments")}</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.investments, language)}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Transactions Table */}
      <Card>
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
                      <td className="p-4 text-sm">{formatDate(transaction.date, language)}</td>
                      <td className="p-4">{getTypeBadge(transaction.type)}</td>
                      <td className="p-4 text-sm text-muted-foreground hidden sm:table-cell capitalize">
                        {transaction.source || "-"}
                      </td>
                      <td className={`p-4 text-sm font-medium text-right ${
                        transaction.type === "deposit" || transaction.type === "distribution"
                          ? "text-chart-2"
                          : "text-destructive"
                      }`}>
                        {transaction.type === "deposit" || transaction.type === "distribution" ? "+" : "-"}
                        {formatCurrency(parseFloat(transaction.amount), language)}
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
    </div>
  );
}
