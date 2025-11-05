import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonthlyReturnsChart } from "@/components/monthly-returns-chart";
import { PlatformAllocationChart } from "@/components/platform-allocation-chart";
import { PerformanceVsTargetChart } from "@/components/performance-vs-target-chart";
import type { AnalyticsData } from "@shared/schema";

export default function Analytics() {
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
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Deep insights into your portfolio performance and projections
        </p>
      </div>

      <Tabs defaultValue="returns" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="returns" data-testid="tab-returns">
            Returns
          </TabsTrigger>
          <TabsTrigger value="allocation" data-testid="tab-allocation">
            Allocation
          </TabsTrigger>
          <TabsTrigger value="goals" data-testid="tab-goals">
            Goals
          </TabsTrigger>
        </TabsList>

        <TabsContent value="returns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Returns Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <MonthlyReturnsChart data={analytics?.monthlyReturns || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation by Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <PlatformAllocationChart data={analytics?.platformAllocation || []} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance vs 2040 Target</CardTitle>
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
