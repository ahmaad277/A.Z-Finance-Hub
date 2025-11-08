import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface InvestmentStatusChartProps {
  metrics: DashboardMetrics;
}

const COLORS = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  late: "hsl(var(--chart-4))",
  defaulted: "hsl(var(--destructive))",
};

// Custom label renderer with contrasting text
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#000000"
      stroke="#ffffff"
      strokeWidth="2"
      paintOrder="stroke"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="font-medium"
      style={{ fontSize: '11px', fontWeight: 600 }}
    >
      {`${name} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export function InvestmentStatusChart({ metrics }: InvestmentStatusChartProps) {
  const { t } = useLanguage();

  const data = [
    {
      name: t("status.active"),
      value: metrics.statusDistribution.active,
      color: COLORS.active,
    },
    {
      name: t("status.completed"),
      value: metrics.statusDistribution.completed,
      color: COLORS.completed,
    },
    {
      name: t("status.late"),
      value: metrics.statusDistribution.late,
      color: COLORS.late,
    },
    {
      name: t("status.defaulted"),
      value: metrics.statusDistribution.defaulted,
      color: COLORS.defaulted,
    },
  ].filter(item => item.value > 0);

  const total = metrics.totalInvestments;

  return (
    <Card data-testid="card-status-chart">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{t("dashboard.investmentStatus")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.totalInvestments")}: {total}
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderLabel}
              outerRadius={60}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0];
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-sm">
                      <div className="grid gap-2">
                        <div className="flex flex-col">
                          <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {data.name}
                          </span>
                          <span className="font-bold text-muted-foreground">
                            {data.value} {t("dashboard.investments")}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {payload?.map((entry, index) => (
                    <div key={`legend-${index}`} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-muted-foreground">{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
