import type { PortfolioStats, AnalyticsData, InvestmentWithPlatform, CashflowWithInvestment } from "@shared/schema";

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSV(value: string): string {
  // Quote values that contain commas, quotes, or newlines
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCSVRow(row: string[]): string {
  return row.map(escapeCSV).join(',');
}

export function generatePortfolioStatsCSV(stats: PortfolioStats): string {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Capital (SAR)', stats.totalCapital.toFixed(2)],
    ['Total Returns (SAR)', stats.totalReturns.toFixed(2)],
    ['Average IRR (%)', stats.averageIrr.toFixed(2)],
    ['Active Investments', stats.activeInvestments.toString()],
    ['Upcoming Cashflow (SAR)', stats.upcomingCashflow.toFixed(2)],
    ['Progress to 2040 (%)', stats.progressTo2040.toFixed(2)],
  ];

  return [headers, ...rows]
    .map(formatCSVRow)
    .join('\n');
}

export function generateInvestmentsCSV(investments: InvestmentWithPlatform[]): string {
  const headers = ['Platform', 'Name', 'Amount (SAR)', 'Start Date', 'End Date', 'Expected IRR (%)', 'Status', 'Risk Score', 'Frequency'];
  
  const rows = investments.map(inv => [
    inv.platform.name,
    inv.name,
    parseFloat(inv.amount).toFixed(2),
    new Date(inv.startDate).toLocaleDateString(),
    new Date(inv.endDate).toLocaleDateString(),
    parseFloat(inv.expectedIrr).toFixed(2),
    inv.status,
    inv.riskScore?.toString() || 'N/A',
    inv.distributionFrequency,
  ]);

  return [headers, ...rows]
    .map(formatCSVRow)
    .join('\n');
}

export function generateCashflowsCSV(cashflows: CashflowWithInvestment[]): string {
  const headers = ['Investment', 'Platform', 'Due Date', 'Amount (SAR)', 'Received Date', 'Status', 'Type'];
  
  const rows = cashflows.map(cf => [
    cf.investment.name,
    cf.investment.platform.name,
    new Date(cf.dueDate).toLocaleDateString(),
    parseFloat(cf.amount).toFixed(2),
    cf.receivedDate ? new Date(cf.receivedDate).toLocaleDateString() : 'N/A',
    cf.status,
    cf.type,
  ]);

  return [headers, ...rows]
    .map(formatCSVRow)
    .join('\n');
}

export function generateAnalyticsCSV(analytics: AnalyticsData): string {
  // Single consistent schema: Section, Category, Value1, Value2, Value3
  const headers = ['Section', 'Category', 'Value1', 'Value2', 'Value3'];
  let csv = formatCSVRow(headers) + '\n';
  
  // Monthly Returns (Month, Amount)
  analytics.monthlyReturns.forEach(item => {
    csv += formatCSVRow(['Monthly Returns', item.month, item.amount.toFixed(2), '', '']) + '\n';
  });

  // Platform Allocation (Platform, Amount, Percentage)
  analytics.platformAllocation.forEach(item => {
    csv += formatCSVRow(['Platform Allocation', item.platform, item.amount.toFixed(2), item.percentage.toFixed(2), '']) + '\n';
  });

  // Performance vs Target (Year, Actual, Target)
  analytics.performanceVsTarget.forEach(item => {
    csv += formatCSVRow(['Performance vs Target', item.year.toString(), item.actual.toFixed(2), item.target.toFixed(2), '']) + '\n';
  });

  return csv;
}

export function generateComprehensiveReport(
  stats: PortfolioStats,
  investments: InvestmentWithPlatform[],
  cashflows: CashflowWithInvestment[],
  analytics: AnalyticsData,
  reportType: 'monthly' | 'quarterly'
): string {
  const date = new Date().toISOString().split('T')[0];
  const reportTitle = reportType === 'monthly' ? 'Monthly Financial Report' : 'Quarterly Financial Report';
  
  // Single consistent schema with maximum columns
  const headers = ['Section', 'Category', 'Item', 'Value1', 'Value2', 'Value3', 'Value4', 'Value5', 'Value6', 'Value7'];
  let csv = formatCSVRow(headers) + '\n';
  
  // Report metadata
  csv += formatCSVRow(['REPORT', 'Type', reportTitle, '', '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['REPORT', 'Date', date, '', '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['REPORT', 'System', 'A.Z Finance Hub Vision 2040', '', '', '', '', '', '', '']) + '\n';
  
  // Portfolio Summary
  csv += formatCSVRow(['PORTFOLIO', 'Total Capital (SAR)', '', stats.totalCapital.toFixed(2), '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['PORTFOLIO', 'Total Returns (SAR)', '', stats.totalReturns.toFixed(2), '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['PORTFOLIO', 'Average IRR (%)', '', stats.averageIrr.toFixed(2), '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['PORTFOLIO', 'Active Investments', '', stats.activeInvestments.toString(), '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['PORTFOLIO', 'Upcoming Cashflow (SAR)', '', stats.upcomingCashflow.toFixed(2), '', '', '', '', '', '']) + '\n';
  csv += formatCSVRow(['PORTFOLIO', 'Progress to 2040 (%)', '', stats.progressTo2040.toFixed(2), '', '', '', '', '', '']) + '\n';
  
  // Investments (Platform, Name, Amount, StartDate, EndDate, IRR, Status, Risk, Frequency)
  investments.forEach(inv => {
    csv += formatCSVRow([
      'INVESTMENT',
      inv.platform.name,
      inv.name,
      parseFloat(inv.amount).toFixed(2),
      new Date(inv.startDate).toLocaleDateString(),
      new Date(inv.endDate).toLocaleDateString(),
      parseFloat(inv.expectedIrr).toFixed(2),
      inv.status,
      inv.riskScore?.toString() || 'N/A',
      inv.distributionFrequency,
    ]) + '\n';
  });
  
  // Cashflows (Investment, Platform, DueDate, Amount, ReceivedDate, Status, Type)
  cashflows.forEach(cf => {
    csv += formatCSVRow([
      'CASHFLOW',
      cf.investment.name,
      cf.investment.platform.name,
      parseFloat(cf.amount).toFixed(2),
      new Date(cf.dueDate).toLocaleDateString(),
      cf.receivedDate ? new Date(cf.receivedDate).toLocaleDateString() : 'N/A',
      cf.status,
      cf.type,
      '',
      '',
    ]) + '\n';
  });
  
  // Analytics - Monthly Returns
  analytics.monthlyReturns.forEach(item => {
    csv += formatCSVRow(['ANALYTICS', 'Monthly Returns', item.month, item.amount.toFixed(2), '', '', '', '', '', '']) + '\n';
  });
  
  // Analytics - Platform Allocation
  analytics.platformAllocation.forEach(item => {
    csv += formatCSVRow(['ANALYTICS', 'Platform Allocation', item.platform, item.amount.toFixed(2), item.percentage.toFixed(2), '', '', '', '', '']) + '\n';
  });
  
  // Analytics - Performance vs Target
  analytics.performanceVsTarget.forEach(item => {
    csv += formatCSVRow(['ANALYTICS', 'Performance', item.year.toString(), item.actual.toFixed(2), item.target.toFixed(2), '', '', '', '', '']) + '\n';
  });
  
  return csv;
}
