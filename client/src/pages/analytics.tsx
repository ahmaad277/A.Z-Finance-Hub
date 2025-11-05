import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/lib/language-provider";
import { MonthlyReturnsChart } from "@/components/monthly-returns-chart";
import { PlatformAllocationChart } from "@/components/platform-allocation-chart";
import { PerformanceVsTargetChart } from "@/components/performance-vs-target-chart";
import type { AnalyticsData } from "@shared/schema";

export default function Analytics() {
  const { t } = useLanguage();
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics"],
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted mt-2" />
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-12">
            <div className="h-96 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="page-analytics">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("analytics.title")}</h1>
        <p className="text-muted-foreground mt-1">
          {t("analytics.subtitle")}
        </p>
      </div>

      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="returns" data-testid="tab-returns">
            {t("analytics.returns")}
          </TabsTrigger>
          <TabsTrigger value="allocation" data-testid="tab-allocation">
            {t("analytics.allocation")}
          </TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">
            {t("analytics.goals")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-6">
          <Card data-testid="card-monthly-returns">
            <CardHeader>
              <CardTitle>{t("analytics.monthlyReturnsTrend")}</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyReturnsChart data={analytics?.monthlyReturns || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <Card data-testid="card-portfolio-allocation">
            <CardHeader>
              <CardTitle>{t("analytics.portfolioAllocation")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformAllocationChart data={analytics?.platformAllocation || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card data-testid="card-performance-vs-target">
            <CardHeader>
              <CardTitle>{t("analytics.performanceVsTarget")}</CardTitle>
            </CardHeader>
            <CardContent>
              <PerformanceVsTargetChart data={analytics?.performanceVsTarget || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
