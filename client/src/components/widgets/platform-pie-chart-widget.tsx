import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLanguage } from "@/lib/language-provider";
import { calculateDashboardMetrics, formatCurrency } from "@/lib/dashboardMetrics";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Hash, DollarSign } from "lucide-react";
import type { Investment, CashTransaction, Platform, Cashflow } from "@shared/schema";

const PLATFORM_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export function PlatformPieChartWidget() {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState<'value' | 'count'>('value');
  
  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  const chartData = metrics?.platformDistribution.map((platform, index) => ({
    name: platform.platformName,
    value: viewMode === 'value' ? platform.value : platform.count,
    percentage: viewMode === 'value' ? platform.percentage : (platform.count / metrics.totalInvestments * 100),
    color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
  })) || [];
  
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className={language === 'ar' ? 'text-[15px] font-medium' : ''}>
          {language === 'ar' ? 'توزيع المنصات' : 'Platform Distribution'}
        </CardTitle>
        <div className="flex gap-2">
          <Button
            data-testid="button-view-value"
            size="sm"
            variant={viewMode === 'value' ? 'default' : 'outline'}
            onClick={() => setViewMode('value')}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Button
            data-testid="button-view-count"
            size="sm"
            variant={viewMode === 'count' ? 'default' : 'outline'}
            onClick={() => setViewMode('count')}
          >
            <Hash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {investmentsLoading ? (
          <div className="h-64 bg-muted animate-pulse rounded" />
        ) : chartData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            {language === 'ar' ? 'لا توجد بيانات' : 'No data available'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage.toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => {
                  if (viewMode === 'value') {
                    return [formatCurrency(value), language === 'ar' ? 'القيمة' : 'Value'];
                  }
                  return [value, language === 'ar' ? 'العدد' : 'Count'];
                }}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className={language === 'ar' ? 'text-[13px] font-medium' : ''}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <p className={`text-xs text-muted-foreground text-center mt-2 ${language === 'ar' ? 'text-[13px] font-medium' : ''}`}>
          {viewMode === 'value' 
            ? (language === 'ar' ? 'العرض: القيمة' : 'View: Value')
            : (language === 'ar' ? 'العرض: العدد' : 'View: Count')
          }
        </p>
      </CardContent>
    </Card>
  );
}
