import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp } from "lucide-react";
import type { CashflowWithInvestment } from "@shared/schema";

export function UpcomingCashflows() {
  const { data: cashflows } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const upcoming = cashflows
    ?.filter((cf) => cf.status === "expected" || cf.status === "upcoming")
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, 5);

  if (!upcoming || upcoming.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <TrendingUp className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">No upcoming cashflows</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {upcoming.map((cashflow) => (
        <div
          key={cashflow.id}
          className="flex items-start justify-between gap-4 pb-4 border-b last:border-0 last:pb-0"
          data-testid={`upcoming-cashflow-${cashflow.id}`}
        >
          <div className="flex-1">
            <div className="font-medium text-sm line-clamp-1">
              {cashflow.investment.name}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatDate(cashflow.dueDate)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-sm text-chart-2">
              {formatCurrency(cashflow.amount)}
            </div>
            <Badge
              variant="outline"
              className={`mt-1 text-xs ${
                cashflow.status === "expected"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted"
              }`}
            >
              {cashflow.status}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
