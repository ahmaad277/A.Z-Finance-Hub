import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/lib/language-provider";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
import ArabicReshaper from 'arabic-reshaper';

export default function Reports() {
  const { t, language } = useLanguage();
  const { toast } = useToast();

  // Fetch data
  const { data: investments = [] } = useQuery<InvestmentWithPlatform[]>({
    queryKey: ["/api/investments"],
  });

  const { data: cashflows = [] } = useQuery<CashflowWithInvestment[]>({
    queryKey: ["/api/cashflows"],
  });

  const { data: platforms = [] } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const { data: cashTransactions = [] } = useQuery<CashTransaction[]>({
    queryKey: ["/api/cash/transactions"],
  });

  // Translation helper function for reports (uses reportLanguage, not UI language)
  const getReportTranslation = (key: string, lang: "en" | "ar" = reportLanguage): string => {
    return t(key, lang);
  };

  // Helper to translate status/type/frequency values (directly from schema enums)
  const translateValue = (value: string, lang: "en" | "ar" = reportLanguage): string => {
    // Direct mapping from schema enum literals (lowercase)
    const valueMap: Record<string, string> = {
      // Investment statuses (from schema: active, late, defaulted, completed, pending)
      "active": "report.statusActive",
      "completed": "report.statusCompleted",
      "late": "report.statusLate",
      "defaulted": "report.statusDefaulted",
      "pending": "report.statusPending",
      // Cashflow statuses (from schema: received, expected, upcoming)
      "received": "report.statusReceived",
      "expected": "report.statusExpected",
      "upcoming": "report.statusUpcoming",
      // Cashflow types (from schema: principal, profit)
      "principal": "report.typePrincipal",
      "profit": "report.typeProfit",
      // Distribution frequencies (from schema: monthly, quarterly, semi_annually, annually, at_maturity, custom)
      "monthly": "report.frequencyMonthly",
      "quarterly": "report.frequencyQuarterly",
      "semi_annually": "report.frequencyBiAnnual",
      "annually": "report.frequencyAnnual",
      "at_maturity": "report.frequencyAtMaturity",
      "custom": "report.frequencyCustom",
      // Legacy/alternative forms for backward compatibility
      "bi-annual": "report.frequencyBiAnnual",
      "annual": "report.frequencyAnnual",
      "at maturity": "report.frequencyAtMaturity",
    };
    
    const key = valueMap[value.toLowerCase()];
    return key ? getReportTranslation(key, lang) : value;
  };

  // Report configuration
  const [reportType, setReportType] = useState<"summary" | "detailed" | "custom">("summary");
  const [dateRange, setDateRange] = useState<"all" | "ytd" | "lastYear" | "lastQuarter" | "lastMonth">("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [reportLanguage, setReportLanguage] = useState<"en" | "ar">(language as "en" | "ar");
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
    const tr = (key: string) => getReportTranslation(key, reportLanguage);

    // Summary Sheet
    if (includeMetrics) {
      const summaryData = [
        [tr("report.portfolioReport")],
        [tr("report.generated") + ":", new Date().toLocaleDateString()],
        [tr("report.dateRange") + ":", getDateRangeLabel()],
        [tr("report.platform") + ":", platformFilter === "all" ? tr("report.allPlatforms") : platforms.find(p => p.id === platformFilter)?.name || ""],
        [],
        [tr("report.portfolioSummary")],
        [tr("report.metric"), tr("report.value")],
        [tr("report.portfolioValue"), formatCurrency(metrics.portfolioValue)],
        [tr("report.totalCash"), formatCurrency(metrics.totalCash)],
        [tr("report.cashRatio"), formatPercentage(metrics.cashRatio)],
        [tr("report.expectedReturns"), formatCurrency(metrics.expectedReturns)],
        [tr("report.actualReturns"), formatCurrency(metrics.actualReturns)],
        [tr("report.activeAPR"), formatPercentage(metrics.activeAPR)],
        [tr("report.historicalAPR"), formatPercentage(metrics.weightedAPR)],
        [tr("report.portfolioROI"), formatPercentage(metrics.portfolioROI)],
        [],
        [tr("report.investmentStatus")],
        [tr("report.totalInvestments"), metrics.totalInvestments],
        [tr("report.activeInvestments"), metrics.activeInvestments],
        [tr("report.completedInvestments"), metrics.completedInvestments],
        [tr("report.lateInvestments"), metrics.lateInvestments],
        [tr("report.defaultedInvestments"), metrics.defaultedInvestments],
        [],
        [tr("report.averages")],
        [tr("report.avgDuration"), metrics.avgDuration?.toFixed(1) || "0"],
        [tr("report.avgAmount"), formatCurrency(metrics.avgAmount)],
        [tr("report.avgPayment"), formatCurrency(metrics.avgPaymentAmount)],
      ];
      
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    }

    // Investments Sheet
    if (includeInvestments && investments.length > 0) {
      const investmentData = [
        [
          tr("report.platformColumn"),
          tr("report.nameColumn"),
          tr("report.amountColumn"),
          tr("report.startDateColumn"),
          tr("report.endDateColumn"),
          tr("report.expectedIRRColumn"),
          tr("report.statusColumn"),
          tr("report.riskScoreColumn"),
          tr("report.frequencyColumn")
        ]
      ];
      
      const filteredInvs = platformFilter === "all" 
        ? investments 
        : investments.filter(inv => inv.platformId === platformFilter);

      filteredInvs.forEach(inv => {
        // Use investment number instead of name to avoid Arabic text issues
        const investmentLabel = inv.investmentNumber 
          ? `${tr("investments.number")}${inv.investmentNumber}`
          : inv.name;
        
        investmentData.push([
          inv.platform?.name || "N/A",
          investmentLabel,
          parseFloat(inv.faceValue).toString(),
          new Date(inv.startDate).toLocaleDateString(),
          new Date(inv.endDate).toLocaleDateString(),
          parseFloat(inv.expectedIrr).toString(),
          translateValue(inv.status, reportLanguage),
          (inv.riskScore || 0).toString(),
          translateValue(inv.distributionFrequency, reportLanguage)
        ]);
      });

      const investmentSheet = XLSX.utils.aoa_to_sheet(investmentData);
      XLSX.utils.book_append_sheet(workbook, investmentSheet, "Investments");
    }

    // Cashflows Sheet
    if (includeCashflows && cashflows.length > 0) {
      const cashflowData = [
        [
          tr("report.investmentColumn"),
          tr("report.platformColumn"),
          tr("report.dueDateColumn"),
          tr("report.amountColumn"),
          tr("report.receivedDateColumn"),
          tr("report.statusColumn"),
          tr("report.typeColumn")
        ]
      ];

      const filteredCfs = platformFilter === "all"
        ? cashflows
        : cashflows.filter(cf => cf.investment.platformId === platformFilter);

      filteredCfs.forEach(cf => {
        // Use investment number instead of name to avoid Arabic text issues
        const investmentLabel = cf.investment?.investmentNumber 
          ? `${tr("investments.number")}${cf.investment.investmentNumber}`
          : cf.investment?.name || "N/A";
        
        cashflowData.push([
          investmentLabel,
          cf.investment?.platform?.name || "N/A",
          new Date(cf.dueDate).toLocaleDateString(),
          parseFloat(cf.amount).toString(),
          cf.receivedDate ? new Date(cf.receivedDate).toLocaleDateString() : translateValue("Pending", reportLanguage),
          translateValue(cf.status, reportLanguage),
          translateValue(cf.type, reportLanguage)
        ]);
      });

      const cashflowSheet = XLSX.utils.aoa_to_sheet(cashflowData);
      XLSX.utils.book_append_sheet(workbook, cashflowSheet, "Cashflows");
    }

    // Platform Distribution Sheet
    if (metrics.platformDistribution.length > 0) {
      const platformData = [
        [
          tr("report.platformColumn"),
          tr("report.totalValueColumn"),
          tr("report.countColumn"),
          tr("report.percentageColumn")
        ]
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
  const exportToPDF = async () => {
    if (!metrics) return;

    const doc = new jsPDF();
    let effectiveLang: "en" | "ar" = reportLanguage;
    let arabicFontLoaded = false;
    
    // Always load Arabic font to support Arabic investment names even in English reports
    try {
      const response = await fetch('/fonts/NotoSansArabic.ttf');
      const arrayBuffer = await response.arrayBuffer();
      const base64Font = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => 
          data + String.fromCharCode(byte), '')
      );
      
      doc.addFileToVFS("NotoSansArabic.ttf", base64Font);
      doc.addFont("NotoSansArabic.ttf", "NotoSansArabic", "normal");
      arabicFontLoaded = true;
      
      // Set as default font only for Arabic reports
      if (reportLanguage === "ar") {
        doc.setFont("NotoSansArabic");
      }
    } catch (error) {
      console.error('Failed to load Arabic font:', error);
      // Fallback to English if font loading fails and report is in Arabic
      if (reportLanguage === "ar") {
        effectiveLang = "en";
        toast({
          title: language === "ar" ? "خطأ" : "Error",
          description: language === "ar" ? "فشل تحميل الخط العربي، سيتم التصدير بالإنجليزية" : "Failed to load Arabic font, exporting in English",
          variant: "destructive"
        });
      }
    }
    
    const isArabic = effectiveLang === "ar";
    
    // Helper function to check if text contains Arabic characters
    const hasArabicText = (text: string): boolean => {
      return /[\u0600-\u06FF]/.test(text);
    };

    // Helper function to process Arabic text for PDF (reshape for RTL)
    const processText = (text: string): string => {
      if (!text) return text;
      // Reshape Arabic text only for Arabic reports (UI text)
      if (hasArabicText(text) && isArabic) {
        try {
          return ArabicReshaper.convertArabic(text);
        } catch (error) {
          console.warn('Failed to reshape Arabic text:', text, error);
          return text;
        }
      }
      return text;
    };
    
    // Helper function to reshape Arabic text for mixed-language content (platform names, etc.)
    const reshapeArabic = (text: string): string => {
      if (!text || !hasArabicText(text)) return text;
      try {
        return ArabicReshaper.convertArabic(text);
      } catch (error) {
        console.warn('Failed to reshape Arabic text:', text, error);
        return text;
      }
    };
    
    // Translation function that automatically reshapes Arabic text for PDF
    const tr = (key: string) => processText(getReportTranslation(key, effectiveLang));
    
    let yPos = 15;
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    if (isArabic) {
      doc.text(tr("report.portfolioReport"), pageWidth - 15, yPos, { align: 'right' });
    } else {
      doc.text(tr("report.portfolioReport"), 15, yPos);
    }
    yPos += 10;

    // Metadata
    doc.setFontSize(10);
    const xPos = isArabic ? pageWidth - 15 : 15;
    const textAlign = isArabic ? { align: 'right' as const } : undefined;
    
    doc.text(`${tr("report.generated")}: ${new Date().toLocaleDateString()}`, xPos, yPos, textAlign);
    yPos += 5;
    doc.text(`${tr("report.dateRange")}: ${processText(getDateRangeLabel(effectiveLang))}`, xPos, yPos, textAlign);
    yPos += 5;
    const platformNameInMetadata = platformFilter === "all" 
      ? tr("report.allPlatforms") 
      : processText(platforms.find(p => p.id === platformFilter)?.name || "");
    doc.text(`${tr("report.platform")}: ${platformNameInMetadata}`, xPos, yPos, textAlign);
    yPos += 10;

    // Portfolio Summary
    if (includeMetrics) {
      doc.setFontSize(14);
      doc.text(tr("report.portfolioSummary"), xPos, yPos, textAlign);
      yPos += 7;

      const summaryData = [
        [tr("report.portfolioValue"), formatCurrency(metrics.portfolioValue)],
        [tr("report.totalCash"), formatCurrency(metrics.totalCash)],
        [tr("report.cashRatio"), formatPercentage(metrics.cashRatio)],
        [tr("report.expectedReturns"), formatCurrency(metrics.expectedReturns)],
        [tr("report.actualReturns"), formatCurrency(metrics.actualReturns)],
        [tr("report.historicalAPR"), formatPercentage(metrics.weightedAPR)],
        [tr("report.portfolioROI"), formatPercentage(metrics.portfolioROI)],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [[tr("report.metric"), tr("report.value")]],
        body: summaryData,
        theme: 'grid',
        styles: { fontSize: 9, halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: 'normal' },
        headStyles: { fillColor: [41, 128, 185], halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: isArabic ? 'normal' : 'bold' },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;
    }

    // Investment Status
    if (includeMetrics && yPos < 250) {
      doc.setFontSize(14);
      doc.text(tr("report.investmentStatus"), xPos, yPos, textAlign);
      yPos += 7;

      const statusData = [
        [tr("report.totalInvestments"), metrics.totalInvestments.toString()],
        [tr("report.activeInvestments"), metrics.activeInvestments.toString()],
        [tr("report.completedInvestments"), metrics.completedInvestments.toString()],
        [tr("report.lateInvestments"), metrics.lateInvestments.toString()],
        [tr("report.defaultedInvestments"), metrics.defaultedInvestments.toString()],
      ];

      autoTable(doc, {
        startY: yPos,
        head: [[tr("report.statusColumn"), tr("report.countColumn")]],
        body: statusData,
        theme: 'grid',
        styles: { fontSize: 9, halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: 'normal' },
        headStyles: { fillColor: [52, 152, 219], halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: isArabic ? 'normal' : 'bold' },
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
      doc.text(tr("report.platformDistribution"), xPos, yPos, textAlign);
      yPos += 7;

      const platformData = metrics.platformDistribution.map(p => [
        reshapeArabic(p.platformName), // Reshape Arabic platform names
        formatCurrency(p.value),
        p.count.toString(),
        formatPercentage(p.percentage)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [[tr("report.platformColumn"), tr("report.value"), tr("report.countColumn"), tr("report.percentageColumn")]],
        body: platformData,
        theme: 'grid',
        styles: { fontSize: 9, halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: 'normal' },
        headStyles: { fillColor: [46, 204, 113], halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: isArabic ? 'normal' : 'bold' },
        didParseCell: (data) => {
          // For English reports, use Arabic font for cells containing Arabic text
          if (!isArabic && arabicFontLoaded && data.section === 'body' && data.column.index === 0) {
            const cellText = data.cell.raw as string;
            if (cellText && hasArabicText(cellText)) {
              data.cell.styles.font = 'NotoSansArabic';
              data.cell.styles.fontStyle = 'normal';
            }
          }
        }
      });
    }

    // Investments Table (if included and space available)
    if (includeInvestments && investments.length > 0) {
      doc.addPage();
      yPos = 15;

      doc.setFontSize(14);
      doc.text(tr("report.investmentDetails"), xPos, yPos, textAlign);
      yPos += 7;

      const filteredInvs = platformFilter === "all" 
        ? investments 
        : investments.filter(inv => inv.platformId === platformFilter);

      const invData = filteredInvs.slice(0, 20).map(inv => {
        // Use investment number instead of name to avoid Arabic text issues
        const investmentLabel = inv.investmentNumber 
          ? `${tr("investments.number")}${inv.investmentNumber}`
          : reshapeArabic(inv.name);
        
        return [
          reshapeArabic(inv.platform?.name || "N/A"), // Reshape Arabic platform names
          investmentLabel, // Use investment number or fallback to reshaped name
          formatCurrency(parseFloat(inv.faceValue)),
          new Date(inv.startDate).toLocaleDateString(),
          formatPercentage(parseFloat(inv.expectedIrr)),
          processText(translateValue(inv.status, effectiveLang))
        ];
      });

      autoTable(doc, {
        startY: yPos,
        head: [[tr("report.platformColumn"), tr("report.nameColumn"), tr("report.amountColumn"), tr("report.startDateColumn"), tr("report.expectedIRRColumn"), tr("report.statusColumn")]],
        body: invData,
        theme: 'striped',
        styles: { fontSize: 8, halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: 'normal' },
        headStyles: { fillColor: [231, 76, 60], halign: isArabic ? 'right' : 'left', font: isArabic ? 'NotoSansArabic' : 'helvetica', fontStyle: isArabic ? 'normal' : 'bold' },
        didParseCell: (data) => {
          // For English reports, use Arabic font for cells containing Arabic text (platform and investment names)
          if (!isArabic && arabicFontLoaded && data.section === 'body' && (data.column.index === 0 || data.column.index === 1)) {
            const cellText = data.cell.raw as string;
            if (cellText && hasArabicText(cellText)) {
              data.cell.styles.font = 'NotoSansArabic';
              data.cell.styles.fontStyle = 'normal';
            }
          }
        }
      });
    }

    // Save PDF
    const filename = `AZ_Finance_Report_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(filename);
  };

  const getDateRangeLabel = (lang: "en" | "ar" = reportLanguage) => {
    const tr = (key: string) => getReportTranslation(key, lang);
    switch (dateRange) {
      case "all": return tr("report.rangeAll");
      case "ytd": return tr("report.rangeYTD");
      case "lastYear": return tr("report.rangeLastYear");
      case "lastQuarter": return tr("report.rangeLastQuarter");
      case "lastMonth": return tr("report.rangeLastMonth");
      default: return tr("report.rangeAll");
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Page Header */}
      <PageHeader
        title={language === "ar" ? "التقارير المالية" : "Financial Reports"}
        gradient
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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

            {/* Report Language */}
            <div className="space-y-2">
              <Label>{language === "ar" ? "لغة التقرير" : "Report Language"}</Label>
              <Select value={reportLanguage} onValueChange={(v: "en" | "ar") => setReportLanguage(v)}>
                <SelectTrigger data-testid="select-report-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
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
            <div className="space-y-3">
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
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
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
                            {language === "ar" ? "العائد السنوي النشط" : "Active Annual Return"}
                          </div>
                          <div className="text-xl font-bold text-primary">
                            {formatPercentage(metrics.activeAPR)}
                          </div>
                        </div>

                        <div className="p-4 rounded-lg bg-muted/50">
                          <div className="text-sm text-muted-foreground mb-1">
                            {language === "ar" ? "متوسط العائد السنوي التاريخي" : "Historical Average APR"}
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
