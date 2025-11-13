import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { MonthlyReturnsChart } from "@/components/monthly-returns-chart";
import { PlatformAllocationChart } from "@/components/platform-allocation-chart";
import { PerformanceVsTargetChart } from "@/components/performance-vs-target-chart";
import { Download } from "lucide-react";
import { generateAnalyticsCSV, downloadCSV } from "@/lib/export-utils";
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

  const handleExportAnalytics = () => {
    if (analytics) {
      const csv = generateAnalyticsCSV(analytics);
      const date = new Date().toISOString().split('T')[0];
      downloadCSV(`analytics-report-${date}.csv`, csv);
    }
  };

  return (
    <div className="space-y-4" data-testid="page-analytics">
      {/* Blue Header Area with Title and Button */}
      <div className="bg-primary/10 rounded-lg px-4 py-3 flex flex-row items-center justify-between gap-2">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex-shrink min-w-0">{t("analytics.title")}</h1>
        <Button 
          onClick={handleExportAnalytics} 
          variant="outline"
          data-testid="button-export-analytics"
          className="flex-shrink-0 h-9"
          size="sm"
        >
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">{t("export.report")}</span>
        </Button>
      </div>

      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto sm:mx-0">
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
            <CardContent className="p-0">
              <MonthlyReturnsChart data={analytics?.monthlyReturns || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <Card data-testid="card-portfolio-allocation">
            <CardHeader>
              <CardTitle>{t("analytics.portfolioAllocation")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PlatformAllocationChart data={analytics?.platformAllocation || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card data-testid="card-performance-vs-target">
            <CardHeader>
              <CardTitle>{t("analytics.performanceVsTarget")}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <PerformanceVsTargetChart data={analytics?.performanceVsTarget || []} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
