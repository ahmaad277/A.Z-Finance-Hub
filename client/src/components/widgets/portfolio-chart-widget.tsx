import { PortfolioChart } from "../portfolio-chart";
import type { WidgetProps } from "@/types/widgets";

export function PortfolioChartWidget({ isEditing }: WidgetProps) {
  if (isEditing) {
    return (
      <div className="h-[250px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-md">
        <p>Portfolio Performance Chart</p>
      </div>
    );
  }
  
  return <PortfolioChart />;
}
