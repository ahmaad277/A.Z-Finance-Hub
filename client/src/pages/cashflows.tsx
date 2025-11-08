import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate, calculateDaysUntil } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { CheckCircle2, Clock, TrendingUp } from "lucide-react";
import type { CashflowWithInvestment } from "@shared/schema";

export default function Cashflows() {
  const { t } = useLanguage();
  const { data: cashflows, isLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const getStatusBadge = (status: string) => {
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted mt-2" />
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-0">
            <div className="h-96 bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalReceived = cashflows?.filter(cf => cf.status === "received")
    .reduce((sum, cf) => sum + parseFloat(cf.amount), 0) || 0;
  
  const totalExpected = cashflows?.filter(cf => cf.status === "expected")
    .reduce((sum, cf) => sum + parseFloat(cf.amount), 0) || 0;

  return (
    <div className="space-y-4" data-testid="page-cashflows">
      {/* Blue Header Area with Title */}
      <div className="bg-primary/10 rounded-lg px-4 py-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{t("cashflows.title")}</h1>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
        <Card className="hover-elevate transition-all duration-200" data-testid="card-stat-totalReceived">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cashflows.totalReceived")}
            </CardTitle>
            <div className="bg-chart-2/10 text-chart-2 rounded-lg p-2">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-received">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>

        <Card className="hover-elevate transition-all duration-200" data-testid="card-stat-expectedThisQuarter">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("cashflows.expectedThisQuarter")}
            </CardTitle>
            <div className="bg-primary/10 text-primary rounded-lg p-2">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-expected">
              {formatCurrency(totalExpected)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-all-cashflows">
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
                {cashflows && cashflows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-muted-foreground">
                      {t("cashflows.noCashflows")}
                    </td>
                  </tr>
                ) : (
                  cashflows?.map((cashflow) => (
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
                      <td className="p-4">{getStatusBadge(cashflow.status)}</td>
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
    </div>
  );
}
