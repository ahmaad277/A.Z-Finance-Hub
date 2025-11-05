import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, PiggyBank, RefreshCw } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { ReinvestmentDialog } from "@/components/reinvestment-dialog";
import type { PortfolioStats, InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";

export default function Reinvestment() {
  const { t } = useLanguage();
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<PortfolioStats>({
    queryKey: ["/api/portfolio/stats"],
  });

  const { data: cashflows, isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  if (statsLoading || cashflowsLoading || investmentsLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Calculate available cash balance
  const receivedCashflows = cashflows?.filter(cf => cf.status === "received") || [];
  const totalReceived = receivedCashflows.reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
  
  // Calculate total reinvested amount (investments with "(Reinvestment" in the name)
  const reinvestedAmount = (investments || [])
    .filter(inv => inv.name.includes("(Reinvestment"))
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
  
  // Get currently invested total capital
  const totalInvested = stats?.totalCapital || 0;
  
  // Available cash = total received minus already reinvested
  const availableCash = totalReceived - reinvestedAmount;

  // Get active investments sorted by IRR (best opportunities first)
  const activeInvestments = (investments || [])
    .filter(inv => inv.status === "active")
    .sort((a, b) => parseFloat(b.expectedIrr) - parseFloat(a.expectedIrr));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-page-title">
          {t("reinvestment.title")}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-page-description">
          {t("reinvestment.description")}
        </p>
      </div>

      {/* Cash Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reinvestment.availableCash")}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-available-cash">
              {availableCash.toFixed(2)} {t("common.sar")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reinvestment.fromDistributions")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reinvestment.totalInvested")}
            </CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-invested">
              {totalInvested.toFixed(2)} {t("common.sar")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reinvestment.currentCapital")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("reinvestment.receivedCount")}
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-received-count">
              {receivedCashflows.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("reinvestment.distributions")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reinvestment Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            {t("reinvestment.opportunitiesTitle")}
          </CardTitle>
          <CardDescription>
            {t("reinvestment.opportunitiesDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeInvestments.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-opportunities">
              {t("reinvestment.noOpportunities")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeInvestments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover-elevate active-elevate-2"
                  data-testid={`card-opportunity-${investment.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold" data-testid={`text-opportunity-name-${investment.id}`}>
                        {investment.name}
                      </h3>
                      <Badge variant="outline" data-testid={`badge-platform-${investment.id}`}>
                        {investment.platform.name}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span data-testid={`text-opportunity-irr-${investment.id}`}>
                        {t("investments.expectedIrr")}: {parseFloat(investment.expectedIrr).toFixed(2)}%
                      </span>
                      <span data-testid={`text-opportunity-frequency-${investment.id}`}>
                        {investment.distributionFrequency}
                      </span>
                      <span data-testid={`text-opportunity-risk-${investment.id}`}>
                        {t("investments.risk")}: {investment.riskScore || 50}/100
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={availableCash <= 0}
                    onClick={() => {
                      setSelectedInvestment(investment);
                      setDialogOpen(true);
                    }}
                    data-testid={`button-reinvest-${investment.id}`}
                  >
                    {t("reinvestment.reinvest")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Distributions */}
      <Card>
        <CardHeader>
          <CardTitle>{t("reinvestment.recentDistributions")}</CardTitle>
          <CardDescription>
            {t("reinvestment.recentDistributionsDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivedCashflows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8" data-testid="text-no-distributions">
              {t("reinvestment.noDistributions")}
            </p>
          ) : (
            <div className="space-y-2">
              {receivedCashflows.slice(0, 10).map((cashflow) => (
                <div
                  key={cashflow.id}
                  className="flex items-center justify-between p-3 rounded-md border"
                  data-testid={`card-distribution-${cashflow.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-distribution-investment-${cashflow.id}`}>
                      {cashflow.investment.name}
                    </p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-distribution-platform-${cashflow.id}`}>
                      {cashflow.investment.platform.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success" data-testid={`text-distribution-amount-${cashflow.id}`}>
                      +{parseFloat(cashflow.amount).toFixed(2)} {t("common.sar")}
                    </p>
                    <p className="text-xs text-muted-foreground" data-testid={`text-distribution-date-${cashflow.id}`}>
                      {cashflow.receivedDate ? new Date(cashflow.receivedDate).toLocaleDateString() : ""}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ReinvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={selectedInvestment}
        availableCash={availableCash}
      />
    </div>
  );
}
