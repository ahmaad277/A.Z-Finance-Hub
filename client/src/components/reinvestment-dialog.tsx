import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform } from "@shared/schema";

const reinvestmentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
});

type ReinvestmentFormData = z.infer<typeof reinvestmentSchema>;

interface ReinvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: InvestmentWithPlatform | null;
  availableCash: number;
}

export function ReinvestmentDialog({
  open,
  onOpenChange,
  investment,
  availableCash,
}: ReinvestmentDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const form = useForm<ReinvestmentFormData>({
    resolver: zodResolver(reinvestmentSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const createInvestmentMutation = useMutation({
    mutationFn: async (data: ReinvestmentFormData) => {
      if (!investment) throw new Error("No investment selected");

      const today = new Date();
      const oneYearFromNow = new Date(today);
      oneYearFromNow.setFullYear(today.getFullYear() + 1);

      return apiRequest("/api/investments", {
        method: "POST",
        body: JSON.stringify({
          platformId: investment.platform.id,
          name: `${investment.name} (Reinvestment ${today.toLocaleDateString()})`,
          amount: data.amount.toString(),
          startDate: today.toISOString(),
          endDate: oneYearFromNow.toISOString(),
          expectedIrr: investment.expectedIrr,
          status: "active",
          riskScore: investment.riskScore || 50,
          distributionFrequency: investment.distributionFrequency,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      toast({
        title: t("dialog.success") || "Success",
        description: "Investment created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: t("dialog.error"),
        description: error.message || t("dialog.createError"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ReinvestmentFormData) => {
    if (data.amount > availableCash) {
      toast({
        title: t("dialog.error"),
        description: `Insufficient funds. Available: ${availableCash.toFixed(2)} SAR`,
        variant: "destructive",
      });
      return;
    }
    createInvestmentMutation.mutate(data);
  };

  if (!investment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-reinvest">
        <DialogHeader>
          <DialogTitle>{t("reinvestment.reinvestIn")} {investment.name}</DialogTitle>
          <DialogDescription>
            {t("reinvestment.reinvestDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">{t("reinvestment.availableCash")}: </span>
                <span className="font-semibold">{availableCash.toFixed(2)} {t("common.sar")}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t("investments.expectedIrr")}: </span>
                <span className="font-semibold">{parseFloat(investment.expectedIrr).toFixed(2)}%</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("dialog.amountSAR")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={availableCash}
                      placeholder="0.00"
                      data-testid="input-reinvest-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-reinvest"
              >
                {t("dialog.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createInvestmentMutation.isPending}
                data-testid="button-confirm-reinvest"
              >
                {createInvestmentMutation.isPending ? t("dialog.saving") : t("reinvestment.confirmReinvest")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
