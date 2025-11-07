import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { calculateDashboardMetrics } from "@/lib/dashboardMetrics";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { Investment, CashTransaction, Platform, Cashflow } from "@shared/schema";

const COLORS = {
  active: '#22C55E', // green
  completed: '#3B82F6', // blue
  late: '#EAB308', // yellow
  defaulted: '#EF4444', // red
};

export function StatusPieChartWidget() {
  const { t, language } = useLanguage();
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
  
  const chartData = metrics ? [
    {
      name: language === 'ar' ? 'نشطة' : 'Active',
      value: metrics.statusDistribution.active,
      color: COLORS.active,
    },
    {
      name: language === 'ar' ? 'منتهية' : 'Completed',
      value: metrics.statusDistribution.completed,
      color: COLORS.completed,
    },
    {
      name: language === 'ar' ? 'متأخرة' : 'Late',
      value: metrics.statusDistribution.late,
      color: COLORS.late,
    },
    {
      name: language === 'ar' ? 'متعثرة' : 'Defaulted',
      value: metrics.statusDistribution.defaulted,
      color: COLORS.defaulted,
    },
  ].filter(item => item.value > 0) : [];
  
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className={language === 'ar' ? 'text-[15px] font-medium' : ''}>
          {language === 'ar' ? 'توزيع حالات الاستثمارات' : 'Investment Status Distribution'}
        </CardTitle>
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [value, language === 'ar' ? 'العدد' : 'Count']}
              />
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value) => <span className={language === 'ar' ? 'text-[13px] font-medium' : ''}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
