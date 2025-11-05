import { useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { insertInvestmentSchema } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { InvestmentWithPlatform, Platform } from "@shared/schema";

const formSchema = insertInvestmentSchema.extend({
  startDate: z.string(),
  endDate: z.string(),
});

interface InvestmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment?: InvestmentWithPlatform | null;
}

export function InvestmentDialog({ open, onOpenChange, investment }: InvestmentDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();

  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platformId: "",
      name: "",
      amount: "0",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      expectedIrr: "0",
      status: "active",
      riskScore: 50,
      distributionFrequency: "quarterly",
    },
  });

  useEffect(() => {
    if (investment) {
      form.reset({
        platformId: investment.platformId,
        name: investment.name,
        amount: investment.amount,
        startDate: new Date(investment.startDate).toISOString().split("T")[0],
        endDate: new Date(investment.endDate).toISOString().split("T")[0],
        expectedIrr: investment.expectedIrr,
        status: investment.status,
        riskScore: investment.riskScore || 50,
        distributionFrequency: investment.distributionFrequency,
      });
    } else {
      form.reset({
        platformId: "",
        name: "",
        amount: "0",
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        expectedIrr: "0",
        status: "active",
        riskScore: 50,
        distributionFrequency: "quarterly",
      });
    }
  }, [investment, form]);

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/investments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
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
                    <FormControl>
                      <Input type="number" placeholder="100000" {...field} data-testid="input-amount" />
                    </FormControl>
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
                    <FormLabel>{t("investments.endDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-end-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                        <SelectItem value="quarterly">{t("dialog.quarterly")}</SelectItem>
                        <SelectItem value="semi-annual">{t("dialog.semiAnnual")}</SelectItem>
                        <SelectItem value="annual">{t("dialog.annual")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      data-testid="input-risk-score"
                    />
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
