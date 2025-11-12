import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Filter, ArrowUpDown, Maximize2, Minimize2 } from "lucide-react";
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
import { InvestmentCompactRow } from "@/components/investment-compact-row";
import { InvestmentDialog } from "@/components/investment-dialog";
import { InvestmentDetailsDrawer } from "@/components/investment-details-drawer";
import { CompletePaymentDialog } from "@/components/complete-payment-dialog";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform } from "@shared/schema";
import { LateStatusDialog } from "@/components/late-status-dialog";

export default function Investments() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [lateStatusDialogOpen, setLateStatusDialogOpen] = useState(false);
  const [bulkCompleteDialogOpen, setBulkCompleteDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [deletingInvestment, setDeletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [addingPaymentForInvestment, setAddingPaymentForInvestment] = useState<string | null>(null);
  const [pendingCashflowId, setPendingCashflowId] = useState<string | null>(null);
  const [pendingCashflowInvestment, setPendingCashflowInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [bulkCompletingInvestment, setBulkCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);

  // Filter and Sort States
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [compactView, setCompactView] = useState<boolean>(true); // Default to compact view
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
    refetchOnMount: true, // Always refetch on mount to ensure fresh data
  });

  const { data: cashflows, isLoading: cashflowsLoading } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Mutation to mark cashflow as received (with late status management)
  const updateCashflowMutation = useMutation({
    mutationFn: async ({ 
      cashflowId, 
      status,
      clearLateStatus,
      updateLateInfo,
    }: { 
      cashflowId: string; 
      status: string;
      clearLateStatus?: boolean;
      updateLateInfo?: { lateDays: number };
    }) => {
      return apiRequest("PATCH", `/api/cashflows/${cashflowId}`, { 
        status,
        receivedDate: status === "received" ? new Date().toISOString() : null,
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      // Close late status dialog if open
      setLateStatusDialogOpen(false);
      
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

  // Mutation to add new cashflow
  const addCashflowMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("POST", "/api/cashflows", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      
      toast({
        title: language === "ar" ? "تمت الإضافة" : "Added",
        description: language === "ar" ? "تمت إضافة الدفعة بنجاح" : "Payment added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل إضافة الدفعة" : "Failed to add payment"),
        variant: "destructive",
      });
    },
  });


  // Mutation to delete cashflow
  const deleteCashflowMutation = useMutation({
    mutationFn: async (cashflowId: string) => {
      return apiRequest("DELETE", `/api/cashflows/${cashflowId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      toast({
        title: language === "ar" ? "تم الحذف" : "Deleted",
        description: language === "ar" ? "تم حذف الدفعة بنجاح" : "Payment deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل حذف الدفعة" : "Failed to delete payment"),
        variant: "destructive",
      });
    },
  });

  // Mutation to complete all pending payments for an investment
  const bulkCompleteMutation = useMutation({
    mutationFn: async ({ 
      investmentId, 
      clearLateStatus,
      updateLateInfo,
    }: { 
      investmentId: string; 
      clearLateStatus?: boolean;
      updateLateInfo?: { lateDays: number };
    }) => {
      return apiRequest("POST", `/api/investments/${investmentId}/complete-all-payments`, { 
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
      setBulkCompleteDialogOpen(false);
      setBulkCompletingInvestment(null);
      
      toast({
        title: language === "ar" ? "تم التحديث" : "Updated",
        description: language === "ar" ? "تم تأكيد استلام جميع الدفعات بنجاح" : "All pending payments marked as received successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل تأكيد الدفعات" : "Failed to complete payments"),
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
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      
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
    // Find the cashflow to get its investment
    const cashflow = cashflows?.find(cf => cf.id === cashflowId);
    if (!cashflow) {
      updateCashflowMutation.mutate({ cashflowId, status: "received" });
      return;
    }
    
    // Find the investment
    const investment = investments?.find(inv => inv.id === cashflow.investmentId);
    
    // If investment is late or defaulted, show late status dialog
    if (investment && (investment.status === "late" || investment.status === "defaulted")) {
      setPendingCashflowId(cashflowId);
      setPendingCashflowInvestment(investment);
      setLateStatusDialogOpen(true);
    } else {
      // Normal flow - just mark as received
      updateCashflowMutation.mutate({ cashflowId, status: "received" });
    }
  };
  
  // Handler for late status dialog confirmation
  const handleLateStatusConfirm = (data: {
    cashflowId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => {
    updateCashflowMutation.mutate({
      cashflowId: data.cashflowId,
      status: "received",
      clearLateStatus: data.clearLateStatus,
      updateLateInfo: data.updateLateInfo,
    });
  };

  // Handler for bulk completion (complete all pending payments)
  const handleBulkCompleteAllPayments = (investment: InvestmentWithPlatform) => {
    setBulkCompletingInvestment(investment);
    setBulkCompleteDialogOpen(true);
  };

  // Handler for bulk complete dialog confirmation
  const handleBulkCompleteConfirm = (data: {
    investmentId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => {
    bulkCompleteMutation.mutate({
      investmentId: data.investmentId,
      clearLateStatus: data.clearLateStatus,
      updateLateInfo: data.updateLateInfo,
    });
  };
  
  const handleAddPayment = (investmentId: string) => {
    setAddingPaymentForInvestment(investmentId);
    setAddPaymentDialogOpen(true);
  };
  
  const handleRemovePayment = (cashflowId: string) => {
    deleteCashflowMutation.mutate(cashflowId);
  };

  const handleSubmitNewPayment = (data: any) => {
    addCashflowMutation.mutate({
      investmentId: data.investmentId,
      dueDate: data.dueDate.toISOString(),
      amount: data.amount,
      type: data.type,
      status: data.status,
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
          return parseFloat(b.faceValue) - parseFloat(a.faceValue);
        case "amount-asc":
          return parseFloat(a.faceValue) - parseFloat(b.faceValue);
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
      {/* Blue Header Area with Title and Buttons */}
      <div className="bg-primary/10 rounded-lg px-4 py-3 flex flex-row items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-shrink min-w-0">{t("investments.title")}</h1>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setCompactView(!compactView)}
            data-testid="button-toggle-view"
            variant="outline"
            className="gap-2 flex-shrink-0 h-9"
            size="sm"
          >
            {compactView ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
            <span className="hidden md:inline">{compactView ? t("common.expand") : t("common.compact")}</span>
          </Button>
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
      ) : compactView ? (
        <Card>
          <CardContent className="p-0">
            {/* Compact View - Ultra-Dense 40px Rows */}
            {filteredAndSortedInvestments.map((investment) => {
              const investmentCashflows = (cashflows || []).filter(cf => cf.investmentId === investment.id);
              const paymentsReceived = investmentCashflows.filter(cf => cf.status === "received").length;
              const totalPayments = investmentCashflows.length;

              return (
                <InvestmentCompactRow
                  key={investment.id}
                  investment={investment}
                  paymentsReceived={paymentsReceived}
                  totalPayments={totalPayments}
                  onClick={() => setSelectedInvestment(investment)}
                />
              );
            })}
          </CardContent>
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

      <AddPaymentDialog
        open={addPaymentDialogOpen}
        onOpenChange={setAddPaymentDialogOpen}
        investmentId={addingPaymentForInvestment || ""}
        onSubmit={handleSubmitNewPayment}
        isPending={addCashflowMutation.isPending}
      />

      <LateStatusDialog
        mode="single"
        open={lateStatusDialogOpen}
        onOpenChange={setLateStatusDialogOpen}
        investment={pendingCashflowInvestment}
        cashflowId={pendingCashflowId}
        onConfirm={handleLateStatusConfirm}
        isPending={updateCashflowMutation.isPending}
      />

      <LateStatusDialog
        mode="bulk"
        open={bulkCompleteDialogOpen}
        onOpenChange={setBulkCompleteDialogOpen}
        investment={bulkCompletingInvestment}
        pendingCount={
          bulkCompletingInvestment 
            ? (cashflows || []).filter(cf => cf.investmentId === bulkCompletingInvestment.id && cf.status === "upcoming").length 
            : 0
        }
        totalAmount={
          bulkCompletingInvestment 
            ? (cashflows || [])
                .filter(cf => cf.investmentId === bulkCompletingInvestment.id && cf.status === "upcoming")
                .reduce((sum, cf) => sum + parseFloat(cf.amount || "0"), 0)
            : 0
        }
        onConfirm={handleBulkCompleteConfirm}
        isPending={bulkCompleteMutation.isPending}
      />

      <InvestmentDetailsDrawer
        open={!!selectedInvestment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvestment(null);
          } else if (selectedInvestment) {
            // Debug logging when drawer opens
            const investmentCashflows = (cashflows || []).filter(cf => cf.investmentId === selectedInvestment.id);
            const pendingCount = investmentCashflows.filter(cf => cf.status === "upcoming").length;
            console.log('[Investments] Opening drawer:', {
              investmentId: selectedInvestment.id,
              investmentName: selectedInvestment.name,
              totalCashflows: (cashflows || []).length,
              investmentCashflows: investmentCashflows.length,
              pendingCount,
              cashflowsStatuses: investmentCashflows.map(cf => ({ id: cf.id, status: cf.status })),
            });
          }
        }}
        investment={selectedInvestment}
        cashflows={cashflows || []}
        onEdit={() => selectedInvestment && handleEdit(selectedInvestment)}
        onDelete={() => selectedInvestment && handleDelete(selectedInvestment)}
        onCompletePayment={() => selectedInvestment && handleCompletePayment(selectedInvestment)}
        onCompleteAllPayments={() => selectedInvestment && handleBulkCompleteAllPayments(selectedInvestment)}
        onAddPayment={handleAddPayment}
        onRemovePayment={handleRemovePayment}
        onMarkPaymentAsReceived={handleMarkPaymentAsReceived}
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
