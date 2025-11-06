import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/lib/language-provider";
import { InvestmentRow } from "@/components/investment-row";
import { InvestmentDialog } from "@/components/investment-dialog";
import { CompletePaymentDialog } from "@/components/complete-payment-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";

export default function Investments() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<InvestmentWithPlatform | null>(null);

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows, isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/investments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف الاستثمار بنجاح" : "Investment deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل حذف الاستثمار" : "Failed to delete investment"),
        variant: "destructive",
      });
    },
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

  const handleDelete = (investment: InvestmentWithPlatform) => {
    setDeletingInvestment(investment);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingInvestment) {
      deleteMutation.mutate(deletingInvestment.id);
    }
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("investments.title")}</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t("investments.subtitle")}
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          data-testid="button-add-investment"
          className="gap-2 w-full sm:w-auto justify-center"
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
                  onDelete={() => handleDelete(investment)}
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("investments.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("investments.deleteWarning")}
              {deletingInvestment && (
                <div className="mt-2 font-semibold">
                  {deletingInvestment.name}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {language === "ar" ? "إلغاء" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending
                ? (language === "ar" ? "جاري الحذف..." : "Deleting...")
                : (language === "ar" ? "حذف" : "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
