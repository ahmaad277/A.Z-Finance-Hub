import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
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

export function InvestmentStatusChart({ metrics }: InvestmentStatusChartProps) {
  const { t } = useLanguage();
  const [showPercentage, setShowPercentage] = useState(true);
  
  // Toggle between percentage and count on chart click
  const handleChartClick = () => {
    setShowPercentage(!showPercentage);
  };

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

  // Custom label renderer
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const displayText = showPercentage 
      ? `${(percent * 100).toFixed(0)}%` 
      : `${value}`;

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
        style={{ fontSize: '12px', fontWeight: 600 }}
      >
        {displayText}
      </text>
    );
  };

  return (
    <div 
      className="rounded-lg border bg-card hover-elevate active-elevate-2 transition-all cursor-pointer overflow-hidden"
      onClick={handleChartClick}
      data-testid="card-status-chart"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <PieChart className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium text-muted-foreground">
                {t("dashboard.investmentStatus")}
              </p>
            </div>
            <p className="text-2xl font-bold">
              {t("dashboard.totalInvestments")}: {total}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("dashboard.clickToToggle")}
            </p>
          </div>
          
          <div className="w-[120px] h-[120px] flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={renderLabel}
                  outerRadius={50}
                  fill="#8884d8"
                  dataKey="value"
                  onClick={handleChartClick}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0];
                      const value = Number(data.value ?? 0);
                      const percentage = ((value / total) * 100).toFixed(1);
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {data.name}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {value} {t("dashboard.investments")} ({percentage}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
