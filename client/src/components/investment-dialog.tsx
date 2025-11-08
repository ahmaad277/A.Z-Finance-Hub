import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { insertInvestmentSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, Platform } from "@shared/schema";

const formSchema = insertInvestmentSchema.extend({
  platformId: z.string().min(1, "Platform is required"),
  startDate: z.string(),
  endDate: z.string(),
  actualEndDate: z.string().optional(),
});

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentWithPlatform | null;
}

export function InvestmentDialog({ open, onOpenChange, investment }: InvestmentDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const [userEditedProfit, setUserEditedProfit] = useState(false);
  const isResettingRef = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformId: "",
      name: "",
      amount: 0,
      faceValue: 0,
      totalExpectedProfit: 0,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      expectedIrr: 0,
      status: "active",
      riskScore: 50,
      distributionFrequency: "quarterly",
      profitPaymentStructure: "periodic",
      fundedFromCash: 0,
      isReinvestment: 0,
    },
  });

  useEffect(() => {
    isResettingRef.current = true;
    setUserEditedProfit(false);
    
    if (investment) {
      form.reset({
        platformId: investment.platformId,
        name: investment.name,
        amount: parseFloat(investment.amount),
        faceValue: parseFloat(investment.faceValue),
        totalExpectedProfit: parseFloat(investment.totalExpectedProfit),
        startDate: new Date(investment.startDate).toISOString().split("T")[0],
        endDate: new Date(investment.endDate).toISOString().split("T")[0],
        actualEndDate: investment.actualEndDate 
          ? new Date(investment.actualEndDate).toISOString().split("T")[0]
          : undefined,
        expectedIrr: parseFloat(investment.expectedIrr),
        status: investment.status,
        riskScore: investment.riskScore || 50,
        distributionFrequency: investment.distributionFrequency as "monthly" | "quarterly" | "semi_annually" | "annually" | "at_maturity",
        profitPaymentStructure: (investment.profitPaymentStructure || "periodic") as "periodic" | "at_maturity",
        fundedFromCash: investment.fundedFromCash,
        isReinvestment: investment.isReinvestment,
      });
      setUserEditedProfit(true);
    } else {
      form.reset({
        platformId: "",
        name: "",
        amount: 0,
        faceValue: 0,
        totalExpectedProfit: 0,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        expectedIrr: 0,
        status: "active",
        riskScore: 50,
        distributionFrequency: "quarterly",
        profitPaymentStructure: "periodic",
        fundedFromCash: 0,
        isReinvestment: 0,
      });
    }
    
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [investment, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: t("dialog.save"),
        description: t("dialog.add"),
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("dialog.createError"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("PATCH", `/api/investments/${investment?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      toast({
        title: t("dialog.save"),
        description: t("dialog.update"),
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("dialog.updateError"),
        variant: "destructive",
      });
    },
  });

  // Watch form values for calculations
  const formValues = form.watch();

  // Calculate suggested totalExpectedProfit from IRR
  const suggestedProfit = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const expectedIrr = formValues.expectedIrr || 0;
    const startDate = formValues.startDate;
    const endDate = formValues.endDate;

    if (!faceValue || !expectedIrr || !startDate || !endDate) {
      return 0;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365.25);

    if (durationYears <= 0) {
      return 0;
    }

    return faceValue * (expectedIrr / 100) * durationYears;
  }, [formValues.faceValue, formValues.expectedIrr, formValues.startDate, formValues.endDate]);

  // Auto-fill totalExpectedProfit when inputs change (if user hasn't manually edited it)
  useEffect(() => {
    if (isResettingRef.current) return;
    
    if (!userEditedProfit && suggestedProfit > 0) {
      form.setValue("totalExpectedProfit", Math.round(suggestedProfit * 100) / 100);
    }
  }, [suggestedProfit, userEditedProfit]);

  // Calculate investment metrics based on form values
  const calculatedMetrics = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const totalExpectedProfit = formValues.totalExpectedProfit || 0;
    const startDate = formValues.startDate;
    const endDate = formValues.endDate;
    const frequency = formValues.distributionFrequency;
    const profitStructure = formValues.profitPaymentStructure;

    if (!faceValue || !startDate || !endDate) {
      return null;
    }

    // Calculate duration in years
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationMs = end.getTime() - start.getTime();
    const durationYears = durationMs / (1000 * 60 * 60 * 24 * 365.25);

    if (durationYears <= 0) {
      return null;
    }

    // Calculate number of payments based on frequency and profit structure
    let paymentCount = 0;
    let paymentsPerYear = 0;

    if (profitStructure === "at_maturity" || frequency === "at_maturity") {
      paymentCount = 1; // All profits paid at maturity
    } else {
      // Calculate based on frequency
      if (frequency === "monthly") paymentsPerYear = 12;
      else if (frequency === "quarterly") paymentsPerYear = 4;
      else if (frequency === "semi_annually") paymentsPerYear = 2;
      else if (frequency === "annually") paymentsPerYear = 1;
      
      paymentCount = Math.ceil(durationYears * paymentsPerYear);
    }

    // Calculate payment value per installment
    const paymentValue = paymentCount > 0 ? totalExpectedProfit / paymentCount : 0;

    // Number of units (assuming 1 SAR = 1 unit for simplicity)
    const numberOfUnits = faceValue;

    return {
      totalExpectedReturn: totalExpectedProfit,
      numberOfUnits,
      paymentCount,
      paymentValue,
    };
  }, [formValues.faceValue, formValues.totalExpectedProfit, formValues.startDate, formValues.endDate, formValues.distributionFrequency, formValues.profitPaymentStructure]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Send date strings directly - server will convert to Date objects
    if (investment) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{investment ? t("dialog.editInvestment") : t("dialog.addInvestment")}</DialogTitle>
          <DialogDescription>
            {investment
              ? t("dialog.editInvestmentDesc")
              : t("dialog.addInvestmentDesc")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.platform")}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-platform">
                        <SelectValue placeholder={t("dialog.selectPlatform")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {platforms?.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.investmentName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("dialog.investmentNamePlaceholder")} {...field} data-testid="input-investment-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.amountSAR")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input type="number" placeholder="100000" {...field} data-testid="input-amount" />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={() => {
                          const currentAmount = Number(field.value) || 0;
                          field.onChange(currentAmount + 1000);
                        }}
                        data-testid="button-add-1000"
                        className="whitespace-nowrap"
                      >
                        +1000
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expectedIrr"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.expectedIRR")}</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="12.5" {...field} data-testid="input-irr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="faceValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'ar' ? 'القيمة الاسمية' : 'Face Value'}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="100000" {...field} data-testid="input-face-value" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="totalExpectedProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'ar' ? 'إجمالي الأرباح المتوقعة' : 'Total Expected Profit'}
                      {suggestedProfit > 0 && (
                        <span className="text-sm font-normal text-muted-foreground ml-2">
                          ({language === 'ar' ? 'مقترح' : 'Suggested'}: {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          }).format(suggestedProfit)})
                        </span>
                      )}
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="12500" 
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          if (!isResettingRef.current) {
                            setUserEditedProfit(true);
                          }
                        }}
                        data-testid="input-total-expected-profit" 
                      />
                    </FormControl>
                    {suggestedProfit > 0 && !userEditedProfit && (
                      <FormDescription>
                        {language === 'ar' 
                          ? 'محسوب تلقائيًا من معدل العائد الداخلي. يمكنك التعديل يدويًا.' 
                          : 'Auto-calculated from IRR. You can edit manually.'}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("investments.startDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-start-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.expectedEndDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Actual End Date - Only for Completed Investments */}
            {form.watch("status") === "completed" && (
              <FormField
                control={form.control}
                name="actualEndDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.actualEndDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ""} data-testid="input-actual-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="distributionFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("dialog.distributionFrequency")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-frequency">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">
                          {language === 'ar' ? 'شهري' : 'Monthly'}
                        </SelectItem>
                        <SelectItem value="quarterly">{t("dialog.quarterly")}</SelectItem>
                        <SelectItem value="semi_annually">{t("dialog.semiAnnual")}</SelectItem>
                        <SelectItem value="annually">{t("dialog.annual")}</SelectItem>
                        <SelectItem value="at_maturity">
                          {language === 'ar' ? 'عند الاستحقاق' : 'At Maturity'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="profitPaymentStructure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'ar' ? 'هيكل دفع الأرباح' : 'Profit Payment Structure'}
                    </FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-profit-structure">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="periodic">
                          {language === 'ar' ? 'أرباح دورية (Periodic Profits)' : 'Periodic Profits'}
                        </SelectItem>
                        <SelectItem value="at_maturity">
                          {language === 'ar' ? 'أرباح عند الاستحقاق (Profits at Maturity)' : 'Profits at Maturity'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("investments.status")}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">{t("investments.active")}</SelectItem>
                        <SelectItem value="pending">{t("investments.pending")}</SelectItem>
                        <SelectItem value="completed">{t("investments.completed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="riskScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("investments.riskScore")} (0-100)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="100" 
                      value={field.value ?? 50}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      onBlur={field.onBlur}
                      name={field.name}
                      data-testid="input-risk-score"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Calculated Investment Details */}
            {calculatedMetrics && (
              <Card className="bg-muted/50" data-testid="card-calculated-fields">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("dialog.calculatedFields")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t("dialog.totalExpectedReturn")}</p>
                      <p className="text-lg font-semibold" data-testid="text-total-return">
                        {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { 
                          style: 'currency', 
                          currency: 'SAR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(calculatedMetrics.totalExpectedReturn)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t("dialog.numberOfUnits")}</p>
                      <p className="text-lg font-semibold" data-testid="text-number-units">
                        {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(calculatedMetrics.numberOfUnits)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t("dialog.paymentCount")}</p>
                      <p className="text-lg font-semibold" data-testid="text-payment-count">
                        {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(calculatedMetrics.paymentCount)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">{t("dialog.paymentValue")}</p>
                      <p className="text-lg font-semibold" data-testid="text-payment-value">
                        {new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', { 
                          style: 'currency', 
                          currency: 'SAR',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(calculatedMetrics.paymentValue)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                {t("dialog.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-save-investment"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t("dialog.saving")
                  : investment
                  ? t("dialog.update")
                  : t("dialog.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
