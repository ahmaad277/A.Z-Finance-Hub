import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { InvestmentDialog } from "@/components/investment-dialog";
import { InvestmentRow } from "@/components/investment-row";
import { InvestmentDetailsDrawer } from "@/components/investment-details-drawer";
import { CompletePaymentDialog } from "@/components/complete-payment-dialog";
import { AddPaymentDialog } from "@/components/add-payment-dialog";
import { LateStatusDialog } from "@/components/late-status-dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform } from "@shared/schema";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { SplashScreen } from "@/components/SplashScreen";

// Helper function to make API requests with data-entry token
async function apiRequestWithToken(
  method: string,
  url: string,
  token: string,
  data?: unknown
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Data-Entry-Token": token,
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }

  return res;
}

// Create a custom query function that includes the token
function createDataEntryQueryFn(token: string) {
  return async ({ queryKey }: { queryKey: readonly unknown[] }) => {
    const res = await fetch(queryKey.join("/") as string, {
      headers: {
        "X-Data-Entry-Token": token,
      },
      credentials: "include",
    });

    if (!res.ok) {
      const text = (await res.text()) || res.statusText;
      throw new Error(`${res.status}: ${text}`);
    }

    return await res.json();
  };
}

export default function DataEntry() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const { toast } = useToast();
  const [, params] = useRoute("/data-entry/:token");
  const token = params?.token;

  const [showSplash, setShowSplash] = useState(true);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [completePaymentDialogOpen, setCompletePaymentDialogOpen] = useState(false);
  const [addPaymentDialogOpen, setAddPaymentDialogOpen] = useState(false);
  const [lateStatusDialogOpen, setLateStatusDialogOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [completingInvestment, setCompletingInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [addingPaymentForInvestment, setAddingPaymentForInvestment] = useState<string | null>(null);
  const [pendingCashflowId, setPendingCashflowId] = useState<string | null>(null);
  const [pendingCashflowInvestment, setPendingCashflowInvestment] = useState<InvestmentWithPlatform | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithPlatform | null>(null);

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsVerified(false);
        return;
      }

      try {
        const response = await fetch(`/api/verify-data-entry-token/${token}`);
        const data = await response.json();
        setIsVerified(data.valid === true);
      } catch (error) {
        setIsVerified(false);
      }
    };

    verifyToken();
  }, [token]);

  const { data: investments, isLoading: investmentsLoading } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    refetchOnMount: true,
    enabled: isVerified === true && !!token,
  });

  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    enabled: isVerified === true && !!token,
  });

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    queryFn: token ? createDataEntryQueryFn(token) : undefined,
    enabled: isVerified === true && !!token,
  });

  // Mutation to mark cashflow as received
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
      if (!token) throw new Error("No token available");
      return apiRequestWithToken("PATCH", `/api/cashflows/${cashflowId}`, token, { 
        status,
        receivedDate: status === "received" ? new Date().toISOString() : null,
        clearLateStatus,
        updateLateInfo,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
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
      if (!token) throw new Error("No token available");
      return apiRequestWithToken("POST", "/api/cashflows", token, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      
      toast({
        title: language === "ar" ? "تمت الإضافة" : "Added",
        description: language === "ar" ? "تمت إضافة الدفعة بنجاح" : "Payment added successfully",
      });
      setAddPaymentDialogOpen(false);
      setAddingPaymentForInvestment(null);
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشلت إضافة الدفعة" : "Failed to add payment"),
        variant: "destructive",
      });
    },
  });

  if (isVerified === null) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-spinner" />
      </div>
    );
  }

  if (isVerified === false) {
    return (
      <div className="flex h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">
              {language === "ar" ? "رابط غير صالح" : "Invalid Link"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {language === "ar" 
                ? "الرابط الذي استخدمته غير صالح أو منتهي الصلاحية. يرجى التواصل مع المسؤول للحصول على رابط جديد."
                : "The link you used is invalid or expired. Please contact the administrator for a new link."
              }
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden" dir={isRtl ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b px-4 py-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold" data-testid="text-page-title">
            {language === "ar" ? "مرحباً في A.Z Finance Hub" : "Welcome to A.Z Finance Hub"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ar" ? "إدارة الاستثمارات" : "Investment Management"}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 space-y-4">
          {/* Info Alert */}
          <Alert>
            <AlertDescription>
              {language === "ar"
                ? "يمكنك إضافة وتعديل وحذف الاستثمارات من هذه الصفحة. لا يمكنك الوصول إلى أي معلومات مالية أخرى."
                : "You can add, edit, and delete investments from this page. You cannot access any other financial information."
              }
            </AlertDescription>
          </Alert>

          {/* Add Investment Button */}
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingInvestment(null);
                setDialogOpen(true);
              }}
              data-testid="button-add-investment"
            >
              <Plus className="h-4 w-4" />
              {language === "ar" ? "إضافة استثمار" : "Add Investment"}
            </Button>
          </div>

          {/* Investments List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {language === "ar" ? "الاستثمارات" : "Investments"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {investmentsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : !investments || investments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {language === "ar" ? "لا توجد استثمارات" : "No investments"}
                </div>
              ) : (
                <div className="space-y-2">
                  {investments.map((investment) => (
                    <InvestmentRow
                      key={investment.id}
                      investment={investment}
                      cashflows={cashflows?.filter((cf) => cf.investmentId === investment.id) || []}
                      onEdit={() => {
                        setEditingInvestment(investment);
                        setDialogOpen(true);
                      }}
                      onDelete={() => {
                        if (confirm(language === "ar" ? "هل أنت متأكد من حذف هذا الاستثمار؟" : "Are you sure you want to delete this investment?")) {
                          fetch(`/api/investments/${investment.id}`, {
                            method: "DELETE",
                            headers: {
                              "X-Data-Entry-Token": token || "",
                            },
                            credentials: "include",
                          }).then(() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
                            toast({
                              title: language === "ar" ? "تم الحذف" : "Deleted",
                              description: language === "ar" ? "تم حذف الاستثمار بنجاح" : "Investment deleted successfully",
                            });
                          });
                        }
                      }}
                      onCompletePayment={() => {
                        setCompletingInvestment(investment);
                        setCompletePaymentDialogOpen(true);
                      }}
                      onAddPayment={(invId: string) => {
                        setAddingPaymentForInvestment(invId);
                        setAddPaymentDialogOpen(true);
                      }}
                      onMarkPaymentAsReceived={(cashflowId: string) => {
                        setPendingCashflowId(cashflowId);
                        setPendingCashflowInvestment(investment);
                        
                        // Check if investment is in late status
                        if (investment.status === 'late') {
                          setLateStatusDialogOpen(true);
                        } else {
                          updateCashflowMutation.mutate({ cashflowId, status: "received" });
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Dialogs */}
      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        investment={editingInvestment}
        dataEntryToken={token}
      />

      <InvestmentDetailsDrawer
        investment={selectedInvestment}
        open={!!selectedInvestment}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedInvestment(null);
          }
        }}
        cashflows={cashflows?.filter((cf) => cf.investmentId === selectedInvestment?.id) || []}
        onEdit={() => {
          if (selectedInvestment) {
            setEditingInvestment(selectedInvestment);
            setDialogOpen(true);
            setSelectedInvestment(null);
          }
        }}
        onCompletePayment={() => {
          if (selectedInvestment) {
            setCompletingInvestment(selectedInvestment);
            setCompletePaymentDialogOpen(true);
            setSelectedInvestment(null);
          }
        }}
        onAddPayment={(invId: string) => {
          setAddingPaymentForInvestment(invId);
          setAddPaymentDialogOpen(true);
          setSelectedInvestment(null);
        }}
        onMarkPaymentAsReceived={(cashflowId: string) => {
          if (selectedInvestment) {
            setPendingCashflowId(cashflowId);
            setPendingCashflowInvestment(selectedInvestment);
            
            if (selectedInvestment.status === 'late') {
              setLateStatusDialogOpen(true);
            } else {
              updateCashflowMutation.mutate({ cashflowId, status: "received" });
            }
          }
        }}
      />

      <CompletePaymentDialog
        open={completePaymentDialogOpen}
        onOpenChange={setCompletePaymentDialogOpen}
        investment={completingInvestment}
      />

      <AddPaymentDialog
        open={addPaymentDialogOpen}
        onOpenChange={(open) => {
          setAddPaymentDialogOpen(open);
          if (!open) setAddingPaymentForInvestment(null);
        }}
        investmentId={addingPaymentForInvestment || ""}
        onSubmit={(data: any) => addCashflowMutation.mutate(data)}
        isPending={addCashflowMutation.isPending}
      />

      <LateStatusDialog
        mode="single"
        open={lateStatusDialogOpen}
        onOpenChange={setLateStatusDialogOpen}
        investment={pendingCashflowInvestment}
        cashflowId={pendingCashflowId}
        isPending={updateCashflowMutation.isPending}
        onConfirm={(data) => {
          updateCashflowMutation.mutate({
            status: "received",
            ...data,
          });

          setPendingCashflowId(null);
          setPendingCashflowInvestment(null);
        }}
      />
      
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
    </div>
  );
}
