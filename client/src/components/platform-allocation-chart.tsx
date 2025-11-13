import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { getPlatformChartColor } from "@/lib/platform-colors";

interface PlatformAllocationChartProps {
  data: Array<{ platform: string; amount: number; percentage: number }>;
}

export function PlatformAllocationChart({ data }: PlatformAllocationChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground">
        <p>No data available yet</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop version */}
      <div className="px-6 pb-6">
        <ResponsiveContainer width="100%" height={400} className="hidden sm:block">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ platform, percentage }) => `${platform}: ${percentage.toFixed(1)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="amount"
            >
              {data.map((entry, index) => {
                const color = getPlatformChartColor(entry.platform);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={color}
                    data-testid={`pie-segment-${entry.platform.toLowerCase()}`}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => `SAR ${value.toLocaleString()}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Mobile version - edge to edge with smaller radius */}
      <div className="w-full sm:hidden -mx-6 px-6">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ platform, percentage }) => `${platform}: ${percentage.toFixed(1)}%`}
              outerRadius={90}
              fill="#8884d8"
              dataKey="amount"
            >
              {data.map((entry, index) => {
                const color = getPlatformChartColor(entry.platform);
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={color}
                    data-testid={`pie-segment-${entry.platform.toLowerCase()}`}
                  />
                );
              })}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "var(--radius)",
              }}
              formatter={(value: number) => `SAR ${value.toLocaleString()}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
