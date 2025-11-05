import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TrendingUp, TrendingDown, Plus, CheckCircle2 } from "lucide-react";
import type { Investment, Cashflow } from "@shared/schema";

type TimelineEvent = {
  id: string;
  date: Date | string;
  type: "investment" | "cashflow" | "maturity";
  title: string;
  amount: number;
  description: string;
  icon: any;
  iconColor: string;
  bgColor: string;
};

export default function Timeline() {
  const { data: investments } = useQuery<Investment[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ["/api/cashflows"],
  });

  const events: TimelineEvent[] = [];

  investments?.forEach((inv) => {
    events.push({
      id: `inv-start-${inv.id}`,
      date: inv.startDate,
      type: "investment",
      title: "Investment Started",
      amount: parseFloat(inv.amount),
      description: `New investment in ${inv.name}`,
      icon: Plus,
      iconColor: "text-primary",
      bgColor: "bg-primary/10",
    });

    if (inv.status === "completed") {
      events.push({
        id: `inv-end-${inv.id}`,
        date: inv.endDate,
        type: "maturity",
        title: "Investment Matured",
        amount: parseFloat(inv.amount),
        description: `${inv.name} reached maturity`,
        icon: CheckCircle2,
        iconColor: "text-chart-2",
        bgColor: "bg-chart-2/10",
      });
    }
  });

  cashflows?.filter(cf => cf.status === "received").forEach((cf) => {
    events.push({
      id: `cashflow-${cf.id}`,
      date: cf.receivedDate || cf.dueDate,
      type: "cashflow",
      title: "Profit Distribution Received",
      amount: parseFloat(cf.amount),
      description: `${cf.type} payment received`,
      icon: TrendingUp,
      iconColor: "text-chart-2",
      bgColor: "bg-chart-2/10",
    });
  });

  const sortedEvents = events.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="space-y-6" data-testid="page-timeline">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Timeline</h1>
        <p className="text-muted-foreground mt-1">
          Complete history of all investment activities and transactions
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {sortedEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Your investment timeline will appear here as you add investments and receive distributions
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="flex gap-4"
                  data-testid={`event-${event.type}-${event.id}`}
                >
                  <div className="flex flex-col items-center">
                    <div className={`${event.bgColor} ${event.iconColor} rounded-full p-3`}>
                      <event.icon className="h-5 w-5" />
                    </div>
                    {index < sortedEvents.length - 1 && (
                      <div className="flex-1 w-px bg-border mt-2" style={{ minHeight: "40px" }} />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-8">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-chart-2">
                          {formatCurrency(event.amount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(event.date)}
                        </div>
                      </div>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
