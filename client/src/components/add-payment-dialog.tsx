import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/lib/language-provider";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { cn } from "@/lib/utils";

const formSchema = z.object({
  dueDate: z.date(),
  amount: z.string().min(1, "Amount is required"),
  type: z.enum(["profit", "principal"]),
  status: z.enum(["upcoming", "expected"]),
});

type FormData = z.infer<typeof formSchema>;

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investmentId: string;
  onSubmit: (data: FormData & { investmentId: string }) => void;
  isPending?: boolean;
}

export function AddPaymentDialog({
  open,
  onOpenChange,
  investmentId,
  onSubmit,
  isPending = false,
}: AddPaymentDialogProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  const [calendarOpen, setCalendarOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dueDate: new Date(),
      amount: "",
      type: "profit",
      status: "upcoming",
    },
  });

  const handleSubmit = (data: FormData) => {
    onSubmit({ ...data, investmentId });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {language === "ar" ? "إضافة دفعة جديدة" : "Add New Payment"}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Due Date */}
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>{language === "ar" ? "تاريخ الاستحقاق" : "Due Date"}</FormLabel>
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-due-date"
                        >
                          {field.value ? (
                            format(field.value, "PPP", {
                              locale: language === "ar" ? ar : enUS,
                            })
                          ) : (
                            <span>{language === "ar" ? "اختر تاريخ" : "Pick a date"}</span>
                          )}
                          <CalendarIcon className={cn("ml-auto h-4 w-4 opacity-50", isRtl && "ml-0 mr-auto")} />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setCalendarOpen(false);
                        }}
                        disabled={(date) => date < new Date("1900-01-01")}
                        initialFocus
                        locale={language === "ar" ? ar : enUS}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "ar" ? "المبلغ" : "Amount"}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={language === "ar" ? "0.00" : "0.00"}
                      data-testid="input-payment-amount"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "ar" ? "نوع الدفعة" : "Payment Type"}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-type">
                        <SelectValue placeholder={language === "ar" ? "اختر النوع" : "Select type"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="profit">
                        {language === "ar" ? "ربح" : "Profit"}
                      </SelectItem>
                      <SelectItem value="principal">
                        {language === "ar" ? "رأس المال" : "Principal"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{language === "ar" ? "الحالة" : "Status"}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-payment-status">
                        <SelectValue placeholder={language === "ar" ? "اختر الحالة" : "Select status"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="upcoming">
                        {language === "ar" ? "قادمة" : "Upcoming"}
                      </SelectItem>
                      <SelectItem value="expected">
                        {language === "ar" ? "متوقعة" : "Expected"}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isPending}
                data-testid="button-cancel-add-payment"
              >
                {language === "ar" ? "إلغاء" : "Cancel"}
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-submit-add-payment"
              >
                {isPending
                  ? (language === "ar" ? "جارٍ الإضافة..." : "Adding...")
                  : (language === "ar" ? "إضافة" : "Add")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
