import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/lib/language-provider";
import { AlertCircle, CheckCircle } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";

const lateStatusSchema = z.object({
  clearLateStatus: z.enum(["clear", "keep", "custom"]),
  customLateDays: z.coerce.number().int().min(1).optional(),
}).superRefine((data, ctx) => {
  // If "custom" is selected, customLateDays is required
  if (data.clearLateStatus === "custom" && !data.customLateDays) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please enter the number of late days",
      path: ["customLateDays"],
    });
  }
});

type LateStatusFormData = z.infer<typeof lateStatusSchema>;

interface LateStatusDialogProps {
  investment: InvestmentWithPlatform | null;
  cashflowId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: {
    cashflowId: string;
    clearLateStatus?: boolean;
    updateLateInfo?: { lateDays: number };
  }) => void;
  isPending: boolean;
}

export function LateStatusDialog({
  investment,
  cashflowId,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: LateStatusDialogProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  
  const form = useForm<LateStatusFormData>({
    resolver: zodResolver(lateStatusSchema),
    defaultValues: {
      clearLateStatus: "clear",
      customLateDays: undefined,
    },
  });

  const clearLateStatusValue = form.watch("clearLateStatus");
  
  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({
        clearLateStatus: "clear",
        customLateDays: undefined,
      });
    }
  }, [open, form]);

  const onSubmit = (data: LateStatusFormData) => {
    if (!cashflowId) return;

    const payload: {
      cashflowId: string;
      clearLateStatus?: boolean;
      updateLateInfo?: { lateDays: number };
    } = {
      cashflowId,
    };

    if (data.clearLateStatus === "clear") {
      payload.clearLateStatus = true;
    } else if (data.clearLateStatus === "custom" && data.customLateDays) {
      payload.updateLateInfo = {
        lateDays: data.customLateDays,
      };
    }
    // If "keep", don't send any additional parameters

    onConfirm(payload);
  };

  // Calculate current late days
  const calculateLateDays = () => {
    if (!investment || !investment.lateDate) return 0;
    const now = new Date();
    const lateDate = new Date(investment.lateDate);
    return Math.floor((now.getTime() - lateDate.getTime()) / (1000 * 60 * 60 * 24));
  };

  const currentLateDays = calculateLateDays();
  const isDefaulted = investment?.status === "defaulted";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir={isRtl ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isDefaulted ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            {language === "ar" ? "إدارة حالة التأخير" : "Late Status Management"}
          </DialogTitle>
          <DialogDescription>
            {language === "ar" 
              ? `هذا الاستثمار حالياً ${isDefaulted ? "متعثر" : "متأخر"} (${currentLateDays} يوم). اختر كيف تريد التعامل مع حالة التأخير عند تأكيد السداد.`
              : `This investment is currently ${isDefaulted ? "defaulted" : "late"} (${currentLateDays} days). Choose how to handle the late status when confirming payment.`
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="clearLateStatus"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>
                    {language === "ar" ? "إدارة حالة التأخير" : "Late Status Management"}
                  </FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-3"
                    >
                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="clear" id="clear" data-testid="radio-clear-late-status" />
                        <div className="flex-1">
                          <Label
                            htmlFor="clear"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-chart-2" />
                              {language === "ar" ? "إزالة وسم التأخير" : "Clear late status"}
                            </div>
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "ar" 
                              ? "سيتم إزالة وسم التأخير/التعثر وإعادة حساب حالة الاستثمار تلقائياً"
                              : "Late/defaulted status will be cleared and investment status will be recalculated automatically"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="keep" id="keep" data-testid="radio-keep-late-status" />
                        <div className="flex-1">
                          <Label
                            htmlFor="keep"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {language === "ar" ? "الإبقاء على الوسم كما هو" : "Keep status as is"}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {language === "ar" 
                              ? "لن يتم تغيير حالة التأخير/التعثر"
                              : "Late/defaulted status will remain unchanged"
                            }
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 space-x-reverse">
                        <RadioGroupItem value="custom" id="custom" data-testid="radio-custom-late-days" />
                        <div className="flex-1">
                          <Label
                            htmlFor="custom"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {language === "ar" ? "تعديل عدد أيام التأخير" : "Update late days"}
                          </Label>
                          <p className="text-xs text-muted-foreground mt-1 mb-2">
                            {language === "ar" 
                              ? "تحديد عدد أيام التأخير يدوياً"
                              : "Manually set the number of late days"
                            }
                          </p>
                          
                          {clearLateStatusValue === "custom" && (
                            <FormField
                              control={form.control}
                              name="customLateDays"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      min="1"
                                      placeholder={language === "ar" ? "عدد الأيام" : "Number of days"}
                                      {...field}
                                      data-testid="input-custom-late-days"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                data-testid="button-cancel-late-status"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isPending || (clearLateStatusValue === "custom" && !form.watch("customLateDays"))}
                data-testid="button-confirm-payment"
              >
                {isPending ? (
                  language === "ar" ? "جاري التأكيد..." : "Confirming..."
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {language === "ar" ? "تأكيد السداد" : "Confirm Payment"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
