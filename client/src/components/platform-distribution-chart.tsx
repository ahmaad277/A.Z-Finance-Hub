import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useLanguage } from "@/lib/language-provider";
import { Building2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface PlatformDistributionChartProps {
  metrics: DashboardMetrics;
}

// Platform colors - using chart colors
const PLATFORM_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

export function PlatformDistributionChart({ metrics }: PlatformDistributionChartProps) {
  const { t } = useLanguage();
  const [showPercentage, setShowPercentage] = useState(true);
  
  // Toggle between percentage and value on chart click
  const handleChartClick = () => {
    setShowPercentage(!showPercentage);
  };
  
  // Handle keyboard interaction for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleChartClick();
    }
  };

  // Map platform distribution to chart data with colors
  const data = metrics.platformDistribution.map((platform, index) => ({
    name: platform.platformName,
    value: platform.value,
    count: platform.count,
    percentage: platform.percentage,
    color: PLATFORM_COLORS[index % PLATFORM_COLORS.length],
  })).filter(item => item.value > 0);

  const totalValue = data.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer - positioned inside the pie chart
  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage, value }: any) => {
    const RADIAN = Math.PI / 180;
    // Position labels inside the pie chart (midpoint between inner and outer radius)
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Format value: show in thousands (K) if >= 1000
    const formatValue = (val: number) => {
      if (val >= 1000) {
        return `${(val / 1000).toFixed(0)}K`;
      }
      return val.toFixed(0);
    };

    const displayText = showPercentage 
      ? `${percentage.toFixed(0)}%` 
      : formatValue(value);

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

  // If no platform data, show empty state
  if (data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="h-4 w-4 text-primary" />
          <h3 className="text-lg font-semibold">
            {t("dashboard.platformDistribution")}
          </h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.noPlatformData")}
        </p>
      </div>
    );
  }

  return (
    <div 
      role="button"
      tabIndex={0}
      className="rounded-lg border bg-card hover-elevate active-elevate-2 transition-all cursor-pointer overflow-hidden"
      onClick={handleChartClick}
      onKeyDown={handleKeyDown}
      aria-label={`${t("dashboard.platformDistribution")} - ${t("dashboard.clickToToggle")}`}
      data-testid="card-platform-chart"
    >
      <div className="py-3 px-4">
        <div className="flex items-center justify-center flex-col gap-3">
          {/* Title and Description */}
          <div className="w-full">
            <div className="flex items-center gap-2 mb-0.5">
              <Building2 className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold">
                {t("dashboard.platformDistribution")}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("dashboard.totalValue")}: {formatCurrency(totalValue)}
            </p>
          </div>
          
          {/* Pie Chart - centered */}
          <div className="w-[120px] h-[120px]">
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
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
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
          </div>
        </div>
      </div>
    </div>
  );
}
