import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  Target,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Zap,
  RefreshCw,
  BarChart3
} from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { motion, AnimatePresence } from "framer-motion";

interface AIRecommendation {
  type: "opportunity" | "warning" | "optimization";
  title: string;
  description: string;
  confidence: number;
  actionItems: string[];
  potentialReturn?: string;
  riskLevel?: "low" | "medium" | "high";
}

interface AIRiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  score: number;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
  recommendations: string[];
}

interface AICashflowForecast {
  period: string;
  predictedAmount: number;
  confidence: number;
  reasoning: string;
}

interface AIInsights {
  recommendations: AIRecommendation[];
  riskAnalysis: AIRiskAnalysis;
  cashflowForecast: AICashflowForecast[];
  marketInsights: string;
  vision2040Progress: {
    currentProgress: number;
    predictedProgress: number;
    suggestions: string[];
  };
}

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export default function SmartAdvisorPage() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");
  
  const { data: insights, isLoading, refetch, isRefetching } = useQuery<AIInsights>({
    queryKey: ["/api/ai/insights"],
    staleTime: 5 * 60 * 1000,
  });

  const handleRefresh = async () => {
    await refetch();
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "opportunity":
        return <TrendingUp className="h-5 w-5 text-chart-2" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "optimization":
        return <Zap className="h-5 w-5 text-chart-1" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getRecommendationColor = (type: string) => {
    switch (type) {
      case "opportunity":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "warning":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "optimization":
        return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      default:
        return "bg-muted";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "text-chart-2";
      case "medium":
        return "text-yellow-500";
      case "high":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "low":
        return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      default:
        return "bg-muted";
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case "positive":
        return <ArrowUpRight className="h-4 w-4 text-chart-2" />;
      case "negative":
        return <ArrowDownRight className="h-4 w-4 text-destructive" />;
      default:
        return <Info className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6" data-testid="page-ai-insights">
      {/* Header with gradient */}
      <div className="relative overflow-hidden rounded-lg border bg-gradient-to-br from-primary/5 via-primary/10 to-chart-2/5 p-6">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              {t("aiInsights.title")}
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("aiInsights.subtitle")}
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefetching || isLoading}
            variant="outline"
            data-testid="button-refresh-insights"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching || isLoading ? 'animate-spin' : ''}`} />
            {t("aiInsights.refresh")}
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto p-1">
          <TabsTrigger value="overview" className="flex items-center gap-2 py-2.5" data-testid="button-tab-overview">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("aiInsights.tabs.overview")}</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex items-center gap-2 py-2.5" data-testid="button-tab-recommendations">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">{t("aiInsights.tabs.recommendations")}</span>
          </TabsTrigger>
          <TabsTrigger value="risk" className="flex items-center gap-2 py-2.5" data-testid="button-tab-risk">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t("aiInsights.tabs.riskAnalysis")}</span>
          </TabsTrigger>
          <TabsTrigger value="forecast" className="flex items-center gap-2 py-2.5" data-testid="button-tab-forecast">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t("aiInsights.tabs.forecast")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
          ) : !insights ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="overview" {...fadeIn} className="space-y-6">
                {/* Vision 2040 Progress */}
                <Card data-testid="card-vision-2040" className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      {t("aiInsights.vision2040")}
                    </CardTitle>
                    <CardDescription>
                      {t("aiInsights.vision2040Description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">
                            {t("aiInsights.currentProgress")}
                          </span>
                          <span className="text-2xl font-bold">
                            {insights.vision2040Progress.currentProgress.toFixed(2)}%
                          </span>
                        </div>
                        <Progress value={insights.vision2040Progress.currentProgress} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-muted-foreground text-sm">
                            {t("aiInsights.predictedProgress")}
                          </span>
                          <span className="text-2xl font-bold text-chart-2">
                            {insights.vision2040Progress.predictedProgress.toFixed(2)}%
                          </span>
                        </div>
                        <Progress value={insights.vision2040Progress.predictedProgress} className="h-2" />
                      </div>
                    </div>
                    
                    {insights.vision2040Progress.suggestions.length > 0 && (
                      <div className="space-y-2 p-4 rounded-lg bg-muted/50">
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          {t("aiInsights.suggestions")}
                        </h4>
                        <ul className="space-y-2">
                          {insights.vision2040Progress.suggestions.map((suggestion, idx) => (
                            <motion.li 
                              key={idx} 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              className="flex items-start gap-2 text-sm"
                            >
                              <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                              <span>{suggestion}</span>
                            </motion.li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Market Insights */}
                {insights.marketInsights && (
                  <Card data-testid="card-market-insights" className="border-chart-1/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Info className="h-5 w-5 text-chart-1" />
                        {t("aiInsights.marketInsights")}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed">{insights.marketInsights}</p>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48" />
              ))}
            </div>
          ) : !insights ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="recommendations" {...fadeIn} className="space-y-4">
                {insights.recommendations.length > 0 ? (
                insights.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card className={`border ${getRecommendationColor(rec.type)}`} data-testid={`recommendation-${idx}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            {getRecommendationIcon(rec.type)}
                            <div>
                              <CardTitle className="text-base">{rec.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {t("aiInsights.confidence")}: {rec.confidence}%
                                </Badge>
                                {rec.riskLevel && (
                                  <Badge variant="outline" className={`text-xs ${getRiskBadgeColor(rec.riskLevel)}`}>
                                    {t(`aiInsights.risk.${rec.riskLevel}`)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {rec.potentialReturn && (
                            <div className="text-right">
                              <p className="text-xs text-muted-foreground">{t("aiInsights.potentialReturn")}</p>
                              <p className="text-sm font-semibold text-chart-2">{rec.potentialReturn}</p>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        {rec.actionItems.length > 0 && (
                          <div className="space-y-2 p-3 rounded-lg bg-muted/30">
                            <h5 className="text-xs font-semibold uppercase text-muted-foreground">
                              {t("aiInsights.actionItems")}
                            </h5>
                            <ul className="space-y-1">
                              {rec.actionItems.map((action, actionIdx) => (
                                <li key={actionIdx} className="flex items-start gap-2 text-sm">
                                  <CheckCircle2 className="h-3.5 w-3.5 text-chart-2 mt-0.5 flex-shrink-0" />
                                  <span>{action}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              ) : (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>
          )}
        </TabsContent>

        {/* Risk Analysis Tab */}
        <TabsContent value="risk" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : !insights ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="risk" {...fadeIn}>
                <Card data-testid="card-risk-analysis" className="border-destructive/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-destructive" />
                      {t("aiInsights.riskAnalysis")}
                    </CardTitle>
                    <CardDescription>
                      {t("aiInsights.riskAnalysisDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Overall Risk */}
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/50 to-muted/30">
                      <div>
                        <p className="text-sm text-muted-foreground">{t("aiInsights.overallRisk")}</p>
                        <p className={`text-2xl font-bold ${getRiskColor(insights.riskAnalysis.overallRisk)}`}>
                          {t(`aiInsights.risk.${insights.riskAnalysis.overallRisk}`)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">{t("aiInsights.riskScore")}</p>
                        <p className="text-2xl font-bold">{insights.riskAnalysis.score}/100</p>
                      </div>
                    </div>

                    {/* Risk Factors */}
                    {insights.riskAnalysis.factors.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">{t("aiInsights.riskFactors")}</h4>
                      {insights.riskAnalysis.factors.map((factor, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover-elevate"
                        >
                          {getImpactIcon(factor.impact)}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{factor.factor}</p>
                            <p className="text-xs text-muted-foreground mt-1">{factor.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Risk Recommendations */}
                  {insights.riskAnalysis.recommendations.length > 0 && (
                    <div className="space-y-2 p-4 rounded-lg bg-chart-2/10">
                      <h4 className="font-semibold text-sm">{t("aiInsights.riskRecommendations")}</h4>
                      <ul className="space-y-2">
                        {insights.riskAnalysis.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
          )}
        </TabsContent>

        {/* Forecast Tab */}
        <TabsContent value="forecast" className="space-y-6">
          {isLoading ? (
            <Skeleton className="h-96" />
          ) : !insights ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
              </CardContent>
            </Card>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key="forecast" {...fadeIn}>
                <Card data-testid="card-cashflow-forecast" className="border-chart-2/20">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-chart-2" />
                      {t("aiInsights.cashflowForecast")}
                    </CardTitle>
                    <CardDescription>
                      {t("aiInsights.cashflowForecastDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {insights.cashflowForecast.length > 0 ? (
                    insights.cashflowForecast.map((forecast, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center justify-between p-4 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent hover-elevate"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">{forecast.period}</p>
                          <p className="text-xs text-muted-foreground mt-1">{forecast.reasoning}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-chart-2">
                            SAR {forecast.predictedAmount.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {forecast.confidence}% {t("aiInsights.confidence")}
                          </p>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">{t("aiInsights.noData")}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
