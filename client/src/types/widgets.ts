export type WidgetSize = 'small' | 'medium' | 'large' | 'xlarge';

export type WidgetId = 
  | 'stats-overview'
  | 'platform-cards'
  | 'portfolio-chart'
  | 'upcoming-cashflows'
  | 'recent-investments'
  | 'cash-balance'
  | 'goal-calculator'
  | 'quick-actions';

export interface WidgetLayout {
  i: string; // widget ID
  x: number;
  y: number;
  w: number; // width in grid units (out of 12)
  h: number; // height in grid units
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetDefinition {
  id: WidgetId;
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  defaultLayout: WidgetLayout;
  component: React.ComponentType<WidgetProps>;
  icon: React.ComponentType<{ className?: string }>;
  category: 'stats' | 'charts' | 'actions' | 'professional';
  requiredMode?: 'simple' | 'professional'; // undefined = available in both
}

export interface WidgetProps {
  isEditing?: boolean;
}

export interface DashboardConfig {
  layouts: WidgetLayout[];
  hiddenWidgets: WidgetId[];
}
