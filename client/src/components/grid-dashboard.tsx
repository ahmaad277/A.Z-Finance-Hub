import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import GridLayout, { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Eye, EyeOff, GripVertical } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { WIDGET_REGISTRY, getDefaultLayout, getAvailableWidgets } from "./widgets/widget-registry";
import type { UserSettings } from "@shared/schema";
import type { DashboardConfig, WidgetId } from "@/types/widgets";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface GridDashboardProps {
  viewMode: 'simple' | 'professional';
}

export function GridDashboard({ viewMode }: GridDashboardProps) {
  const { data: settings } = useQuery<UserSettings>({ queryKey: ["/api/settings"] });
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";
  
  const [isEditing, setIsEditing] = useState(false);
  const [containerWidth, setContainerWidth] = useState(1200);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Parse dashboard config from settings
  const dashboardConfig = useMemo<DashboardConfig>(() => {
    try {
      const layouts = settings?.dashboardLayout 
        ? JSON.parse(settings.dashboardLayout) as Layout[]
        : getDefaultLayout();
      const hiddenWidgets = settings?.hiddenWidgets
        ? JSON.parse(settings.hiddenWidgets) as WidgetId[]
        : [];
      
      return { layouts, hiddenWidgets };
    } catch {
      return { layouts: getDefaultLayout(), hiddenWidgets: [] };
    }
  }, [settings]);
  
  const [currentLayout, setCurrentLayout] = useState<Layout[]>(dashboardConfig.layouts);
  const [hiddenWidgets, setHiddenWidgets] = useState<WidgetId[]>(dashboardConfig.hiddenWidgets);
  
  // Get available widgets based on view mode
  const availableWidgets = useMemo(() => {
    return getAvailableWidgets(viewMode).filter(
      widget => !hiddenWidgets.includes(widget.id)
    );
  }, [viewMode, hiddenWidgets]);
  
  // Save layout mutation
  const saveLayoutMutation = useMutation({
    mutationFn: async (config: DashboardConfig) => {
      return apiRequest("PUT", "/api/settings", {
        dashboardLayout: JSON.stringify(config.layouts),
        hiddenWidgets: JSON.stringify(config.hiddenWidgets),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: t("dashboard.layoutSaved"),
        description: t("dashboard.layoutSavedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("dashboard.layoutSaveError"),
        variant: "destructive",
      });
    },
  });
  
  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setCurrentLayout(newLayout);
  }, []);
  
  const handleSaveLayout = useCallback(() => {
    saveLayoutMutation.mutate({
      layouts: currentLayout,
      hiddenWidgets,
    });
    setIsEditing(false);
  }, [currentLayout, hiddenWidgets, saveLayoutMutation]);
  
  const handleCancelEdit = useCallback(() => {
    setCurrentLayout(dashboardConfig.layouts);
    setHiddenWidgets(dashboardConfig.hiddenWidgets);
    setIsEditing(false);
  }, [dashboardConfig]);
  
  const toggleWidgetVisibility = useCallback((widgetId: WidgetId) => {
    setHiddenWidgets(prev => {
      if (prev.includes(widgetId)) {
        return prev.filter(id => id !== widgetId);
      } else {
        return [...prev, widgetId];
      }
    });
  }, []);
  
  const resetLayout = useCallback(() => {
    setCurrentLayout(getDefaultLayout());
    setHiddenWidgets([]);
  }, []);

  return (
    <div className="space-y-4" ref={containerRef}>
      {/* Edit Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t("dashboard.title")}</h2>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={resetLayout}
                data-testid="button-reset-layout"
              >
                {t("dashboard.resetLayout")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                data-testid="button-cancel-edit"
              >
                {t("dialog.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLayout}
                disabled={saveLayoutMutation.isPending}
                data-testid="button-save-layout"
              >
                {saveLayoutMutation.isPending ? t("settings.saving") : t("dialog.save")}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              data-testid="button-edit-layout"
            >
              <Edit className="h-4 w-4 mr-2" />
              {t("dashboard.customizeLayout")}
            </Button>
          )}
        </div>
      </div>

      {/* Widget Visibility Toggle (only in edit mode) */}
      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("dashboard.widgetVisibility")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {getAvailableWidgets(viewMode).map(widget => {
                const isHidden = hiddenWidgets.includes(widget.id);
                const Icon = widget.icon;
                return (
                  <Button
                    key={widget.id}
                    variant={isHidden ? "outline" : "default"}
                    size="sm"
                    onClick={() => toggleWidgetVisibility(widget.id)}
                    data-testid={`button-toggle-widget-${widget.id}`}
                  >
                    {isHidden ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                    <Icon className="h-3 w-3 mr-1" />
                    {isRTL ? widget.titleAr : widget.title}
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Grid Layout */}
      <GridLayout
        className="layout"
        layout={currentLayout}
        cols={12}
        rowHeight={60}
        width={containerWidth}
        isDraggable={isEditing}
        isResizable={isEditing}
        compactType="vertical"
        preventCollision={false}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".drag-handle"
        data-testid="grid-dashboard"
      >
        {availableWidgets.map(widget => {
          const WidgetComponent = widget.component;
          const Icon = widget.icon;
          const layoutItem = currentLayout.find(l => l.i === widget.id);
          
          if (!layoutItem) return null;

          return (
            <div key={widget.id} data-grid={layoutItem}>
              <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 shrink-0">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {isEditing && (
                      <div className="drag-handle cursor-move">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <Icon className="h-4 w-4 text-primary" />
                    {isRTL ? widget.titleAr : widget.title}
                  </CardTitle>
                  {isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      data-testid={`button-hide-widget-${widget.id}`}
                    >
                      <EyeOff className="h-3 w-3" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="flex-1 overflow-auto">
                  <WidgetComponent isEditing={isEditing} />
                </CardContent>
              </Card>
            </div>
          );
        })}
      </GridLayout>
    </div>
  );
}
