import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/language-provider";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface CombinedChartsCardProps {
  metrics: DashboardMetrics;
}

const STATUS_COLORS = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  late: "hsl(var(--chart-4))",
  defaulted: "hsl(var(--destructive))",
};

const PLATFORM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function CombinedChartsCard({ metrics }: CombinedChartsCardProps) {
  const { t } = useLanguage();
  const [showStatusPercentage, setShowStatusPercentage] = useState(true);
  const [showPlatformPercentage, setShowPlatformPercentage] = useState(true);

  // Calculate raw sum from original metrics (pre-filter) to catch all-zero scenarios
  const rawStatusSum = metrics.statusDistribution.active + 
                       metrics.statusDistribution.completed + 
                       metrics.statusDistribution.late + 
                       metrics.statusDistribution.defaulted;

  const statusData = [
    {
      name: t("status.active"),
      value: metrics.statusDistribution.active,
      color: STATUS_COLORS.active,
    },
    {
      name: t("status.completed"),
      value: metrics.statusDistribution.completed,
      color: STATUS_COLORS.completed,
    },
    {
      name: t("status.late"),
      value: metrics.statusDistribution.late,
      color: STATUS_COLORS.late,
    },
    {
      name: t("status.defaulted"),
      value: metrics.statusDistribution.defaulted,
      color: STATUS_COLORS.defaulted,
    },
  ].filter(item => item.value > 0);

  const platformData = metrics.platformDistribution.map((platform, index) => ({
    name: platform.platformName,
    value: platform.value,
    count: platform.count,
    percentage: platform.percentage,
    color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
  })).filter(item => item.value > 0);

  const statusTotal = metrics.totalInvestments;

  const renderStatusLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const displayText = showStatusPercentage 
      ? `${(percent * 100).toFixed(0)}%` 
      : `${value}`;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold text-[11px]"
        style={{ 
          textShadow: '0 0 3px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  const renderPlatformLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, payload } = props;
    const count = payload?.count || 0;
    const pct = payload?.percentage ?? 0;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const displayText = showPlatformPercentage 
      ? `${pct.toFixed(0)}%` 
      : `#${count}`;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold text-[11px]"
        style={{ 
          textShadow: '0 0 3px rgba(0,0,0,0.8)',
          pointerEvents: 'none'
        }}
      >
        {displayText}
      </text>
    );
  };

  return (
    <div 
      className="rounded-lg border bg-card"
      data-testid="card-combined-charts"
    >
      <div className="py-4 px-4">
        <div className="grid grid-cols-2 gap-6">
          {/* Platform Distribution Chart - Right (RTL) */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-center">
              {t("dashboard.platformDistribution")}
            </h3>
            <div 
              role="button"
              tabIndex={0}
              className="w-[120px] h-[120px] cursor-pointer hover-elevate active-elevate-2 rounded-full transition-all"
              onClick={() => setShowPlatformPercentage(!showPlatformPercentage)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowPlatformPercentage(!showPlatformPercentage);
                }
              }}
              aria-label={`${t("dashboard.platformDistribution")} - ${t("dashboard.clickToToggle")}`}
              data-testid="chart-platform"
            >
              {platformData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center">
                  {t("dashboard.noPlatformData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={platformData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderPlatformLabel}
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="none"
                    >
                      {platformData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-md" style={{ zIndex: 1000 }}>
                              <div className="grid gap-1">
                                <div className="flex flex-col">
                                  <span className="text-[0.70rem] uppercase text-muted-foreground">
                                    {item.name}
                                  </span>
                                  <span className="font-bold text-muted-foreground">
                                    {formatCurrency(item.value)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.count} {t("dashboard.investments")} • {item.percentage.toFixed(1)}%
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
              )}
            </div>
          </div>

          {/* Investment Status Chart - Left (RTL) */}
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-sm font-semibold text-center">
              {t("dashboard.investmentStatus")}
            </h3>
            <div 
              role="button"
              tabIndex={0}
              className="w-[120px] h-[120px] cursor-pointer hover-elevate active-elevate-2 rounded-full transition-all"
              onClick={() => setShowStatusPercentage(!showStatusPercentage)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setShowStatusPercentage(!showStatusPercentage);
                }
              }}
              aria-label={`${t("dashboard.investmentStatus")} - ${t("dashboard.clickToToggle")}`}
              data-testid="chart-status"
            >
              {rawStatusSum === 0 || statusData.length === 0 ? (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground text-center px-2">
                  {t("investments.noInvestmentsYet")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={renderStatusLabel}
                      outerRadius={50}
                      fill="#8884d8"
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          const value = Number(data.value ?? 0);
                          const percentage = statusTotal > 0 ? ((value / statusTotal) * 100).toFixed(1) : '0.0';
                          return (
                            <div className="rounded-lg border bg-background p-2 shadow-md" style={{ zIndex: 1000 }}>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
