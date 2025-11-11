import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency } from "@/lib/utils";
import type { CashflowWithInvestment } from "@shared/schema";

interface PaymentScheduleManagerProps {
  investmentId: string;
  cashflows: CashflowWithInvestment[];
  expectedProfit: number;
  onAddPayment?: (investmentId: string) => void;
  onRemovePayment?: (cashflowId: string) => void;
  onMarkAsReceived?: (cashflowId: string) => void;
}

export function PaymentScheduleManager({
  investmentId,
  cashflows,
  expectedProfit,
  onAddPayment,
  onRemovePayment,
  onMarkAsReceived,
}: PaymentScheduleManagerProps) {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";
  
  // Filter cashflows for this investment only
  const investmentCashflows = cashflows
    .filter(cf => cf.investmentId === investmentId)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  
  const totalPayments = investmentCashflows.length;
  
  // Calculate payment value: expectedProfit / number of profit payments (exclude principal)
  const profitPayments = investmentCashflows.filter(cf => cf.type === "profit");
  const avgPaymentValue = profitPayments.length > 0 
    ? expectedProfit / profitPayments.length
    : 0;
  
  // Get payment box color based on status and due date
  const getPaymentBoxColor = (cashflow: CashflowWithInvestment) => {
    const now = new Date();
    const dueDate = new Date(cashflow.dueDate);
    const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (cashflow.status === "received") {
      return "bg-chart-2 border-chart-2"; // Green - received
    } else if (daysUntilDue < 0) {
      return "bg-destructive border-destructive"; // Red - overdue
    } else if (daysUntilDue <= 7) {
      return "bg-yellow-500 border-yellow-500"; // Yellow - due soon
    } else {
      return "bg-muted-foreground/30 border-muted-foreground/30"; // Gray - upcoming
    }
  };
  
  // Get tooltip text for payment box
  const getPaymentTooltip = (cashflow: CashflowWithInvestment, index: number) => {
    const dueDate = new Date(cashflow.dueDate).toLocaleDateString(
      language === "ar" ? "ar-SA" : "en-US",
      { year: 'numeric', month: 'short', day: 'numeric' }
    );
    const amount = formatCurrency(parseFloat(cashflow.amount || "0"));
    
    if (cashflow.status === "received") {
      return `${language === "ar" ? "دفعة" : "Payment"} #${index + 1} - ${amount} - ${language === "ar" ? "مستلمة" : "Received"} (${dueDate})`;
    } else {
      const now = new Date();
      const dueDateObj = new Date(cashflow.dueDate);
      const daysUntilDue = Math.floor((dueDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        return `${language === "ar" ? "دفعة" : "Payment"} #${index + 1} - ${amount} - ${language === "ar" ? "متأخرة" : "Overdue"} (${dueDate})`;
      } else if (daysUntilDue <= 7) {
        return `${language === "ar" ? "دفعة" : "Payment"} #${index + 1} - ${amount} - ${language === "ar" ? "مستحقة قريباً" : "Due soon"} (${dueDate})`;
      } else {
        return `${language === "ar" ? "دفعة" : "Payment"} #${index + 1} - ${amount} - ${language === "ar" ? "قادمة" : "Upcoming"} (${dueDate})`;
      }
    }
  };
  
  const [selectedPaymentIndex, setSelectedPaymentIndex] = useState<number | null>(null);
  
  return (
    <div className="space-y-3" dir={isRtl ? "rtl" : "ltr"}>
      {/* Top Row: Expected Profit on right, Payment Value on left */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Expected Profit (Right) */}
        <div className={isRtl ? "order-1" : "order-2"}>
          <div className="text-muted-foreground">
            {t("dialog.expectedProfit")}
          </div>
          <div className="font-bold text-chart-1 text-sm">
            {formatCurrency(expectedProfit)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {language === "ar" ? "بدون رأس المال" : "Ex. principal"}
          </div>
        </div>
        
        {/* Payment Value (Left) */}
        <div className={isRtl ? "order-2" : "order-1"}>
          <div className="text-muted-foreground">
            {t("dialog.paymentValue")}
          </div>
          <div className="font-bold text-sm">
            {formatCurrency(avgPaymentValue)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {totalPayments} {language === "ar" ? "دفعات" : "payments"}
          </div>
        </div>
      </div>
      
      {/* Payment Boxes Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground font-medium">
            {language === "ar" ? "جدول الدفعات" : "Payment Schedule"}
          </div>
          {onAddPayment && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAddPayment(investmentId)}
              className="h-6 px-2 text-[10px]"
              data-testid="button-add-payment"
            >
              <Plus className="h-3 w-3 mr-1" />
              {language === "ar" ? "إضافة" : "Add"}
            </Button>
          )}
        </div>
        
        {totalPayments === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-4">
            {language === "ar" ? "لا توجد دفعات مجدولة" : "No payments scheduled"}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {investmentCashflows.map((cashflow, index) => (
              <div
                key={cashflow.id}
                className="relative group"
                data-testid={`payment-box-${index}`}
              >
                <div
                  className={`
                    aspect-square rounded-sm border-2 transition-all cursor-pointer
                    ${getPaymentBoxColor(cashflow)}
                    ${selectedPaymentIndex === index ? 'ring-2 ring-primary ring-offset-1' : ''}
                    hover:scale-110 hover:shadow-lg
                  `}
                  title={getPaymentTooltip(cashflow, index)}
                  onClick={() => setSelectedPaymentIndex(index === selectedPaymentIndex ? null : index)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedPaymentIndex(index === selectedPaymentIndex ? null : index);
                    }
                  }}
                >
                  {cashflow.status === "received" && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                {/* Payment Actions (shown when selected) */}
                {selectedPaymentIndex === index && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 bg-popover border rounded-md shadow-lg p-1 flex gap-1">
                    {cashflow.status !== "received" && onMarkAsReceived && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsReceived(cashflow.id);
                          setSelectedPaymentIndex(null);
                        }}
                        className="h-6 px-2 text-[10px]"
                        data-testid={`button-mark-received-${index}`}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    {onRemovePayment && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemovePayment(cashflow.id);
                          setSelectedPaymentIndex(null);
                        }}
                        className="h-6 px-2 text-[10px] text-destructive hover:text-destructive"
                        data-testid={`button-remove-payment-${index}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-chart-2 border-chart-2" />
            <span>{language === "ar" ? "مستلمة" : "Received"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-yellow-500 border-yellow-500" />
            <span>{language === "ar" ? "قريبة" : "Due soon"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-muted-foreground/30 border-muted-foreground/30" />
            <span>{language === "ar" ? "قادمة" : "Upcoming"}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-sm bg-destructive border-destructive" />
            <span>{language === "ar" ? "متأخرة" : "Overdue"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
