import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { calculateDashboardMetrics, formatCurrency, formatPercentage, getPerformanceColor } from "@/lib/dashboardMetrics";
import { Wallet, TrendingUp, Percent, Droplet, Calendar, DollarSign, Target, Activity, CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import type { Investment, CashTransaction, Platform, Cashflow } from "@shared/schema";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  isLoading?: boolean;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, color, isLoading }: MetricCardProps) {
  const { language } = useLanguage();
  
  return (
    <Card className="hover-elevate">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 gap-2">
        <CardTitle className={`text-sm font-medium ${language === 'ar' ? 'text-[15px] font-medium' : ''}`}>
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 bg-muted animate-pulse rounded" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className={`text-xs text-muted-foreground mt-1 ${language === 'ar' ? 'text-[13px] font-medium' : ''}`}>
                {subtitle}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Portfolio Value Widget
export function PortfolioValueWidget() {
  const { t } = useLanguage();
  const { data: investments, isLoading: investmentsLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions, isLoading: cashLoading } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={t('portfolioValue')}
      value={metrics ? formatCurrency(metrics.portfolioValue) : '0 SAR'}
      subtitle={t('activeInvestments') + ' + ' + t('cash')}
      icon={Wallet}
      color="text-primary"
      isLoading={investmentsLoading || cashLoading}
    />
  );
}

// Cash Available Widget
export function CashAvailableWidget() {
  const { t, language } = useLanguage();
  const { data: cashTransactions, isLoading } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: investments } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={t('cashAvailable')}
      value={metrics ? formatCurrency(metrics.totalCash) : '0 SAR'}
      subtitle={language === 'ar' ? 'متاح للاستثمار' : 'Available for investment'}
      icon={DollarSign}
      color="text-green-500"
      isLoading={isLoading}
    />
  );
}

// Returns Ratio Widget (Actual / Expected)
export function ReturnsRatioWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  const color = metrics 
    ? getPerformanceColor(metrics.returnsRatio, { good: 90, warning: 70 })
    : 'text-muted-foreground';
  
  return (
    <MetricCard
      title={language === 'ar' ? 'نسبة العائد المحقق' : 'Returns Ratio'}
      value={metrics ? formatPercentage(metrics.returnsRatio) : '0%'}
      subtitle={language === 'ar' ? 'المحقق / المتوقع' : 'Actual / Expected'}
      icon={TrendingUp}
      color={color}
      isLoading={isLoading}
    />
  );
}

// Cash Ratio Widget
export function CashRatioWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'نسبة الكاش' : 'Cash Ratio'}
      value={metrics ? formatPercentage(metrics.cashRatio) : '0%'}
      subtitle={language === 'ar' ? 'من إجمالي المحفظة' : 'Of total portfolio'}
      icon={Droplet}
      color="text-blue-500"
      isLoading={isLoading}
    />
  );
}

// Portfolio APR Widget
export function PortfolioAPRWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  const color = metrics 
    ? getPerformanceColor(metrics.portfolioAPR, { good: 10, warning: 7 })
    : 'text-muted-foreground';
  
  return (
    <MetricCard
      title={language === 'ar' ? 'العائد السنوي (APR)' : 'Annual Return (APR)'}
      value={metrics ? formatPercentage(metrics.portfolioAPR) : '0%'}
      subtitle={language === 'ar' ? 'للمحفظة ككل' : 'Portfolio-wide'}
      icon={Percent}
      color={color}
      isLoading={isLoading}
    />
  );
}

// Portfolio ROI Widget
export function PortfolioROIWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  const color = metrics 
    ? getPerformanceColor(metrics.portfolioROI, { good: 15, warning: 10 })
    : 'text-muted-foreground';
  
  return (
    <MetricCard
      title={language === 'ar' ? 'العائد على الاستثمار (ROI)' : 'Return on Investment (ROI)'}
      value={metrics ? formatPercentage(metrics.portfolioROI) : '0%'}
      subtitle={language === 'ar' ? 'للمحفظة ككل' : 'Portfolio-wide'}
      icon={Target}
      color={color}
      isLoading={isLoading}
    />
  );
}

// Average Duration Widget
export function AvgDurationWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'متوسط المدة' : 'Avg Duration'}
      value={metrics ? `${metrics.avgDuration.toFixed(1)} ${language === 'ar' ? 'شهر' : 'months'}` : '0'}
      subtitle={language === 'ar' ? 'مدة الاستثمار' : 'Investment period'}
      icon={Calendar}
      isLoading={isLoading}
    />
  );
}

// Average Amount Widget
export function AvgAmountWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'متوسط القيمة' : 'Avg Amount'}
      value={metrics ? formatCurrency(metrics.avgAmount) : '0 SAR'}
      subtitle={language === 'ar' ? 'لكل فرصة' : 'Per opportunity'}
      icon={DollarSign}
      isLoading={isLoading}
    />
  );
}

// Total Investments Counter
export function TotalInvestmentsWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  
  return (
    <MetricCard
      title={language === 'ar' ? 'إجمالي الاستثمارات' : 'Total Investments'}
      value={investments?.length.toString() || '0'}
      subtitle={language === 'ar' ? 'جميع الفرص' : 'All opportunities'}
      icon={Activity}
      color="text-primary"
      isLoading={isLoading}
    />
  );
}

// Active Investments Counter
export function ActiveInvestmentsWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'الاستثمارات النشطة' : 'Active Investments'}
      value={metrics?.activeInvestments.toString() || '0'}
      subtitle={language === 'ar' ? 'قيد التشغيل' : 'Currently running'}
      icon={Activity}
      color="text-green-500"
      isLoading={isLoading}
    />
  );
}

// Completed Investments Counter
export function CompletedInvestmentsWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'الاستثمارات المنتهية' : 'Completed'}
      value={metrics?.completedInvestments.toString() || '0'}
      subtitle={language === 'ar' ? 'مكتملة' : 'Finished'}
      icon={CheckCircle}
      color="text-blue-500"
      isLoading={isLoading}
    />
  );
}

// Late Investments Counter
export function LateInvestmentsWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'متأخرة' : 'Late'}
      value={metrics?.lateInvestments.toString() || '0'}
      subtitle={language === 'ar' ? 'دفعات متأخرة' : 'Overdue payments'}
      icon={Clock}
      color="text-yellow-500"
      isLoading={isLoading}
    />
  );
}

// Defaulted Investments Counter
export function DefaultedInvestmentsWidget() {
  const { language } = useLanguage();
  const { data: investments, isLoading } = useQuery<Investment[]>({
    queryKey: ['/api/investments'],
  });
  const { data: cashTransactions } = useQuery<CashTransaction[]>({
    queryKey: ['/api/cash-transactions'],
  });
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ['/api/platforms'],
  });
  const { data: cashflows } = useQuery<Cashflow[]>({
    queryKey: ['/api/cashflows'],
  });
  
  const metrics = investments && cashTransactions && platforms && cashflows
    ? calculateDashboardMetrics(investments, cashTransactions, platforms, cashflows)
    : null;
  
  return (
    <MetricCard
      title={language === 'ar' ? 'متعثرة' : 'Defaulted'}
      value={metrics?.defaultedInvestments.toString() || '0'}
      subtitle={language === 'ar' ? 'متأخرة +60 يوم' : '>60 days overdue'}
      icon={XCircle}
      color={metrics && metrics.defaultedInvestments > 0 ? 'text-red-500' : 'text-muted-foreground'}
      isLoading={isLoading}
    />
  );
}
