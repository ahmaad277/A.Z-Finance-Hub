import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ArabicNumberInput } from "@/components/ui/arabic-number-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { insertInvestmentSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, Platform } from "@shared/schema";
import { Wallet, AlertCircle, Calculator } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CustomCashflowEditor, type CustomCashflow } from "@/components/custom-cashflow-editor";
import { 
  calculateExpectedProfit, 
  calculateDurationMonths, 
  calculateEndDate 
} from "@shared/profit-calculator";

const formSchema = insertInvestmentSchema.extend({
  platformId: z.string().min(1, "Platform is required"),
  startDate: z.string(),
  endDate: z.string(),
  actualEndDate: z.string().optional(),
  durationMonths: z.number().int().nonnegative().optional(),
}).refine((data) => data.faceValue > 0, {
  message: "Face value must be greater than 0",
  path: ["faceValue"],
}).refine((data) => data.expectedIrr > 0, {
  message: "Annual Return must be greater than 0",
  path: ["expectedIrr"],
});

type DurationMode = 'months' | 'dates';

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentWithPlatform | null;
  dataEntryToken?: string | null;
}

export function InvestmentDialog({ open, onOpenChange, investment, dataEntryToken }: InvestmentDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
    refetchOnMount: true, // Ensure fresh platforms on dialog open
  });

  // Fetch cash balance for validation
  const { data: cashBalanceResponse } = useQuery<{ balance: number }>({
    queryKey: ["/api/cash/balance"],
  });
  const cashBalance = cashBalanceResponse?.balance ?? 0;

  const [userEditedProfit, setUserEditedProfit] = useState(false);
  const [durationMode, setDurationMode] = useState<DurationMode>('dates');
  const [durationMonthsInput, setDurationMonthsInput] = useState<number>(0);
  const isResettingRef = useRef(false);
  const [customCashflows, setCustomCashflows] = useState<CustomCashflow[]>([]);

  // Get last used platform from localStorage
  const getLastPlatformId = () => {
    try {
      return localStorage.getItem('lastSelectedPlatformId') || "";
    } catch {
      return "";
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformId: "",
      name: "",
      faceValue: undefined,
      totalExpectedProfit: undefined,
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      durationMonths: 0,
      expectedIrr: undefined,
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
      const startDate = new Date(investment.startDate);
      const endDate = new Date(investment.endDate);
      const months = calculateDurationMonths(startDate, endDate);
      setDurationMonthsInput(months);
      
      const faceValue = parseFloat(investment.faceValue);
      const totalProfit = parseFloat(investment.totalExpectedProfit);
      const irr = parseFloat(investment.expectedIrr);
      
      form.reset({
        platformId: investment.platformId,
        name: investment.name,
        faceValue,
        totalExpectedProfit: totalProfit,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        durationMonths: months,
        actualEndDate: investment.actualEndDate 
          ? new Date(investment.actualEndDate).toISOString().split("T")[0]
          : undefined,
        expectedIrr: irr,
        status: investment.status as "active" | "late" | "defaulted" | "completed" | "pending",
        riskScore: investment.riskScore || 50,
        distributionFrequency: investment.distributionFrequency as "monthly" | "quarterly" | "semi_annually" | "annually" | "at_maturity" | "custom",
        profitPaymentStructure: (investment.profitPaymentStructure || "periodic") as "periodic" | "at_maturity",
        fundedFromCash: investment.fundedFromCash,
        isReinvestment: investment.isReinvestment,
      });
      
      setUserEditedProfit(true);
    } else {
      // For new investments, use last selected platform
      const lastPlatformId = getLastPlatformId();
      form.reset({
        platformId: lastPlatformId,
        name: "",
        faceValue: undefined,
        totalExpectedProfit: undefined,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        durationMonths: 0,
        expectedIrr: undefined,
        status: "active",
        riskScore: 50,
        distributionFrequency: "quarterly",
        profitPaymentStructure: "periodic",
        fundedFromCash: 0,
        isReinvestment: 0,
      });
      setDurationMonthsInput(0);
    }
    
    setTimeout(() => {
      isResettingRef.current = false;
    }, 0);
  }, [investment, form]);

  // Auto-derive profitPaymentStructure from distributionFrequency
  const distributionFrequency = useWatch({
    control: form.control,
    name: "distributionFrequency",
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    
    if (distributionFrequency) {
      const newStructure = distributionFrequency === 'at_maturity' 
        ? 'at_maturity' 
        : 'periodic';
      
      const currentStructure = form.getValues('profitPaymentStructure');
      
      if (currentStructure !== newStructure) {
        form.setValue('profitPaymentStructure', newStructure);
      }
    }
  }, [distributionFrequency, form]);

  // Auto-calculate risk score based on expected IRR
  const expectedIrr = useWatch({
    control: form.control,
    name: "expectedIrr",
  });

  useEffect(() => {
    if (isResettingRef.current) return;
    
    // Convert to number if string
    const irrValue = typeof expectedIrr === 'string' ? parseFloat(expectedIrr) : expectedIrr;
    
    // Check if we have a valid IRR value (treat 0 as empty/not set)
    const hasValidIrr = expectedIrr !== undefined && 
                        expectedIrr !== null && 
                        expectedIrr !== 0 &&
                        String(expectedIrr) !== "" && 
                        !isNaN(irrValue) &&
                        irrValue > 0;
    
    if (hasValidIrr) {
      // Calculate risk score: (expectedIrr / 30) * 100
      // 0% IRR = treated as empty, 30% IRR = 100 risk
      const calculatedRisk = Math.min(100, Math.max(0, (irrValue / 30) * 100));
      const roundedRisk = Math.round(calculatedRisk);
      
      const currentRiskScore = form.getValues('riskScore');
      
      if (currentRiskScore !== roundedRisk) {
        form.setValue('riskScore', roundedRisk);
      }
    } else {
      // Reset to default midpoint when IRR is empty/0/invalid
      const currentRiskScore = form.getValues('riskScore');
      if (currentRiskScore !== 50) {
        form.setValue('riskScore', 50);
      }
    }
  }, [expectedIrr, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      if (dataEntryToken) {
        const res = await fetch("/api/investments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Data-Entry-Token": dataEntryToken,
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to create investment");
        }
        return res.json();
      }
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.refetchQueries({ queryKey: ["/api/investments"], type: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });

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
      if (dataEntryToken) {
        const res = await fetch(`/api/investments/${investment?.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "X-Data-Entry-Token": dataEntryToken,
          },
          credentials: "include",
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || "Failed to update investment");
        }
        return res.json();
      }
      return apiRequest("PATCH", `/api/investments/${investment?.id}`, data);
    },
    onSuccess: () => {
      // Invalidate all dashboard-related queries for real-time updates
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.refetchQueries({ queryKey: ["/api/investments"], type: 'all' });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cashflows"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });

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

  // Calculate duration in months when in dates mode
  const calculatedDurationMonths = useMemo(() => {
    if (durationMode !== 'dates') return 0;
    
    const startDate = formValues.startDate;
    const endDate = formValues.endDate;
    
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return calculateDurationMonths(start, end);
  }, [formValues.startDate, formValues.endDate, durationMode]);

  // Update endDate when in months mode
  useEffect(() => {
    if (durationMode === 'months' && !isResettingRef.current) {
      const startDate = formValues.startDate;
      
      if (startDate && durationMonthsInput > 0) {
        const start = new Date(startDate);
        const calculatedEnd = calculateEndDate(start, durationMonthsInput);
        const endDateString = calculatedEnd.toISOString().split("T")[0];
        form.setValue("endDate", endDateString);
      }
    }
  }, [durationMode, durationMonthsInput, formValues.startDate]);

  // Calculate expected profit automatically (NET profit after fees)
  const autoCalculatedProfit = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const expectedIrr = formValues.expectedIrr || 0;
    const months = durationMode === 'dates' ? calculatedDurationMonths : durationMonthsInput;

    if (!faceValue || !expectedIrr || !months) {
      return 0;
    }

    // Calculate gross profit first
    const grossProfit = calculateExpectedProfit(faceValue, expectedIrr, months);
    
    // Deduct platform fees if applicable
    const selectedPlatform = platforms?.find(p => p.id === formValues.platformId);
    const feePercentage = Number(selectedPlatform?.feePercentage) || 0;
    const deductFees = selectedPlatform?.deductFees || 0;
    
    if (deductFees === 1 && feePercentage > 0) {
      const feeAmount = (grossProfit * feePercentage) / 100;
      return grossProfit - feeAmount; // Return NET profit
    }
    
    return grossProfit; // No fees, return gross profit
  }, [formValues.faceValue, formValues.expectedIrr, calculatedDurationMonths, durationMonthsInput, durationMode, formValues.platformId, platforms]);

  // Auto-fill totalExpectedProfit when inputs change (if user hasn't manually edited it)
  useEffect(() => {
    if (isResettingRef.current) return;
    
    if (!userEditedProfit && autoCalculatedProfit > 0) {
      form.setValue("totalExpectedProfit", autoCalculatedProfit);
    }
  }, [autoCalculatedProfit, userEditedProfit]);

  // Calculate ROI percentage
  const roiPercentage = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const totalExpectedProfit = formValues.totalExpectedProfit || 0;
    
    if (!faceValue) return 0;
    
    return (totalExpectedProfit / faceValue) * 100;
  }, [formValues.faceValue, formValues.totalExpectedProfit]);

  // Handle Calculate button click
  const handleCalculateProfit = () => {
    if (autoCalculatedProfit > 0) {
      form.setValue("totalExpectedProfit", autoCalculatedProfit);
      setUserEditedProfit(false);
      toast({
        title: language === 'ar' ? 'تم الحساب' : 'Calculated',
        description: language === 'ar' 
          ? `إجمالي الأرباح المتوقعة: ${autoCalculatedProfit.toFixed(2)} ريال` 
          : `Total Expected Profit: ${autoCalculatedProfit.toFixed(2)} SAR`,
      });
    }
  };

  // Calculate investment metrics based on form values
  // NOTE: totalExpectedProfit is now NET profit (after fee deduction)
  const calculatedMetrics = useMemo(() => {
    const faceValue = formValues.faceValue || 0;
    const netProfit = Number(formValues.totalExpectedProfit) || 0; // This is NET profit now
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

    // Calculate payment value per installment (based on NET profit)
    const paymentValue = paymentCount > 0 ? netProfit / paymentCount : 0;

    // Number of units (assuming 1 SAR = 1 unit for simplicity)
    const numberOfUnits = faceValue;

    // Calculate GROSS profit (reverse calculation) for display purposes
    const selectedPlatform = platforms?.find(p => p.id === formValues.platformId);
    const feePercentage = Number(selectedPlatform?.feePercentage) || 0;
    const deductFees = selectedPlatform?.deductFees || 0;

    let grossProfit = netProfit;
    let feeAmount = 0;

    if (deductFees === 1 && feePercentage > 0 && feePercentage < 100) {
      // Reverse calculation: netProfit = grossProfit × (1 - feePercentage/100)
      // So: grossProfit = netProfit / (1 - feePercentage/100)
      // Guard against division by zero when feePercentage >= 100
      grossProfit = netProfit / (1 - feePercentage / 100);
      feeAmount = grossProfit - netProfit;
    } else if (deductFees === 1 && feePercentage >= 100) {
      // If fee is 100% or more, all profit goes to fees
      grossProfit = netProfit; // Can't reverse calculate safely
      feeAmount = 0; // Already deducted
    }

    return {
      totalExpectedReturn: grossProfit, // Show gross profit in summary
      numberOfUnits,
      paymentCount,
      paymentValue,
      netProfit,
      feeAmount,
      feePercentage,
      deductFees,
    };
  }, [formValues.faceValue, formValues.totalExpectedProfit, formValues.startDate, formValues.endDate, formValues.distributionFrequency, formValues.profitPaymentStructure, formValues.platformId, platforms]);

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Set durationMonths based on mode
    if (durationMode === 'months') {
      data.durationMonths = durationMonthsInput;
    } else {
      data.durationMonths = calculatedDurationMonths;
    }
    
    // Validate cash balance if funding from cash
    if (data.fundedFromCash === 1 && data.faceValue > cashBalance) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'رصيدك النقدي غير كافٍ لهذا الاستثمار.' 
          : 'Insufficient cash balance for this investment.',
        variant: "destructive",
      });
      return;
    }

    // Include customDistributions if frequency is 'custom'
    const payload = {
      ...data,
      customDistributions: data.distributionFrequency === 'custom' ? customCashflows.map(cf => ({
        dueDate: new Date(cf.dueDate),
        amount: cf.amount,
        type: cf.type,
        notes: cf.notes,
      })) : undefined,
    };

    // Send date strings directly - server will convert to Date objects
    if (investment) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const displayDurationMonths = durationMode === 'dates' ? calculatedDurationMonths : durationMonthsInput;

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
          <form onSubmit={(e) => {
            form.handleSubmit(onSubmit)(e);
          }} className="space-y-3">
            <FormField
              control={form.control}
              name="platformId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.platform")}</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Save to localStorage for future use
                      try {
                        localStorage.setItem('lastSelectedPlatformId', value);
                      } catch (e) {
                        console.error('Failed to save platform selection:', e);
                      }
                    }} 
                    value={field.value}>
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

            <div className="grid gap-3 md:grid-cols-2">
              <FormField
                control={form.control}
                name="faceValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("dialog.faceValue")} ({t("dialog.faceValueDesc")})
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <ArabicNumberInput
                          placeholder="100000"
                          value={field.value ?? ''}
                          onValueChange={(values) => {
                            // Update RHF with numeric value
                            field.onChange(values.floatValue ?? undefined);
                          }}
                          data-testid="input-face-value"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={(e) => {
                          e.preventDefault();
                          const currentValue = field.value || 0;
                          const newValue = currentValue + 5000;
                          field.onChange(newValue);
                        }}
                        data-testid="button-add-5000"
                      >
                        +5K
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
                      <ArabicNumberInput
                        placeholder="12.5"
                        value={field.value ?? ''}
                        onValueChange={(values) => {
                          field.onChange(values.floatValue ?? undefined);
                        }}
                        data-testid="input-irr"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>{t("dialog.durationMode")}</FormLabel>
                <Tabs value={durationMode} onValueChange={(value) => setDurationMode(value as DurationMode)}>
                  <TabsList data-testid="tabs-duration-mode">
                    <TabsTrigger value="months" data-testid="tab-months">
                      {t("dialog.monthsMode")}
                    </TabsTrigger>
                    <TabsTrigger value="dates" data-testid="tab-dates">
                      {t("dialog.datesMode")}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {durationMode === 'months' ? (
                // Months Mode
                <div className="space-y-2">
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

                  <div>
                    <FormLabel>{t("dialog.durationMonths")}</FormLabel>
                    <Input 
                      type="number" 
                      placeholder={t("dialog.enterMonths")}
                      value={durationMonthsInput || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDurationMonthsInput(parseInt(value) || 0);
                      }}
                      data-testid="input-duration-months"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <FormLabel>{t("dialog.expectedEndDate")} ({t("dialog.calculatedAutomatically")})</FormLabel>
                    <div className="mt-2 p-3 bg-muted rounded-md">
                      <p className="text-sm">
                        {formValues.endDate ? formValues.endDate : (language === 'ar' ? 'لم يتم الحساب بعد' : 'Not calculated yet')}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                // Dates Mode
                <div className="space-y-2">
                  <div className="grid gap-3 md:grid-cols-2">
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

                  {calculatedDurationMonths > 0 && (
                    <div className="flex items-center gap-2">
                      <FormLabel>{t("dialog.durationMonths")}:</FormLabel>
                      <Badge variant="secondary" data-testid="badge-duration-months">
                        {calculatedDurationMonths} {t("dialog.months")}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Total Expected Profit with Calculate Button */}
            <div className="space-y-2">
              {(() => {
                const selectedPlatform = platforms?.find(p => p.id === formValues.platformId);
                const feePercentage = Number(selectedPlatform?.feePercentage) || 0;
                const deductFees = selectedPlatform?.deductFees || 0;
                const hasFees = deductFees === 1 && feePercentage > 0;
                
                return hasFees && (
                  <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <AlertDescription className="text-sm text-blue-800 dark:text-blue-300">
                      {language === 'ar' 
                        ? `ملاحظة: سيتم خصم رسوم المنصة (${feePercentage}%) تلقائياً من الأرباح المتوقعة` 
                        : `Note: Platform fees (${feePercentage}%) will be automatically deducted from expected profits`}
                    </AlertDescription>
                  </Alert>
                );
              })()}
              
              <FormField
                control={form.control}
                name="totalExpectedProfit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {language === 'ar' ? 'إجمالي الأرباح المتوقعة' : 'Total Expected Profit'}
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <ArabicNumberInput
                          placeholder="12500"
                          value={field.value ?? ''}
                          onValueChange={(values) => {
                            field.onChange(values.floatValue ?? undefined);
                            if (!isResettingRef.current) {
                              setUserEditedProfit(true);
                            }
                          }}
                          data-testid="input-total-expected-profit"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="default"
                        onClick={handleCalculateProfit}
                        data-testid="button-calculate-profit"
                        className="whitespace-nowrap"
                      >
                        <Calculator className="w-4 h-4 mr-2" />
                        {t("dialog.calculateProfit")}
                      </Button>
                    </div>
                    {roiPercentage > 0 && displayDurationMonths > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" data-testid="badge-roi">
                          {t("dialog.roi")}: {roiPercentage.toFixed(2)}% {t("dialog.over")} {displayDurationMonths} {t("dialog.months")}
                        </Badge>
                      </div>
                    )}
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

            <div className="grid gap-3 md:grid-cols-2">
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
                        <SelectItem value="monthly">شهري</SelectItem>
                        <SelectItem value="quarterly">ربع سنوي</SelectItem>
                        <SelectItem value="semi_annually">نصف سنوي</SelectItem>
                        <SelectItem value="annually">سنوي</SelectItem>
                        <SelectItem value="at_maturity">عند الاستحقاق</SelectItem>
                        <SelectItem value="custom">جدول مخصص</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Hidden field for profitPaymentStructure - auto-derived from distributionFrequency */}
              <FormField
                control={form.control}
                name="profitPaymentStructure"
                render={({ field }) => (
                  <FormItem className="hidden">
                    <FormControl>
                      <Input type="hidden" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* Custom Cashflow Editor - Show only when custom frequency selected */}
            {form.watch("distributionFrequency") === "custom" && (
              <div className="border rounded-lg p-4 bg-muted/10">
                <CustomCashflowEditor
                  cashflows={customCashflows}
                  onChange={setCustomCashflows}
                  startDate={form.watch("startDate")}
                  endDate={form.watch("endDate")}
                  expectedProfit={form.watch("totalExpectedProfit")}
                />
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
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
                        <SelectItem value="completed">{t("investments.completed")}</SelectItem>
                        <SelectItem value="late">{t("investments.late")}</SelectItem>
                        <SelectItem value="defaulted">{t("investments.defaulted")}</SelectItem>
                        <SelectItem value="pending">{t("investments.pending")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="riskScore"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("investments.riskScore")} ({language === 'ar' ? '0-100' : '0-100'})
                    </FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        placeholder="50" 
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            field.onChange(null);
                          } else if (value.endsWith('.') || value.endsWith('-') || value === '-') {
                            return;
                          } else {
                            const val = parseInt(value);
                            field.onChange(isNaN(val) ? null : val);
                          }
                        }}
                        data-testid="input-risk-score"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Auto-Complete Cashflows Alert */}
            {form.watch("status") === "completed" && (
              <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
                <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-300">
                  {language === 'ar' 
                    ? 'عند تحديد الحالة كـ "مكتمل"، سيتم تسجيل جميع التوزيعات المعلقة تلقائياً كمستلمة في تواريخها المجدولة.' 
                    : 'When marking as "Completed", all pending distributions will automatically be recorded as received on their scheduled dates.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Funding from Cash */}
            <FormField
              control={form.control}
              name="fundedFromCash"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value === 1}
                      onCheckedChange={(checked) => field.onChange(checked ? 1 : 0)}
                      data-testid="checkbox-funded-from-cash"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {language === 'ar' ? 'تمويل من الرصيد النقدي' : 'Fund from Cash Balance'}
                    </FormLabel>
                    <FormDescription>
                      <div className="flex items-center gap-2 mt-1">
                        <Wallet className="w-4 h-4" />
                        <span>
                          {language === 'ar' ? 'الرصيد المتاح' : 'Available'}: {new Intl.NumberFormat('en-US').format(cashBalance)} {t("common.sar")}
                        </span>
                      </div>
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Cash Balance Warning */}
            {form.watch("fundedFromCash") === 1 && form.watch("faceValue") > cashBalance && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {language === 'ar' 
                    ? 'رصيدك النقدي غير كافٍ لهذا الاستثمار.' 
                    : 'Insufficient cash balance for this investment.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Calculated Metrics Summary - Compact Layout */}
            {calculatedMetrics && (
              <Card>
                <CardContent className={`grid grid-cols-1 ${calculatedMetrics.deductFees === 1 && calculatedMetrics.feePercentage > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-3 pt-4`}>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("dialog.paymentCount")}</p>
                    <p className="text-base font-semibold" data-testid="text-calculated-payments">
                      {calculatedMetrics.paymentCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("dialog.paymentValue")}</p>
                    <p className="text-base font-semibold" data-testid="text-calculated-payment-value">
                      {new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(calculatedMetrics.paymentValue)} {t("common.sar")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("dialog.totalExpectedReturn")}</p>
                    <p className="text-base font-semibold" data-testid="text-calculated-total-return">
                      {new Intl.NumberFormat('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      }).format(calculatedMetrics.totalExpectedReturn)} {t("common.sar")}
                    </p>
                  </div>
                  {calculatedMetrics.deductFees === 1 && calculatedMetrics.feePercentage > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'صافي الربح بعد الرسوم' : 'Net Profit After Fees'}
                      </p>
                      <p className="text-base font-semibold text-primary" data-testid="text-calculated-net-profit">
                        {new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(calculatedMetrics.netProfit)} {t("common.sar")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'ar' ? `الرسوم (${calculatedMetrics.feePercentage}%): -` : `Fee (${calculatedMetrics.feePercentage}%): -`}
                        {new Intl.NumberFormat('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        }).format(calculatedMetrics.feeAmount)} {t("common.sar")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end gap-4 pt-4">
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
                data-testid="button-save"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? t("dialog.saving")
                  : investment
                  ? t("dialog.save")
                  : t("dialog.add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
