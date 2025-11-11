import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { FileDown, FileSpreadsheet, FileText, Calendar, TrendingUp, DollarSign, BarChart3 } from "lucide-react";
import type { InvestmentWithPlatform, CashflowWithInvestment, Platform, CashTransaction } from "@shared/schema";
import { calculateDashboardMetrics, formatCurrency, formatPercentage } from "@/lib/dashboardMetrics";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  // Fetch data
  const { data: investments = [] } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/v2/investments"],
  });

  const { data: cashflows = [] } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/v2/cashflows"],
  });

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["/api/v2/platforms"],
  });

  const { data: cashTransactions = [] } = useQuery<CashTransaction[]>({
    queryKey: ["/api/v2/cash-transactions"],
  });

  // Report configuration
  const [reportType, setReportType] = useState<"summary" | "detailed" | "custom">("summary");
  const [dateRange, setDateRange] = useState<"all" | "ytd" | "lastYear" | "lastQuarter" | "lastMonth">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeInvestments, setIncludeInvestments] = useState(true);
  const [includeCashflows, setIncludeCashflows] = useState(true);
  const [includeMetrics, setIncludeMetrics] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!investments || !cashflows || !platforms || !cashTransactions) return null;

    let filteredInvestments = investments;
    
    // Filter by platform
    if (platformFilter !== "all") {
      filteredInvestments = filteredInvestments.filter(inv => inv.platformId === platformFilter);
    }

    // Filter by date range
    const now = new Date();
    let dateRangeFilter: { start: Date; end: Date } | undefined;

    if (dateRange === "ytd") {
      dateRangeFilter = {
        start: new Date(now.getFullYear(), 0, 1),
        end: now
      };
    } else if (dateRange === "lastYear") {
      dateRangeFilter = {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31)
      };
    } else if (dateRange === "lastQuarter") {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1);
      const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      dateRangeFilter = { start: quarterStart, end: quarterEnd };
    } else if (dateRange === "lastMonth") {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      dateRangeFilter = { start: monthStart, end: monthEnd };
    }

    return calculateDashboardMetrics(
      filteredInvestments,
      cashTransactions,
      platforms,
      cashflows,
      dateRangeFilter
    );
  }, [investments, cashflows, platforms, cashTransactions, platformFilter, dateRange]);

  // Export to Excel
  const exportToExcel = () => {
    if (!metrics) return;

    const workbook = XLSX.utils.book_new();

    // Summary Sheet
    if (includeMetrics) {
      const summaryData = [
        ["A.Z Finance Hub - Portfolio Report"],
        ["Generated:", new Date().toLocaleDateString()],
        ["Date Range:", getDateRangeLabel()],
        ["Platform:", platformFilter === "all" ? "All Platforms" : platforms.find(p => p.id === platformFilter)?.name || ""],
        [],
        ["Portfolio Summary"],
        ["Metric", "Value"],
        ["Portfolio Value", formatCurrency(metrics.portfolioValue)],
        ["Total Cash", formatCurrency(metrics.totalCash)],
        ["Cash Ratio", formatPercentage(metrics.cashRatio)],
        ["Expected Returns", formatCurrency(metrics.expectedReturns)],
        ["Actual Returns", formatCurrency(metrics.actualReturns)],
        ["Returns Ratio", formatPercentage(metrics.returnsRatio)],
        ["Weighted APR", formatPercentage(metrics.weightedAPR)],
        ["Portfolio ROI", formatPercentage(metrics.portfolioROI)],
        [],
        ["Investment Status"],
        ["Total Investments", metrics.totalInvestments],
        ["Active", metrics.activeInvestments],
        ["Completed", metrics.completedInvestments],
        ["Late", metrics.lateInvestments],
        ["Defaulted", metrics.defaultedInvestments],
        [],
        ["Averages"],
        ["Average Duration (months)", metrics.avgDuration?.toFixed(1) || "0"],
        ["Average Amount", formatCurrency(metrics.avgAmount)],
        ["Average Payment", formatCurrency(metrics.avgPaymentAmount)],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    }

    // Investments Sheet
    if (includeInvestments && investments.length > 0) {
      const investmentData = [
        ["Platform", "Name", "Amount (SAR)", "Start Date", "End Date", "Expected IRR (%)", "Status", "Risk Score", "Frequency"]
      ];
      
      const filteredInvs = platformFilter === "all" 
        ? investments 
        : investments.filter(inv => inv.platformId === platformFilter);

      filteredInvs.forEach(inv => {
        investmentData.push([
          inv.platform?.name || "N/A",
          inv.name,
          parseFloat(inv.faceValue).toString(),
          new Date(inv.startDate).toLocaleDateString(),
          new Date(inv.endDate).toLocaleDateString(),
          parseFloat(inv.expectedIrr).toString(),
          inv.status,
          (inv.riskScore || 0).toString(),
          inv.distributionFrequency
        ]);
      });

      const investmentSheet = XLSX.utils.aoa_to_sheet(investmentData);
      XLSX.utils.book_append_sheet(workbook, investmentSheet, "Investments");
    }

    // Cashflows Sheet
    if (includeCashflows && cashflows.length > 0) {
      const cashflowData = [
        ["Investment", "Platform", "Due Date", "Amount (SAR)", "Received Date", "Status", "Type"]
      ];

      const filteredCfs = platformFilter === "all"
        ? cashflows
        : cashflows.filter(cf => cf.investment.platformId === platformFilter);

      filteredCfs.forEach(cf => {
        cashflowData.push([
          cf.investment?.name || "N/A",
          cf.investment?.platform?.name || "N/A",
          new Date(cf.dueDate).toLocaleDateString(),
          parseFloat(cf.amount).toString(),
          cf.receivedDate ? new Date(cf.receivedDate).toLocaleDateString() : "Pending",
          cf.status,
          cf.type
        ]);
      });

      const cashflowSheet = XLSX.utils.aoa_to_sheet(cashflowData);
      XLSX.utils.book_append_sheet(workbook, cashflowSheet, "Cashflows");
    }

    // Platform Distribution Sheet
    if (metrics.platformDistribution.length > 0) {
      const platformData = [
        ["Platform", "Total Value (SAR)", "Investment Count", "Percentage (%)"]
      ];

      metrics.platformDistribution.forEach(p => {
        platformData.push([
          p.platformName,
          p.value.toString(),
          p.count.toString(),
          p.percentage.toString()
        ]);
      });

      const platformSheet = XLSX.utils.aoa_to_sheet(platformData);
      XLSX.utils.book_append_sheet(workbook, platformSheet, "Platform Distribution");
    }

    // Export
    const filename = `AZ_Finance_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Export to PDF
  const exportToPDF = () => {
    if (!metrics) return;

    const doc = new jsPDF();
    
    // Add Arabic font support (optional - requires custom font)
    // For now, we'll use default fonts
    
    let yPos = 15;

    // Title
    doc.setFontSize(18);
    doc.text("A.Z Finance Hub - Portfolio Report", 15, yPos);
    yPos += 10;

    // Metadata
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 15, yPos);
    yPos += 5;
    doc.text(`Date Range: ${getDateRangeLabel()}`, 15, yPos);
    yPos += 5;
    doc.text(`Platform: ${platformFilter === "all" ? "All Platforms" : platforms.find(p => p.id === platformFilter)?.name || ""}`, 15, yPos);
    yPos += 10;

    // Portfolio Summary
    if (includeMetrics) {
      doc.setFontSize(14);
      doc.text("Portfolio Summary", 15, yPos);
      yPos += 7;

      const summaryData = [
        ["Portfolio Value", formatCurrency(metrics.portfolioValue)],
        ["Total Cash", formatCurrency(metrics.totalCash)],
        ["Cash Ratio", formatPercentage(metrics.cashRatio)],
        ["Expected Returns", formatCurrency(metrics.expectedReturns)],
        ["Actual Returns", formatCurrency(metrics.actualReturns)],
        ["Weighted APR", formatPercentage(metrics.weightedAPR)],
        ["Portfolio ROI", formatPercentage(metrics.portfolioROI)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Metric", "Value"]],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Investment Status
    if (includeMetrics && yPos < 250) {
      doc.setFontSize(14);
      doc.text("Investment Status", 15, yPos);
      yPos += 7;

      const statusData = [
        ["Total Investments", metrics.totalInvestments.toString()],
        ["Active", metrics.activeInvestments.toString()],
        ["Completed", metrics.completedInvestments.toString()],
        ["Late", metrics.lateInvestments.toString()],
        ["Defaulted", metrics.defaultedInvestments.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [["Status", "Count"]],
        body: statusData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [52, 152, 219] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Platform Distribution (new page if needed)
    if (metrics.platformDistribution.length > 0 && yPos > 200) {
      doc.addPage();
      yPos = 15;
    }

    if (metrics.platformDistribution.length > 0) {
      doc.setFontSize(14);
      doc.text("Platform Distribution", 15, yPos);
      yPos += 7;

      const platformData = metrics.platformDistribution.map(p => [
        p.platformName,
        formatCurrency(p.value),
        p.count.toString(),
        formatPercentage(p.percentage)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Platform", "Value", "Count", "Percentage"]],
        body: platformData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [46, 204, 113] },
      });
    }

    // Investments Table (if included and space available)
    if (includeInvestments && investments.length > 0) {
      doc.addPage();
      yPos = 15;

      doc.setFontSize(14);
      doc.text("Investments", 15, yPos);
      yPos += 7;

      const filteredInvs = platformFilter === "all" 
        ? investments 
        : investments.filter(inv => inv.platformId === platformFilter);

      const invData = filteredInvs.slice(0, 20).map(inv => [
        inv.platform?.name || "N/A",
        inv.name,
        formatCurrency(parseFloat(inv.faceValue)),
        new Date(inv.startDate).toLocaleDateString(),
        formatPercentage(parseFloat(inv.expectedIrr)),
        inv.status
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Platform", "Name", "Amount", "Start Date", "IRR", "Status"]],
        body: invData,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [231, 76, 60] },
      });
    }

    // Save PDF
    const filename = `AZ_Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const getDateRangeLabel = () => {
    switch (dateRange) {
      case "all": return language === "ar" ? "الكل" : "All Time";
      case "ytd": return language === "ar" ? "من بداية السنة" : "Year to Date";
      case "lastYear": return language === "ar" ? "السنة الماضية" : "Last Year";
      case "lastQuarter": return language === "ar" ? "الربع الأخير" : "Last Quarter";
      case "lastMonth": return language === "ar" ? "الشهر الماضي" : "Last Month";
      default: return "All Time";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      {/* Blue Header Area with Title */}
      <div className="bg-primary/10 rounded-lg px-4 py-3">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight" data-testid="heading-reports">
          {language === "ar" ? "التقارير المالية" : "Financial Reports"}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle data-testid="heading-report-config">
              {language === "ar" ? "إعدادات التقرير" : "Report Configuration"}
            </CardTitle>
            <CardDescription>
              {language === "ar" ? "اختر خيارات التخصيص" : "Choose customization options"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Report Type */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "نوع التقرير" : "Report Type"}</Label>
              <Select value={reportType} onValueChange={(v: any) => setReportType(v)}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="summary">
                    {language === "ar" ? "ملخص" : "Summary"}
                  </SelectItem>
                  <SelectItem value="detailed">
                    {language === "ar" ? "مفصل" : "Detailed"}
                  </SelectItem>
                  <SelectItem value="custom">
                    {language === "ar" ? "مخصص" : "Custom"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "الفترة الزمنية" : "Date Range"}</Label>
              <Select value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
                <SelectTrigger data-testid="select-date-range">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "الكل" : "All Time"}</SelectItem>
                  <SelectItem value="ytd">{language === "ar" ? "من بداية السنة" : "Year to Date"}</SelectItem>
                  <SelectItem value="lastYear">{language === "ar" ? "السنة الماضية" : "Last Year"}</SelectItem>
                  <SelectItem value="lastQuarter">{language === "ar" ? "الربع الأخير" : "Last Quarter"}</SelectItem>
                  <SelectItem value="lastMonth">{language === "ar" ? "الشهر الماضي" : "Last Month"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Platform Filter */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "المنصة" : "Platform"}</Label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger data-testid="select-platform-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === "ar" ? "جميع المنصات" : "All Platforms"}</SelectItem>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Include Options */}
            <div className="space-y-3">
              <Label className="text-base">{language === "ar" ? "تضمين في التقرير" : "Include in Report"}</Label>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-metrics" 
                  checked={includeMetrics}
                  onCheckedChange={(checked) => setIncludeMetrics(checked as boolean)}
                  data-testid="checkbox-include-metrics"
                />
                <Label htmlFor="include-metrics" className="cursor-pointer font-normal">
                  {language === "ar" ? "المؤشرات المالية" : "Financial Metrics"}
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-investments" 
                  checked={includeInvestments}
                  onCheckedChange={(checked) => setIncludeInvestments(checked as boolean)}
                  data-testid="checkbox-include-investments"
                />
                <Label htmlFor="include-investments" className="cursor-pointer font-normal">
                  {language === "ar" ? "الاستثمارات" : "Investments"}
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-cashflows" 
                  checked={includeCashflows}
                  onCheckedChange={(checked) => setIncludeCashflows(checked as boolean)}
                  data-testid="checkbox-include-cashflows"
                />
                <Label htmlFor="include-cashflows" className="cursor-pointer font-normal">
                  {language === "ar" ? "التدفقات النقدية" : "Cashflows"}
                </Label>
              </div>

              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="include-charts" 
                  checked={includeCharts}
                  onCheckedChange={(checked) => setIncludeCharts(checked as boolean)}
                  data-testid="checkbox-include-charts"
                />
                <Label htmlFor="include-charts" className="cursor-pointer font-normal">
                  {language === "ar" ? "الرسوم البيانية" : "Charts"}
                </Label>
              </div>
            </div>

            <Separator />

            {/* Export Buttons */}
            <div className="space-y-2">
              <Button 
                className="w-full" 
                onClick={exportToExcel}
                disabled={!metrics}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                {language === "ar" ? "تصدير Excel" : "Export to Excel"}
              </Button>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={exportToPDF}
                disabled={!metrics}
                data-testid="button-export-pdf"
              >
                <FileText className="h-4 w-4 mr-2" />
                {language === "ar" ? "تصدير PDF" : "Export to PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle data-testid="heading-report-preview">
                {language === "ar" ? "معاينة التقرير" : "Report Preview"}
              </CardTitle>
              <CardDescription>
                {language === "ar" ? "معاينة محتوى التقرير قبل التصدير" : "Preview report content before exporting"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!metrics ? (
                <div className="text-center py-12 text-muted-foreground">
                  {language === "ar" ? "جاري تحميل البيانات..." : "Loading data..."}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Portfolio Summary */}
                  {includeMetrics && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        {language === "ar" ? "ملخص المحفظة" : "Portfolio Summary"}
                      </h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "قيمة المحفظة" : "Portfolio Value"}
                          </div>
                          <div className="text-xl font-bold">
                            {formatCurrency(metrics.portfolioValue)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "إجمالي النقد" : "Total Cash"}
                          </div>
                          <div className="text-xl font-bold text-chart-2">
                            {formatCurrency(metrics.totalCash)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "نسبة النقد" : "Cash Ratio"}
                          </div>
                          <div className="text-xl font-bold">
                            {formatPercentage(metrics.cashRatio)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "متوسط APR المرجح" : "Weighted APR"}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.weightedAPR)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "ROI" : "ROI"}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.portfolioROI)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "نسبة العوائد" : "Returns Ratio"}
                          </div>
                          <div className="text-xl font-bold">
                            {formatPercentage(metrics.returnsRatio)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-chart-2/10 border border-chart-2/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {language === "ar" ? "نشطة" : "Active"}
                          </div>
                          <div className="text-lg font-bold text-chart-2">
                            {metrics.activeInvestments}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-muted/50">
                          <div className="text-xs text-muted-foreground mb-1">
                            {language === "ar" ? "مكتملة" : "Completed"}
                          </div>
                          <div className="text-lg font-bold">
                            {metrics.completedInvestments}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {language === "ar" ? "متأخرة" : "Late"}
                          </div>
                          <div className="text-lg font-bold text-yellow-600">
                            {metrics.lateInvestments}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                          <div className="text-xs text-muted-foreground mb-1">
                            {language === "ar" ? "متعثرة" : "Defaulted"}
                          </div>
                          <div className="text-lg font-bold text-destructive">
                            {metrics.defaultedInvestments}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Platform Distribution */}
                  {metrics.platformDistribution.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        {language === "ar" ? "توزيع المنصات" : "Platform Distribution"}
                      </h3>
                      
                      <div className="space-y-2">
                        {metrics.platformDistribution.map((platform) => (
                          <div 
                            key={platform.platformId}
                            className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                          >
                            <div className="flex-1">
                              <div className="font-medium">{platform.platformName}</div>
                              <div className="text-sm text-muted-foreground">
                                {platform.count} {language === "ar" ? "استثمار" : "investments"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">{formatCurrency(platform.value)}</div>
                              <Badge variant="outline" className="mt-1">
                                {formatPercentage(platform.percentage)}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Data Summary */}
                  <div className="grid grid-cols-3 gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{investments.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {language === "ar" ? "استثمارات" : "Investments"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{cashflows.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {language === "ar" ? "تدفقات نقدية" : "Cashflows"}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">{platforms.length}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {language === "ar" ? "منصات" : "Platforms"}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
