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
    <ResponsiveContainer width="100%" height={400}>
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
  );
}
