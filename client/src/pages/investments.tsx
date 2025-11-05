import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { InvestmentCard } from "@/components/investment-card";
import { InvestmentDialog } from "@/components/investment-dialog";
import type { InvestmentWithPlatform } from "@shared/schema";

export default function Investments() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);

  const { data: investments, isLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const handleEdit = (investment: InvestmentWithPlatform) => {
    setEditingInvestment(investment);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingInvestment(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-96 animate-pulse rounded bg-muted mt-2" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="h-4 w-full rounded bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-investments">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {investments?.map((investment) => (
            <InvestmentCard
              key={investment.id}
              investment={investment}
              onEdit={() => handleEdit(investment)}
            />
          ))}
        </div>
      )}

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
      />
    </div>
  );
}
