import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage, formatDate, calculateDaysUntil } from "@/lib/utils";
import { Edit, TrendingUp, Calendar, Target } from "lucide-react";
import type { InvestmentWithPlatform } from "@shared/schema";

interface InvestmentCardProps {
  investment: InvestmentWithPlatform;
  onEdit: () => void;
}

export function InvestmentCard({ investment, onEdit }: InvestmentCardProps) {
  const daysRemaining = calculateDaysUntil(investment.endDate);
  const isActive = investment.status === "active";

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-chart-2/10 text-chart-2";
      case "completed":
        return "bg-muted text-muted-foreground";
      case "pending":
        return "bg-primary/10 text-primary";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="hover-elevate transition-all duration-200 border-l-4 border-l-primary" data-testid={`card-investment-${investment.id}`}>
      <CardHeader className="space-y-0 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <Badge variant="outline" className="mb-2 text-xs">
              {investment.platform.name}
            </Badge>
            <CardTitle className="text-lg line-clamp-2">{investment.name}</CardTitle>
          </div>
          <Badge className={getStatusColor(investment.status)} variant="outline">
            {investment.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Amount</div>
            <div className="text-lg font-bold">{formatCurrency(investment.amount)}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Expected IRR
            </div>
            <div className="text-lg font-bold text-chart-1">{formatPercentage(investment.expectedIrr)}</div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Start: {formatDate(investment.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>End: {formatDate(investment.endDate)}</span>
          </div>
          {isActive && daysRemaining > 0 && (
            <div className="text-xs text-primary font-medium">
              {daysRemaining} days remaining
            </div>
          )}
        </div>

        {investment.riskScore !== null && (
          <div>
            <div className="text-xs text-muted-foreground mb-2">Risk Score</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    investment.riskScore < 30
                      ? "bg-chart-2"
                      : investment.riskScore < 70
                      ? "bg-primary"
                      : "bg-destructive"
                  }`}
                  style={{ width: `${investment.riskScore}%` }}
                />
              </div>
              <span className="text-xs font-medium">{investment.riskScore}/100</span>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          data-testid={`button-edit-investment-${investment.id}`}
          className="w-full hover-elevate"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Investment
        </Button>
      </CardFooter>
    </Card>
  );
}
