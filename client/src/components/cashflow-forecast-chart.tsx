import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
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

  // Custom tooltip to show formatted values
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card className="p-3 shadow-lg">
          <p className="font-semibold mb-2">{payload[0].payload.monthLabel}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-blue-500" />
                {t("forecast.principal")}
              </span>
              <span className="font-semibold">{formatCurrency(payload[0].value, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                {t("forecast.profit")}
              </span>
              <span className="font-semibold">{formatCurrency(payload[1].value, "SAR")}</span>
            </div>
            <div className="flex items-center justify-between gap-4 pt-1 border-t">
              <span className="font-semibold">{t("forecast.total")}</span>
              <span className="font-bold">{formatCurrency(payload[0].value + payload[1].value, "SAR")}</span>
            </div>
          </div>
        </Card>
      );
    }
    return null;
  };

  // Format tick values for Y-axis
  const formatYAxis = (value: number) => {
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
      <CardContent>
        <ResponsiveContainer width="100%" height={600} className="hidden sm:block">
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="monthLabel"
              angle={-45}
              textAnchor="end"
              height={90}
              interval={0}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
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
              fill="#3b82f6"
              radius={[0, 0, 4, 4]}
              name="principal"
              data-testid="bar-principal"
            />
            <Bar
              dataKey="profit"
              stackId="a"
              fill="#22c55e"
              radius={[4, 4, 0, 0]}
              name="profit"
              data-testid="bar-profit"
            />
          </BarChart>
        </ResponsiveContainer>
        <ResponsiveContainer width="100%" height={1800} className="sm:hidden">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 20, left: 60, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              type="number"
              tickFormatter={formatYAxis}
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="monthLabel"
              width={75}
              interval={0}
              tick={{ fontSize: 9 }}
              className="text-muted-foreground"
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0, 0, 0, 0.05)" }} />
            <Legend
              wrapperStyle={{ paddingBottom: "10px" }}
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
              fill="#3b82f6"
              radius={[0, 4, 4, 0]}
              name="principal"
              data-testid="bar-principal"
            />
            <Bar
              dataKey="profit"
              stackId="a"
              fill="#22c55e"
              radius={[0, 4, 4, 0]}
              name="profit"
              data-testid="bar-profit"
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
