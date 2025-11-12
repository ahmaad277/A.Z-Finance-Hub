import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/lib/language-provider";
import { Bell, CheckCircle2, AlertTriangle, Info, TrendingUp, Check, RefreshCw } from "lucide-react";
import type { Alert } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { data: alerts, isLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/alerts/generate", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      
      if (data.generatedCount > 0) {
        toast({
          title: language === "ar" ? "تم توليد التنبيهات" : "Alerts Generated",
          description: language === "ar" 
            ? `تم توليد ${data.generatedCount} تنبيه جديد`
            : `${data.generatedCount} new alert${data.generatedCount > 1 ? 's' : ''} generated`,
        });
      } else {
        toast({
          title: language === "ar" ? "لا توجد تنبيهات جديدة" : "No New Alerts",
          description: language === "ar" 
            ? "جميع التنبيهات محدثة"
            : "All alerts are up to date",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message || (language === "ar" ? "فشل توليد التنبيهات" : "Failed to generate alerts"),
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return apiRequest("PATCH", `/api/alerts/${alertId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    },
  });

  const getAlertIcon = (type: string, severity: string) => {
    if (severity === "error") return AlertTriangle;
    if (severity === "success") return CheckCircle2;
    if (type === "distribution") return TrendingUp;
    return Info;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case "success":
        return "text-chart-2 bg-chart-2/10";
      case "warning":
        return "text-destructive bg-destructive/10";
      case "error":
        return "text-destructive bg-destructive/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      success: "bg-chart-2/10 text-chart-2",
      warning: "bg-destructive/10 text-destructive",
      error: "bg-destructive/10 text-destructive",
      info: "bg-primary/10 text-primary",
    };

    return (
      <Badge className={colors[severity] || colors.info} variant="outline" data-testid={`badge-severity-${severity}`}>
        {t(`alerts.${severity}`)}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-96 animate-pulse rounded bg-muted mt-2" />
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-12">
            <div className="h-64 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const unreadCount = alerts?.filter((a: Alert) => !a.read).length || 0;

  return (
    <div className="space-y-6" data-testid="page-alerts">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("alerts.title")}</h1>
          <p className="text-muted-foreground mt-1">
            {t("alerts.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => generateAlertsMutation.mutate()}
            disabled={generateAlertsMutation.isPending}
            variant="outline"
            data-testid="button-generate-alerts"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${generateAlertsMutation.isPending ? 'animate-spin' : ''}`} />
            {language === "ar" ? "تحديث التنبيهات" : "Refresh Alerts"}
          </Button>
          {unreadCount > 0 && (
            <Badge className="bg-destructive/10 text-destructive text-base px-3 py-1" data-testid="badge-unread-count">
              {t("alerts.unread").replace("{0}", unreadCount.toString())}
            </Badge>
          )}
        </div>
      </div>

      <Card data-testid="card-alerts">
        <CardContent className="p-0">
          {alerts && alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state-alerts">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Bell className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{t("alerts.noAlertsYet")}</h3>
              <p className="text-muted-foreground max-w-sm">
                {t("alerts.noAlertsDesc")}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {alerts?.map((alert: Alert) => {
                const Icon = getAlertIcon(alert.type, alert.severity);
                const colorClass = getAlertColor(alert.severity);

                return (
                  <div
                    key={alert.id}
                    className={`flex gap-4 p-6 hover-elevate transition-colors ${
                      !alert.read ? "bg-primary/5" : ""
                    }`}
                    data-testid={`alert-${alert.id}`}
                  >
                    <div className={`${colorClass} rounded-full p-3 h-fit`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div>
                          <h3 className="font-semibold">{alert.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          {!alert.read && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => markAsReadMutation.mutate(alert.id)}
                              data-testid={`button-mark-read-${alert.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {t("alerts.markAsRead")}
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDate(alert.createdAt)}</span>
                        <span>•</span>
                        <Badge variant="outline" className="capitalize" data-testid={`badge-type-${alert.type}`}>
                          {t(`alerts.${alert.type}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
