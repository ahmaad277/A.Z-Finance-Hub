import { BarChart3, Building2, TrendingUp, Calendar, DollarSign, Calculator, Zap, LayoutGrid } from "lucide-react";
import type { WidgetDefinition, WidgetId } from "@/types/widgets";
import { StatsOverviewWidget } from "./stats-overview-widget";
import { PlatformCardsWidget } from "./platform-cards-widget";
import { PortfolioChartWidget } from "./portfolio-chart-widget";

// Widget registry - all available widgets
export const WIDGET_REGISTRY: Record<WidgetId, WidgetDefinition> = {
  'stats-overview': {
    id: 'stats-overview',
    title: 'Portfolio Overview',
    titleAr: 'نظرة عامة على المحفظة',
    description: 'Key portfolio statistics',
    descriptionAr: 'إحصائيات المحفظة الرئيسية',
    defaultLayout: { i: 'stats-overview', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
    component: StatsOverviewWidget,
    icon: LayoutGrid,
    category: 'stats',
  },
  'platform-cards': {
    id: 'platform-cards',
    title: 'Platform Overview',
    titleAr: 'نظرة على المنصات',
    description: 'Investment platforms summary',
    descriptionAr: 'ملخص منصات الاستثمار',
    defaultLayout: { i: 'platform-cards', x: 0, y: 2, w: 12, h: 4, minW: 6, minH: 3 },
    component: PlatformCardsWidget,
    icon: Building2,
    category: 'stats',
  },
  'portfolio-chart': {
    id: 'portfolio-chart',
    title: 'Portfolio Performance',
    titleAr: 'أداء المحفظة',
    description: 'Performance chart over time',
    descriptionAr: 'رسم بياني للأداء عبر الوقت',
    defaultLayout: { i: 'portfolio-chart', x: 0, y: 6, w: 8, h: 5, minW: 6, minH: 4 },
    component: PortfolioChartWidget,
    icon: BarChart3,
    category: 'charts',
  },
  'upcoming-cashflows': {
    id: 'upcoming-cashflows',
    title: 'Upcoming Cashflows',
    titleAr: 'التدفقات النقدية القادمة',
    description: 'Expected payments',
    descriptionAr: 'المدفوعات المتوقعة',
    defaultLayout: { i: 'upcoming-cashflows', x: 8, y: 6, w: 4, h: 4, minW: 4, minH: 3 },
    component: () => <div>Upcoming Cashflows (TODO)</div>,
    icon: Calendar,
    category: 'stats',
  },
  'recent-investments': {
    id: 'recent-investments',
    title: 'Recent Investments',
    titleAr: 'الاستثمارات الأخيرة',
    description: 'Latest investments',
    descriptionAr: 'آخر الاستثمارات',
    defaultLayout: { i: 'recent-investments', x: 0, y: 10, w: 12, h: 3, minW: 6, minH: 2 },
    component: () => <div>Recent Investments (TODO)</div>,
    icon: TrendingUp,
    category: 'stats',
  },
  'cash-balance': {
    id: 'cash-balance',
    title: 'Cash Balance',
    titleAr: 'الرصيد النقدي',
    description: 'Available cash',
    descriptionAr: 'النقد المتاح',
    defaultLayout: { i: 'cash-balance', x: 0, y: 13, w: 4, h: 2, minW: 3, minH: 2 },
    component: () => <div>Cash Balance (TODO)</div>,
    icon: DollarSign,
    category: 'professional',
    requiredMode: 'professional',
  },
  'goal-calculator': {
    id: 'goal-calculator',
    title: 'Goal Calculator',
    titleAr: 'حاسبة الهدف',
    description: 'Investment goal projections',
    descriptionAr: 'توقعات الهدف الاستثماري',
    defaultLayout: { i: 'goal-calculator', x: 4, y: 13, w: 8, h: 4, minW: 6, minH: 3 },
    component: () => <div>Goal Calculator (TODO)</div>,
    icon: Calculator,
    category: 'professional',
    requiredMode: 'professional',
  },
  'quick-actions': {
    id: 'quick-actions',
    title: 'Quick Actions',
    titleAr: 'إجراءات سريعة',
    description: 'Common actions',
    descriptionAr: 'الإجراءات الشائعة',
    defaultLayout: { i: 'quick-actions', x: 0, y: 17, w: 12, h: 2, minW: 4, minH: 2 },
    component: () => <div>Quick Actions (TODO)</div>,
    icon: Zap,
    category: 'actions',
  },
};

export function getDefaultLayout(): WidgetDefinition['defaultLayout'][] {
  // Return deep copy to prevent mutations
  return Object.values(WIDGET_REGISTRY).map(widget => ({ ...widget.defaultLayout }));
}

export function getAvailableWidgets(viewMode: 'simple' | 'professional' = 'simple'): WidgetDefinition[] {
  return Object.values(WIDGET_REGISTRY).filter(widget => {
    if (!widget.requiredMode) return true;
    return widget.requiredMode === viewMode || viewMode === 'professional';
  });
}
