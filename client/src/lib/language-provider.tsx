import { createContext, useContext, useState, useEffect } from "react";

type Language = "en" | "ar";

type LanguageProviderProps = {
  children: React.ReactNode;
  defaultLanguage?: Language;
};

type LanguageProviderState = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
};

const LanguageProviderContext = createContext<LanguageProviderState | undefined>(undefined);

// Translation dictionaries
const translations = {
  en: {
    // Common
    "app.name": "A.Z Finance Hub",
    "app.subtitle": "Vision 2040",
    "app.copyright": "© 2025 A.Z Finance",
    
    // Navigation
    "nav.dashboard": "Dashboard",
    "nav.investments": "Investments",
    "nav.cashflows": "Cashflows",
    "nav.analytics": "Analytics",
    "nav.timeline": "Timeline",
    "nav.alerts": "Alerts",
    
    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.subtitle": "Welcome to your personal investment management hub",
    "dashboard.totalCapital": "Total Capital",
    "dashboard.totalReturns": "Total Returns",
    "dashboard.averageIrr": "Average IRR",
    "dashboard.progressTo2040": "Progress to 2040",
    "dashboard.portfolioPerformance": "Portfolio Performance",
    "dashboard.upcomingCashflows": "Upcoming Cashflows",
    "dashboard.recentInvestments": "Recent Investments",
    "dashboard.noDataYet": "No data available yet",
    
    // Investments
    "investments.title": "Investments",
    "investments.subtitle": "Manage your investment portfolio across multiple platforms",
    "investments.addInvestment": "Add Investment",
    "investments.noInvestmentsYet": "No investments yet",
    "investments.noInvestmentsDesc": "Start building your portfolio by adding your first investment opportunity",
    "investments.addFirstInvestment": "Add Your First Investment",
    "investments.editInvestment": "Edit Investment",
    "investments.amount": "Amount",
    "investments.irr": "Expected IRR",
    "investments.startDate": "Start Date",
    "investments.endDate": "End Date",
    "investments.status": "Status",
    "investments.riskScore": "Risk Score",
    "investments.daysRemaining": "days remaining",
    "investments.active": "Active",
    "investments.completed": "Completed",
    "investments.pending": "Pending",
    
    // Cashflows
    "cashflows.title": "Cashflows",
    "cashflows.subtitle": "Track all profit distributions and returns from your investments",
    "cashflows.totalReceived": "Total Received",
    "cashflows.expectedThisQuarter": "Expected This Quarter",
    "cashflows.allCashflows": "All Cashflows",
    "cashflows.date": "Date",
    "cashflows.investment": "Investment",
    "cashflows.platform": "Platform",
    "cashflows.amount": "Amount",
    "cashflows.status": "Status",
    "cashflows.type": "Type",
    "cashflows.received": "Received",
    "cashflows.expected": "Expected",
    "cashflows.upcoming": "Upcoming",
    "cashflows.profit": "Profit",
    "cashflows.principal": "Principal",
    "cashflows.noCashflows": "No cashflows recorded yet",
    "cashflows.inDays": "in {0} days",
    
    // Analytics
    "analytics.title": "Analytics",
    "analytics.subtitle": "Deep insights into your portfolio performance and projections",
    "analytics.returns": "Returns",
    "analytics.allocation": "Allocation",
    "analytics.goals": "Goals",
    "analytics.monthlyReturnsTrend": "Monthly Returns Trend",
    "analytics.portfolioAllocation": "Portfolio Allocation by Platform",
    "analytics.performanceVsTarget": "Performance vs 2040 Target",
    
    // Timeline
    "timeline.title": "Timeline",
    "timeline.subtitle": "Complete history of all investment activities and transactions",
    "timeline.noActivity": "No activity yet",
    "timeline.noActivityDesc": "Your investment timeline will appear here as you add investments and receive distributions",
    "timeline.investmentStarted": "Investment Started",
    "timeline.investmentMatured": "Investment Matured",
    "timeline.profitReceived": "Profit Distribution Received",
    "timeline.newInvestment": "New investment in {0}",
    "timeline.matured": "{0} reached maturity",
    "timeline.payment": "{0} payment received",
    "timeline.investment": "Investment",
    "timeline.cashflow": "Cashflow",
    "timeline.maturity": "Maturity",
    
    // Alerts
    "alerts.title": "Alerts",
    "alerts.subtitle": "Stay updated with important notifications and events",
    "alerts.unread": "{0} unread",
    "alerts.noAlertsYet": "No alerts yet",
    "alerts.noAlertsDesc": "You'll receive notifications here for distributions, maturities, and important events",
    "alerts.markAsRead": "Mark as read",
    "alerts.distribution": "distribution",
    "alerts.maturity": "maturity",
    "alerts.opportunity": "opportunity",
    "alerts.risk": "risk",
    "alerts.success": "Success",
    "alerts.warning": "Warning",
    "alerts.error": "Error",
    "alerts.info": "Info",
    
    // Dialog
    "dialog.addInvestment": "Add New Investment",
    "dialog.editInvestment": "Edit Investment",
    "dialog.addInvestmentDesc": "Enter the details of your new investment opportunity",
    "dialog.editInvestmentDesc": "Update the details of your investment",
    "dialog.platform": "Platform",
    "dialog.selectPlatform": "Select a platform",
    "dialog.investmentName": "Investment Name",
    "dialog.investmentNamePlaceholder": "e.g., Sukuk 2025-A",
    "dialog.amountSAR": "Amount (SAR)",
    "dialog.expectedIRR": "Expected IRR (%)",
    "dialog.distributionFrequency": "Distribution Frequency",
    "dialog.quarterly": "Quarterly",
    "dialog.semiAnnual": "Semi-Annual",
    "dialog.annual": "Annual",
    "dialog.cancel": "Cancel",
    "dialog.save": "Save",
    "dialog.saving": "Saving...",
    "dialog.update": "Update Investment",
    "dialog.add": "Add Investment",
    "dialog.error": "Error",
    "dialog.createError": "Failed to create investment",
    "dialog.updateError": "Failed to update investment",
    
    // Export
    "export.report": "Export",
    "export.monthly": "Monthly Report",
    "export.quarterly": "Quarterly Report",
  },
  ar: {
    // Common
    "app.name": "مركز A.Z المالي",
    "app.subtitle": "رؤية 2040",
    "app.copyright": "© 2025 A.Z المالية",
    
    // Navigation
    "nav.dashboard": "لوحة التحكم",
    "nav.investments": "الاستثمارات",
    "nav.cashflows": "التدفقات النقدية",
    "nav.analytics": "التحليلات",
    "nav.timeline": "الخط الزمني",
    "nav.alerts": "التنبيهات",
    
    // Dashboard
    "dashboard.title": "لوحة التحكم",
    "dashboard.subtitle": "مرحباً بك في مركز إدارة الاستثمارات الشخصي",
    "dashboard.totalCapital": "رأس المال الإجمالي",
    "dashboard.totalReturns": "إجمالي العوائد",
    "dashboard.averageIrr": "متوسط العائد الداخلي",
    "dashboard.progressTo2040": "التقدم نحو 2040",
    "dashboard.portfolioPerformance": "أداء المحفظة",
    "dashboard.upcomingCashflows": "التدفقات القادمة",
    "dashboard.recentInvestments": "الاستثمارات الأخيرة",
    "dashboard.noDataYet": "لا توجد بيانات متاحة بعد",
    
    // Investments
    "investments.title": "الاستثمارات",
    "investments.subtitle": "إدارة محفظة استثماراتك عبر منصات متعددة",
    "investments.addInvestment": "إضافة استثمار",
    "investments.noInvestmentsYet": "لا توجد استثمارات بعد",
    "investments.noInvestmentsDesc": "ابدأ ببناء محفظتك بإضافة أول فرصة استثمارية",
    "investments.addFirstInvestment": "أضف استثمارك الأول",
    "investments.editInvestment": "تعديل الاستثمار",
    "investments.amount": "المبلغ",
    "investments.irr": "العائد المتوقع",
    "investments.startDate": "تاريخ البداية",
    "investments.endDate": "تاريخ النهاية",
    "investments.status": "الحالة",
    "investments.riskScore": "درجة المخاطرة",
    "investments.daysRemaining": "أيام متبقية",
    "investments.active": "نشط",
    "investments.completed": "مكتمل",
    "investments.pending": "قيد الانتظار",
    
    // Cashflows
    "cashflows.title": "التدفقات النقدية",
    "cashflows.subtitle": "تتبع جميع توزيعات الأرباح والعوائد من استثماراتك",
    "cashflows.totalReceived": "إجمالي المستلم",
    "cashflows.expectedThisQuarter": "المتوقع هذا الربع",
    "cashflows.allCashflows": "جميع التدفقات",
    "cashflows.date": "التاريخ",
    "cashflows.investment": "الاستثمار",
    "cashflows.platform": "المنصة",
    "cashflows.amount": "المبلغ",
    "cashflows.status": "الحالة",
    "cashflows.type": "النوع",
    "cashflows.received": "مستلم",
    "cashflows.expected": "متوقع",
    "cashflows.upcoming": "قادم",
    "cashflows.profit": "ربح",
    "cashflows.principal": "رأس المال",
    "cashflows.noCashflows": "لا توجد تدفقات مسجلة بعد",
    "cashflows.inDays": "خلال {0} أيام",
    
    // Analytics
    "analytics.title": "التحليلات",
    "analytics.subtitle": "رؤى عميقة حول أداء محفظتك وتوقعاتها",
    "analytics.returns": "العوائد",
    "analytics.allocation": "التوزيع",
    "analytics.goals": "الأهداف",
    "analytics.monthlyReturnsTrend": "اتجاه العوائد الشهرية",
    "analytics.portfolioAllocation": "توزيع المحفظة حسب المنصة",
    "analytics.performanceVsTarget": "الأداء مقابل هدف 2040",
    
    // Timeline
    "timeline.title": "الخط الزمني",
    "timeline.subtitle": "سجل كامل لجميع الأنشطة الاستثمارية والمعاملات",
    "timeline.noActivity": "لا توجد أنشطة بعد",
    "timeline.noActivityDesc": "سيظهر خطك الزمني هنا عند إضافة استثمارات واستلام توزيعات",
    "timeline.investmentStarted": "بدء استثمار",
    "timeline.investmentMatured": "استحقاق استثمار",
    "timeline.profitReceived": "استلام توزيع أرباح",
    "timeline.newInvestment": "استثمار جديد في {0}",
    "timeline.matured": "{0} وصل للاستحقاق",
    "timeline.payment": "استلام دفعة {0}",
    "timeline.investment": "استثمار",
    "timeline.cashflow": "تدفق نقدي",
    "timeline.maturity": "استحقاق",
    
    // Alerts
    "alerts.title": "التنبيهات",
    "alerts.subtitle": "ابق على اطلاع بالإشعارات والأحداث المهمة",
    "alerts.unread": "{0} غير مقروء",
    "alerts.noAlertsYet": "لا توجد تنبيهات بعد",
    "alerts.noAlertsDesc": "ستتلقى إشعارات هنا للتوزيعات والاستحقاقات والأحداث المهمة",
    "alerts.markAsRead": "تحديد كمقروء",
    "alerts.distribution": "توزيع",
    "alerts.maturity": "استحقاق",
    "alerts.opportunity": "فرصة",
    "alerts.risk": "خطر",
    "alerts.success": "نجاح",
    "alerts.warning": "تحذير",
    "alerts.error": "خطأ",
    "alerts.info": "معلومات",
    
    // Dialog
    "dialog.addInvestment": "إضافة استثمار جديد",
    "dialog.editInvestment": "تعديل الاستثمار",
    "dialog.addInvestmentDesc": "أدخل تفاصيل فرصتك الاستثمارية الجديدة",
    "dialog.editInvestmentDesc": "تحديث تفاصيل استثمارك",
    "dialog.platform": "المنصة",
    "dialog.selectPlatform": "اختر منصة",
    "dialog.investmentName": "اسم الاستثمار",
    "dialog.investmentNamePlaceholder": "مثال: صكوك 2025-أ",
    "dialog.amountSAR": "المبلغ (ريال سعودي)",
    "dialog.expectedIRR": "العائد المتوقع (%)",
    "dialog.distributionFrequency": "تكرار التوزيع",
    "dialog.quarterly": "ربع سنوي",
    "dialog.semiAnnual": "نصف سنوي",
    "dialog.annual": "سنوي",
    "dialog.cancel": "إلغاء",
    "dialog.save": "حفظ",
    "dialog.saving": "جاري الحفظ...",
    "dialog.update": "تحديث الاستثمار",
    "dialog.add": "إضافة استثمار",
    "dialog.error": "خطأ",
    "dialog.createError": "فشل إنشاء الاستثمار",
    "dialog.updateError": "فشل تحديث الاستثمار",
    
    // Export
    "export.report": "تصدير",
    "export.monthly": "تقرير شهري",
    "export.quarterly": "تقرير ربع سنوي",
  },
};

export function LanguageProvider({ children, defaultLanguage = "en" }: LanguageProviderProps) {
  const [language, setLanguage] = useState<Language>(
    () => (localStorage.getItem("language") as Language) || defaultLanguage
  );

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("lang", language);
    root.setAttribute("dir", language === "ar" ? "rtl" : "ltr");
    localStorage.setItem("language", language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageProviderContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
