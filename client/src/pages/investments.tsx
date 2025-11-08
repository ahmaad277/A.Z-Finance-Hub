import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Filter, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform } from "@shared/schema";

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

  // Filter and Sort States
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows, isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Mutation to mark cashflow as received
  const updateCashflowMutation = useMutation({
    mutationFn: async ({ cashflowId, status }: { cashflowId: string; status: string }) => {
      return apiRequest("PATCH", `/api/cashflows/${cashflowId}`, { 
        status,
        receivedDate: status === "received" ? new Date().toISOString() : null
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تحديث حالة الدفعة بنجاح" : "Payment status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل تحديث حالة الدفعة" : "Failed to update payment status"),
        variant: "destructive",
      });
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/investments/${id}`);
    },
    onMutate: async (id: string) => {
      // Cancel outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ["/api/investments"] });
      await queryClient.cancelQueries({ queryKey: ["/api/cashflows"] });
      
      // Snapshot the previous value
      const previousInvestments = queryClient.getQueryData(["/api/investments"]);
      
      // Optimistically update the cache
      queryClient.setQueryData(["/api/investments"], (old: InvestmentWithPlatform[] | undefined) => {
        return old ? old.filter(inv => inv.id !== id) : [];
      });
      
      // Return context with snapshot
      return { previousInvestments };
    },
    onSuccess: () => {
      // Invalidate all related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash-balance"] });
      
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف الاستثمار بنجاح" : "Investment deleted successfully",
      });
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
    },
    onError: (error: any, id: string, context: any) => {
      // Check if it's a 404 error (investment already deleted or doesn't exist)
      const is404 = error.message?.includes("404") || error.message?.includes("not found");
      
      if (is404) {
        // Don't rollback - keep the optimistic update (investment removed from cache)
        // Refetch to ensure cache is in sync with server
        queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
        queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
        
        toast({
          title: language === "ar" ? "تم بالفعل" : "Already Deleted",
          description: language === "ar" ? "هذا الاستثمار غير موجود أو تم حذفه مسبقاً. تم تحديث البيانات." : "This investment was already deleted or doesn't exist. Data refreshed.",
        });
      } else {
        // Rollback to previous state for other errors
        if (context?.previousInvestments) {
          queryClient.setQueryData(["/api/investments"], context.previousInvestments);
        }
        
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description: error.message || (language === "ar" ? "فشل حذف الاستثمار" : "Failed to delete investment"),
          variant: "destructive",
        });
      }
      
      // Close dialog even on error to prevent re-attempts
      setDeleteDialogOpen(false);
      setDeletingInvestment(null);
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
  
  // Payment management handlers
  const handleMarkPaymentAsReceived = (cashflowId: string) => {
    updateCashflowMutation.mutate({ cashflowId, status: "received" });
  };
  
  const handleAddPayment = () => {
    // TODO: Open dialog to add new payment
    toast({
      title: language === "ar" ? "قريباً" : "Coming Soon",
      description: language === "ar" ? "ميزة إضافة دفعة جديدة قيد التطوير" : "Add payment feature is under development",
    });
  };
  
  const handleRemovePayment = (cashflowId: string) => {
    // TODO: Implement remove payment logic
    toast({
      title: language === "ar" ? "قريباً" : "Coming Soon",
      description: language === "ar" ? "ميزة حذف الدفعة قيد التطوير" : "Remove payment feature is under development",
    });
  };

  // Filter and Sort Logic
  const filteredAndSortedInvestments = useMemo(() => {
    if (!investments) return [];

    let filtered = investments;

    // Filter by platform
    if (selectedPlatform !== "all") {
      filtered = filtered.filter(inv => inv.platformId === selectedPlatform);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(inv => inv.status === selectedStatus);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "date-desc":
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case "date-asc":
          return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
        case "amount-desc":
          return parseFloat(b.amount) - parseFloat(a.amount);
        case "amount-asc":
          return parseFloat(a.amount) - parseFloat(b.amount);
        case "end-date-asc":
          return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
        case "end-date-desc":
          return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
        default:
          return 0;
      }
    });

    return sorted;
  }, [investments, selectedPlatform, selectedStatus, sortBy]);

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
    <div className="space-y-4" data-testid="page-investments" dir={isRtl ? "rtl" : "ltr"}>
      {/* Blue Header Area with Title and Button */}
      <div className="bg-primary/10 rounded-lg px-4 py-3 flex flex-row items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-shrink min-w-0">{t("investments.title")}</h1>
        <Button
          onClick={handleAddNew}
          data-testid="button-add-investment"
          className="gap-2 flex-shrink-0 h-9"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">{t("investments.addInvestment")}</span>
        </Button>
      </div>

      {/* Filters and Sort */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-platform-filter">
            <Filter className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === "ar" ? "كل المنصات" : "All Platforms"}</SelectItem>
            {platforms?.map((platform) => (
              <SelectItem key={platform.id} value={platform.id}>
                {platform.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{language === "ar" ? "كل الحالات" : "All Statuses"}</SelectItem>
            <SelectItem value="active">{t("investments.active")}</SelectItem>
            <SelectItem value="pending">{t("investments.pending")}</SelectItem>
            <SelectItem value="completed">{t("investments.completed")}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-sort-by">
            <ArrowUpDown className="h-4 w-4 mr-2 shrink-0" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-desc">{language === "ar" ? "الأحدث أولاً" : "Newest First"}</SelectItem>
            <SelectItem value="date-asc">{language === "ar" ? "الأقدم أولاً" : "Oldest First"}</SelectItem>
            <SelectItem value="end-date-asc">{language === "ar" ? "الأقرب انتهاءً" : "Ending Soonest"}</SelectItem>
            <SelectItem value="end-date-desc">{language === "ar" ? "الأبعد انتهاءً" : "Ending Latest"}</SelectItem>
            <SelectItem value="amount-desc">{language === "ar" ? "الأكبر مبلغاً" : "Largest Amount"}</SelectItem>
            <SelectItem value="amount-asc">{language === "ar" ? "الأصغر مبلغاً" : "Smallest Amount"}</SelectItem>
          </SelectContent>
        </Select>

        {(selectedPlatform !== "all" || selectedStatus !== "all" || sortBy !== "date-desc") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedPlatform("all");
              setSelectedStatus("all");
              setSortBy("date-desc");
            }}
            className="w-full sm:w-auto"
          >
            {language === "ar" ? "إعادة تعيين" : "Reset"}
          </Button>
        )}
      </div>

      {filteredAndSortedInvestments.length === 0 ? (
        <Card className="p-12" data-testid="card-empty-state">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Plus className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {investments && investments.length === 0
                ? t("investments.noInvestmentsYet")
                : (language === "ar" ? "لا توجد استثمارات مطابقة" : "No matching investments")}
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {investments && investments.length === 0
                ? t("investments.noInvestmentsDesc")
                : (language === "ar"
                  ? "جرب تغيير الفلاتر لرؤية المزيد من الاستثمارات"
                  : "Try changing the filters to see more investments")}
            </p>
            {investments && investments.length === 0 && (
              <Button onClick={handleAddNew} data-testid="button-add-first-investment">
                <Plus className="h-4 w-4 mr-2" />
                {t("investments.addFirstInvestment")}
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-2 sm:p-4">
            <div className="space-y-1">
              {filteredAndSortedInvestments.map((investment) => (
                <InvestmentRow
                  key={investment.id}
                  investment={investment}
                  cashflows={cashflows || []}
                  onEdit={() => handleEdit(investment)}
                  onCompletePayment={() => handleCompletePayment(investment)}
                  onDelete={() => handleDelete(investment)}
                  onAddPayment={handleAddPayment}
                  onRemovePayment={handleRemovePayment}
                  onMarkPaymentAsReceived={handleMarkPaymentAsReceived}
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
