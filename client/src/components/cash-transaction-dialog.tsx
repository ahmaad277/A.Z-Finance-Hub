import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertCashTransactionSchema, type InsertCashTransaction } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface CashTransactionDialogProps {
  type: "deposit" | "withdrawal";
}

export function CashTransactionDialog({ type }: CashTransactionDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const isDeposit = type === "deposit";
  const Icon = isDeposit ? ArrowDown : ArrowUp;

  const form = useForm<InsertCashTransaction>({
    resolver: zodResolver(insertCashTransactionSchema),
    defaultValues: {
      amount: "0",
      type: type,
      source: "transfer",
      notes: "",
      date: new Date(),
    },
  });

  const addCashMutation = useMutation({
    mutationFn: async (data: InsertCashTransaction) => {
      const response = await apiRequest("POST", "/api/cash/transactions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cash/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/cash/balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/stats"] });
      toast({
        title: isDeposit ? t("cash.depositAdded") : t("cash.withdrawalAdded"),
        description: isDeposit ? t("cash.depositAddedDesc") : t("cash.withdrawalAddedDesc"),
      });
      setOpen(false);
      // Reset form with fresh date
      form.reset({
        amount: "0",
        type: type,
        source: "transfer",
        notes: "",
        date: new Date(),
      });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t("cash.failedToAdd"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertCashTransaction) => {
    addCashMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant={isDeposit ? "success" : "destructive"}
          className="h-8 px-1.5 gap-1"
          data-testid={`button-${type}-cash`}
          title={isDeposit ? t("cash.addCash") : t("cash.withdrawCash")}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="text-[10px] font-medium leading-none whitespace-nowrap">
            {isDeposit ? t("cash.deposit") : t("cash.withdrawal")}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid={`dialog-${type}-cash`}>
        <DialogHeader>
          <DialogTitle>
            {isDeposit ? t("cash.addCashTransaction") : t("cash.withdrawCashTransaction")}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.amount")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="1000.00"
                      data-testid="input-cash-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.source")}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                    <FormControl>
                      <SelectTrigger data-testid="select-cash-source">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="bank">{t("cash.bank")}</SelectItem>
                      <SelectItem value="transfer">{t("cash.transfer")}</SelectItem>
                      <SelectItem value="profit">{t("cash.profit")}</SelectItem>
                      <SelectItem value="other">{t("cash.other")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.date")}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      data-testid="input-cash-date"
                      value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      onChange={(e) => field.onChange(new Date(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cash.notes")} ({t("common.optional")})</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("cash.notesPlaceholder")}
                      data-testid="input-cash-notes"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-cash"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={addCashMutation.isPending}
                data-testid="button-save-cash"
              >
                {addCashMutation.isPending ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
