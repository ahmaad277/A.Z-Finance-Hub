import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Percent, Hash } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import type { DashboardMetrics } from "@/lib/dashboardMetrics";

interface InvestmentStatusChartProps {
  metrics: DashboardMetrics;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const COLORS = {
  active: "hsl(var(--chart-1))",
  completed: "hsl(var(--chart-2))",
  late: "hsl(var(--chart-4))",
  defaulted: "hsl(var(--destructive))",
};

export function InvestmentStatusChart({ metrics, isCollapsed = false, onToggle }: InvestmentStatusChartProps) {
  const { t } = useLanguage();
  const [showPercentage, setShowPercentage] = useState(true);

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
    <Card data-testid="card-status-chart">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-lg">{t("dashboard.investmentStatus")}</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={showPercentage ? "default" : "outline"}
              size="sm"
              onClick={() => setShowPercentage(!showPercentage)}
              data-testid="button-toggle-percentage"
              className="h-8 px-3"
            >
              {showPercentage ? (
                <>
                  <Percent className="h-3 w-3 mr-1.5" />
                  <span className="text-xs">{t("dashboard.percentage")}</span>
                </>
              ) : (
                <>
                  <Hash className="h-3 w-3 mr-1.5" />
                  <span className="text-xs">{t("dashboard.count")}</span>
                </>
              )}
            </Button>
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                data-testid="button-toggle-status-chart"
                className="h-8 w-8 p-0"
              >
                {isCollapsed ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronUp className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.totalInvestments")}: {total}
        </p>
      </CardHeader>
      
      {/* Chart - collapsible */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <CardContent className="pt-0">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-full md:w-auto flex-shrink-0">
                  <ResponsiveContainer width={240} height={240}>
                    <PieChart>
                      <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={85}
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
                
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  {data.map((entry, index) => (
                    <div 
                      key={`stat-${index}`} 
                      className="flex items-center gap-3 p-3 rounded-lg border hover-elevate transition-all"
                      data-testid={`status-stat-${entry.name.toLowerCase()}`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: entry.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground truncate">{entry.name}</p>
                        <p className="text-lg font-bold">
                          {showPercentage 
                            ? `${((entry.value / total) * 100).toFixed(1)}%`
                            : entry.value
                          }
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
