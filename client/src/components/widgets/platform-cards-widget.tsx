import { useQuery } from "@tanstack/react-query";
import type { Platform, Investment, Cashflow } from "@shared/schema";
import { useLanguage } from "@/lib/language-provider";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, TrendingUp, DollarSign, Calendar, PieChart } from "lucide-react";
import type { WidgetProps } from "@/types/widgets";

export function PlatformCardsWidget({ isEditing }: WidgetProps) {
  const { data: platforms } = useQuery<Platform[]>({ 
    queryKey: ["/api/platforms"],
    enabled: !isEditing,
  });
  const { data: investments } = useQuery<Investment[]>({ 
    queryKey: ["/api/investments"],
    enabled: !isEditing,
  });
  const { data: cashflows } = useQuery<Cashflow[]>({ 
    queryKey: ["/api/cashflows"],
    enabled: !isEditing,
  });
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const platformStats = platforms?.map(platform => {
    const platformInvestments = investments?.filter(inv => inv.platformId === platform.id) || [];
    const platformInvestmentIds = new Set(platformInvestments.map(inv => inv.id));
    const platformCashflows = cashflows?.filter(cf => platformInvestmentIds.has(cf.investmentId)) || [];
    
    const totalCapital = platformInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    const totalReturns = platformCashflows
      .filter(cf => cf.status === "received")
      .reduce((sum, cf) => sum + parseFloat(cf.amount), 0);
    
    const activeInvestments = platformInvestments.filter(inv => inv.status === "active");
    const avgIRR = activeInvestments.length > 0
      ? activeInvestments.reduce((sum, inv) => sum + parseFloat(inv.expectedIrr), 0) / activeInvestments.length
      : 0;
    
    const avgDuration = activeInvestments.length > 0
      ? activeInvestments.reduce((sum, inv) => {
          const start = new Date(inv.startDate);
          const end = new Date(inv.endDate);
          return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30); // Convert to months
        }, 0) / activeInvestments.length
      : 0;

    return {
      ...platform,
      investmentCount: platformInvestments.length,
      totalCapital,
      totalReturns,
      avgIRR,
      avgDuration,
    };
  }) || [];

  if (!platformStats || platformStats.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("dashboard.noPlatforms")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {platformStats.map((platform) => (
        <Link key={platform.id} href={`/platform/${platform.id}`}>
          <Card 
            className="hover-elevate cursor-pointer transition-all h-full"
            data-testid={`card-platform-${platform.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {platform.logoUrl ? (
                    <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover rounded-md" />
                  ) : (
                    <Building2 className="h-5 w-5 text-primary" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{platform.name}</h3>
                  <p className="text-xs text-muted-foreground capitalize">{platform.type}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <PieChart className="h-3 w-3" />
                    {t("dashboard.investments")}
                  </span>
                  <span className="font-medium">{platform.investmentCount}</span>
                </div>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {t("dashboard.capital")}
                  </span>
                  <span className="font-medium">
                    {platform.totalCapital.toLocaleString(isRTL ? "ar-SA" : "en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {t("dashboard.returns")}
                  </span>
                  <span className="font-medium text-green-600">
                    {platform.totalReturns.toLocaleString(isRTL ? "ar-SA" : "en-US", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {t("dashboard.avgIRR")}
                  </span>
                  <span className="font-medium">{platform.avgIRR.toFixed(2)}%</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t("dashboard.avgDuration")}
                  </span>
                  <span className="font-medium">
                    {platform.avgDuration.toFixed(0)} {t("dashboard.months")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
