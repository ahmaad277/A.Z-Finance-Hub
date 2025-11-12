import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, TrendingUp, Clock, BarChart3, AlertTriangle, CheckCircle } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { calculateDefaultRate, getSeverityColors } from "@/lib/platform-metrics";
import { Link } from "wouter";
import type { Platform, InvestmentWithPlatform } from "@shared/schema";

interface PlatformCardProps {
  platform: Platform;
  investments: InvestmentWithPlatform[];
  totalReturns: number;
  averageIrr: number;
  averageDuration: number;
  onClick?: () => void;
}

export function PlatformCard({
  platform,
  investments,
  totalReturns,
  averageIrr,
  averageDuration,
  onClick,
}: PlatformCardProps) {
  const { t } = useLanguage();
  
  const totalCapital = investments
    .filter(inv => inv.status === "active")
    .reduce((sum, inv) => sum + parseFloat(inv.faceValue), 0);
  
  const activeCount = investments.filter(inv => inv.status === "active").length;
  
  // Calculate default rate
  const defaultRateData = calculateDefaultRate(investments);
  const severityColors = getSeverityColors(defaultRateData.severity);

  return (
    <Card 
      className="hover-elevate active-elevate-2 cursor-pointer group"
      onClick={onClick}
      data-testid={`card-platform-${platform.id}`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {platform.logoUrl ? (
                <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary">{platform.name[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{platform.name}</h3>
              <p className="text-sm text-muted-foreground">{activeCount} {t("dashboard.investments")}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Default Rate Badge */}
            {defaultRateData.totalCount > 0 && (
              <Badge 
                className={`${severityColors.bg} ${severityColors.text} border-none flex items-center gap-1`}
                data-testid="badge-default-rate"
              >
                {defaultRateData.severity === "low" ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">{defaultRateData.rate.toFixed(1)}%</span>
              </Badge>
            )}
            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">{t("dashboard.capital")}</span>
            </div>
            <p className="font-semibold text-base">{formatCurrency(totalCapital)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">{t("dashboard.returns")}</span>
            </div>
            <p className="font-semibold text-base text-chart-2">{formatCurrency(totalReturns)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm">{t("dashboard.irr")}</span>
            </div>
            <p className="font-semibold text-base text-chart-1">{formatPercentage(averageIrr)}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">{t("dashboard.duration")}</span>
            </div>
            <p className="font-semibold text-base">{Math.round(averageDuration / 30)} {t("dashboard.months")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
