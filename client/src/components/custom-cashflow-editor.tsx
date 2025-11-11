import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency } from "@/lib/utils";

export interface CustomCashflow {
  id: string;
  dueDate: string;
  amount: number;
  type: 'profit' | 'principal';
  notes?: string;
}

interface CustomCashflowEditorProps {
  cashflows: CustomCashflow[];
  onChange: (cashflows: CustomCashflow[]) => void;
  startDate?: string;
  endDate?: string;
  expectedProfit?: number;
}

export function CustomCashflowEditor({ 
  cashflows, 
  onChange, 
  startDate, 
  endDate,
  expectedProfit = 0
}: CustomCashflowEditorProps) {
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const addCashflow = () => {
    const newCashflow: CustomCashflow = {
      id: crypto.randomUUID(),
      dueDate: startDate || new Date().toISOString().split("T")[0],
      amount: 0,
      type: 'profit',
      notes: '',
    };
    onChange([...cashflows, newCashflow]);
  };

  const removeCashflow = (id: string) => {
    onChange(cashflows.filter(cf => cf.id !== id));
  };

  const updateCashflow = (id: string, field: keyof CustomCashflow, value: any) => {
    onChange(cashflows.map(cf => 
      cf.id === id ? { ...cf, [field]: value } : cf
    ));
  };

  // Calculate totals
  const totalProfit = cashflows
    .filter(cf => cf.type === 'profit')
    .reduce((sum, cf) => sum + cf.amount, 0);
  
  const totalPrincipal = cashflows
    .filter(cf => cf.type === 'principal')
    .reduce((sum, cf) => sum + cf.amount, 0);

  const sortedCashflows = [...cashflows].sort((a, b) => 
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  return (
    <div className="space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          {language === 'ar' ? 'جدول التوزيعات المخصص' : 'Custom Distribution Schedule'}
        </h3>
        <Button 
          type="button" 
          onClick={addCashflow} 
          size="sm"
          data-testid="button-add-cashflow"
        >
          <Plus className="h-4 w-4 mr-1" />
          {language === 'ar' ? 'إضافة دفعة' : 'Add Payment'}
        </Button>
      </div>

      {sortedCashflows.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          {language === 'ar' 
            ? 'لا توجد دفعات. انقر "إضافة دفعة" لإنشاء جدول مخصص.'
            : 'No payments yet. Click "Add Payment" to create a custom schedule.'}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-2 font-medium">
                    {language === 'ar' ? '#' : '#'}
                  </th>
                  <th className="text-left p-2 font-medium">
                    {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </th>
                  <th className="text-left p-2 font-medium">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </th>
                  <th className="text-left p-2 font-medium">
                    {language === 'ar' ? 'النوع' : 'Type'}
                  </th>
                  <th className="text-left p-2 font-medium">
                    {language === 'ar' ? 'ملاحظات' : 'Notes'}
                  </th>
                  <th className="w-12 p-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedCashflows.map((cashflow, index) => (
                  <tr key={cashflow.id} className="border-t hover:bg-muted/20">
                    <td className="p-2 text-muted-foreground">{index + 1}</td>
                    <td className="p-2">
                      <Input
                        type="date"
                        value={cashflow.dueDate}
                        onChange={(e) => updateCashflow(cashflow.id, 'dueDate', e.target.value)}
                        min={startDate}
                        max={endDate}
                        className="h-8 text-xs"
                        data-testid={`input-date-${cashflow.id}`}
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={cashflow.amount || ''}
                        onChange={(e) => updateCashflow(cashflow.id, 'amount', parseFloat(e.target.value) || 0)}
                        min="0"
                        step="0.01"
                        className="h-8 text-xs"
                        data-testid={`input-amount-${cashflow.id}`}
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={cashflow.type}
                        onValueChange={(value) => updateCashflow(cashflow.id, 'type', value)}
                      >
                        <SelectTrigger className="h-8 text-xs" data-testid={`select-type-${cashflow.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="profit">
                            {language === 'ar' ? 'ربح' : 'Profit'}
                          </SelectItem>
                          <SelectItem value="principal">
                            {language === 'ar' ? 'رأس المال' : 'Principal'}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-2">
                      <Input
                        type="text"
                        value={cashflow.notes || ''}
                        onChange={(e) => updateCashflow(cashflow.id, 'notes', e.target.value)}
                        placeholder={language === 'ar' ? 'اختياري' : 'Optional'}
                        className="h-8 text-xs"
                        data-testid={`input-notes-${cashflow.id}`}
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeCashflow(cashflow.id)}
                        className="h-8 w-8"
                        data-testid={`button-remove-${cashflow.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary */}
      {sortedCashflows.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'إجمالي الأرباح:' : 'Total Profit:'}
            </span>
            <span className="font-semibold text-primary">{formatCurrency(totalProfit)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'إجمالي رأس المال:' : 'Total Principal:'}
            </span>
            <span className="font-semibold">{formatCurrency(totalPrincipal)}</span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">
              {language === 'ar' ? 'إجمالي الدفعات:' : 'Total Payments:'}
            </span>
            <span className="font-bold">{formatCurrency(totalProfit + totalPrincipal)}</span>
          </div>
          {expectedProfit > 0 && totalProfit !== expectedProfit && (
            <div className="text-xs text-orange-500 mt-2">
              ⚠️ {language === 'ar' 
                ? `الفرق عن الربح المتوقع: ${formatCurrency(Math.abs(totalProfit - expectedProfit))}`
                : `Difference from expected profit: ${formatCurrency(Math.abs(totalProfit - expectedProfit))}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
