import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useLanguage } from "@/lib/language-provider";
import { BookOpen, Lightbulb, BarChart3, DollarSign, Building2, TrendingUp, Settings2 } from "lucide-react";

export default function Help() {
  const { t } = useLanguage();

  const sections = [
    {
      icon: BookOpen,
      title: t("help.gettingStarted"),
      description: t("help.gettingStartedDesc"),
      items: [
        { title: t("help.addingInvestments"), content: t("help.addingInvestmentsDesc") },
        { title: t("help.trackingCashflows"), content: t("help.trackingCashflowsDesc") },
        { title: t("help.reinvesting"), content: t("help.reinvestingDesc") },
      ]
    },
    {
      icon: TrendingUp,
      title: t("help.features"),
      description: t("help.featuresDesc"),
      items: [
        { title: t("help.proLiteMode"), content: t("help.proLiteModeDesc") },
        { title: t("help.delayTracking"), content: t("help.delayTrackingDesc") },
        { title: t("help.quickInput"), content: t("help.quickInputDesc") },
        { title: t("help.bilingualSupport"), content: t("help.bilingualSupportDesc") },
      ]
    },
    {
      icon: BarChart3,
      title: t("help.metrics"),
      description: t("help.metricsDesc"),
      items: [
        { title: t("help.totalCapital"), content: t("help.totalCapitalDesc") },
        { title: t("help.totalReturns"), content: t("help.totalReturnsDesc") },
        { title: t("help.averageIRR"), content: t("help.averageIRRDesc") },
        { title: t("help.progressTo2040"), content: t("help.progressTo2040Desc") },
        { title: t("help.availableCash"), content: t("help.availableCashDesc") },
        { title: t("help.distressedInvestments"), content: t("help.distressedInvestmentsDesc") },
      ]
    },
    {
      icon: Building2,
      title: t("help.platforms"),
      description: t("help.platformsDesc"),
      items: [
        { title: t("help.sukuk"), content: t("help.sukukDesc") },
        { title: t("help.manfaa"), content: t("help.manfaaDesc") },
        { title: t("help.lendo"), content: t("help.lendoDesc") },
        { title: t("help.addCustomPlatform"), content: t("help.addCustomPlatformDesc") },
      ]
    },
    {
      icon: Settings2,
      title: t("help.settings"),
      description: t("help.settingsDesc"),
      items: [
        { title: t("help.appearance"), content: t("help.appearanceDesc") },
        { title: t("help.languageSettings"), content: t("help.languageSettingsDesc") },
        { title: t("help.investmentGoalsSettings"), content: t("help.investmentGoalsSettingsDesc") },
        { title: t("help.platformManagement"), content: t("help.platformManagementDesc") },
      ]
    },
    {
      icon: Lightbulb,
      title: t("help.tips"),
      description: t("help.tipsDesc"),
      items: [
        { title: t("help.tip1"), content: t("help.tip1Desc") },
        { title: t("help.tip2"), content: t("help.tip2Desc") },
        { title: t("help.tip3"), content: t("help.tip3Desc") },
        { title: t("help.tip4"), content: t("help.tip4Desc") },
        { title: t("help.tip5"), content: t("help.tip5Desc") },
      ]
    },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-help-title">{t("help.title")}</h1>
        <p className="text-muted-foreground" data-testid="text-help-subtitle">{t("help.subtitle")}</p>
      </div>

      <div className="grid gap-6">
        {sections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <Card key={sectionIndex} data-testid={`card-help-section-${sectionIndex}`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle>{section.title}</CardTitle>
                    <CardDescription>{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {section.items.map((item, itemIndex) => (
                    <AccordionItem key={itemIndex} value={`item-${sectionIndex}-${itemIndex}`}>
                      <AccordionTrigger 
                        className="text-left font-medium hover:no-underline"
                        data-testid={`accordion-trigger-${sectionIndex}-${itemIndex}`}
                      >
                        {item.title}
                      </AccordionTrigger>
                      <AccordionContent 
                        className="text-muted-foreground leading-relaxed"
                        data-testid={`accordion-content-${sectionIndex}-${itemIndex}`}
                      >
                        {item.content}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("app.name")}
          </CardTitle>
          <CardDescription>{t("app.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("help.gettingStartedDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
