import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { InvestmentRow } from "@/components/investment-row";
import { InvestmentDialog } from "@/components/investment-dialog";
import { CompletePaymentDialog } from "@/components/complete-payment-dialog";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";

export default function Investments() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows, isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const handleEdit = (investment: InvestmentWithPlatform) => {
    setEditingInvestment(investment);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingInvestment(null);
    setDialogOpen(true);
  };

  const handleCompletePayment = (investment: InvestmentWithPlatform) => {
    setCompletingInvestment(investment);
    setCompletePaymentDialogOpen(true);
  };

  const isLoading = investmentsLoading || cashflowsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted mt-2" />
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 w-full animate-pulse rounded-lg bg-muted border-l-4 border-l-muted-foreground" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-investments" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("investments.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("investments.subtitle")}
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          data-testid="button-add-investment"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("investments.addInvestment")}
        </Button>
      </div>

      {investments && investments.length === 0 ? (
        <Card className="p-12" data-testid="card-empty-state">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">{t("investments.noInvestmentsYet")}</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {t("investments.noInvestmentsDesc")}
            </p>
            <Button onClick={handleAddNew} data-testid="button-add-first-investment">
              <Plus className="h-4 w-4 mr-2" />
              {t("investments.addFirstInvestment")}
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              {investments?.map((investment) => (
                <InvestmentRow
                  key={investment.id}
                  investment={investment}
                  cashflows={cashflows || []}
                  onEdit={() => handleEdit(investment)}
                  onCompletePayment={() => handleCompletePayment(investment)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
      />
      
      <CompletePaymentDialog
        open={completePaymentDialogOpen}
        onOpenChange={setCompletePaymentDialogOpen}
        investment={completingInvestment}
      />
    </div>
  );
}
