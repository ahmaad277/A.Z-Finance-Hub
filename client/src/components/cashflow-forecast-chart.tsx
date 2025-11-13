import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import type { MonthlyForecast } from "@shared/cashflow-forecast";
import { TrendingUp } from "lucide-react";

interface CashflowForecastChartProps {
  data: MonthlyForecast[];
  months?: number;
}

export function CashflowForecastChart({ data, months = 40 }: CashflowForecastChartProps) {
  const { t } = useLanguage();

  // Take only the requested number of months
  const chartData = data.slice(0, months);

  // Calculate dynamic height based on number of rows (32px per row)
  const rowHeight = 32;
  const chartHeight = Math.max(chartData.length * rowHeight, 400);

  // Format large numbers compactly (K, M)
  const formatCompact = (value: number): string => {
    if (value === 0) return "0";
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  // Custom label for bars - show value only if bar is wide enough
  const CustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    // Only show label if bar width is at least 40px
    if (width < 40 || value === 0) return null;
    
    const formattedValue = formatCompact(value);
    
    return (
      <text
        x={x + width / 2}
        y={y + height / 2}
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={11}
        fontWeight="600"
      >
        {formattedValue}
      </text>
    );
  };

  // Custom tooltip to show formatted values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const principal = payload.find((p: any) => p.dataKey === "principal")?.value || 0;
      const profit = payload.find((p: any) => p.dataKey === "profit")?.value || 0;
      
      return (
        <Card className="p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.monthLabel}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                {t("forecast.principal")}
              </span>
              <span className="font-semibold">{formatCurrency(principal, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "hsl(var(--chart-2))" }} />
                {t("forecast.profit")}
              </span>
              <span className="font-semibold">{formatCurrency(profit, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="font-semibold">{t("forecast.total")}</span>
              <span className="font-bold">{formatCurrency(principal + profit, "SAR")}</span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Format tick values for X-axis (horizontal)
  const formatXAxis = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toString();
  };

  return (
    <Card data-testid="card-cashflow-forecast">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-chart-2" />
          {t("forecast.title")}
        </CardTitle>
        <div className="text-sm text-muted-foreground">
          {t("forecast.next")} {months} {t("forecast.months")}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Full width chart - no padding, no scroll, displays all months */}
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
            barCategoryGap={10}
            barSize={16}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              domain={[0, 50000]}
              tickFormatter={formatXAxis}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="monthLabel"
              width={100}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
            <Legend
              wrapperStyle={{ paddingTop: "8px" }}
              iconType="square"
              formatter={(value) => {
                if (value === "principal") return t("forecast.principal");
                if (value === "profit") return t("forecast.profit");
                return value;
              }}
            />
            <Bar
              dataKey="principal"
              stackId="a"
              fill="hsl(var(--chart-4))"
              name="principal"
              data-testid="bar-principal"
            >
              <LabelList content={<CustomLabel />} />
            </Bar>
            <Bar
              dataKey="profit"
              stackId="a"
              fill="hsl(var(--chart-2))"
              name="profit"
              data-testid="bar-profit"
            >
              <LabelList content={<CustomLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
