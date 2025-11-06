import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language-provider";
import { Target, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface CalculationResult {
  futureValue: number;
  totalDeposits: number;
  totalReturns: number;
  projections: Array<{ year: number; value: number; deposits: number }>;
}

export function GoalCalculator() {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const [inputs, setInputs] = useState({
    initialAmount: 10000,
    monthlyDeposit: 1000,
    expectedIRR: 12,
    durationYears: 10,
  });

  const [result, setResult] = useState<CalculationResult | null>(null);

  const calculateGoal = () => {
    const { initialAmount, monthlyDeposit, expectedIRR, durationYears } = inputs;
    
    const monthlyRate = expectedIRR / 100 / 12;
    const months = durationYears * 12;
    
    const projections = [];
    let currentValue = initialAmount;
    let totalDepositsAccum = initialAmount;
    
    for (let year = 0; year <= durationYears; year++) {
      if (year === 0) {
        projections.push({
          year: 0,
          value: initialAmount,
          deposits: initialAmount,
        });
      } else {
        for (let month = 1; month <= 12; month++) {
          currentValue = currentValue * (1 + monthlyRate) + monthlyDeposit;
          totalDepositsAccum += monthlyDeposit;
        }
        
        projections.push({
          year,
          value: Math.round(currentValue),
          deposits: Math.round(totalDepositsAccum),
        });
      }
    }
    
    const futureValue = currentValue;
    const totalDeposits = totalDepositsAccum;
    const totalReturns = futureValue - totalDeposits;
    
    setResult({
      futureValue: Math.round(futureValue),
      totalDeposits: Math.round(totalDeposits),
      totalReturns: Math.round(totalReturns),
      projections,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card data-testid="card-goal-calculator">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          {t("calculator.title") || "Investment Goal Calculator"}
        </CardTitle>
        <CardDescription>
          {t("calculator.description") || "Calculate your future investment value based on deposits and returns"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="initial-amount" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              {t("calculator.initialAmount") || "Initial Amount (SAR)"}
            </Label>
            <Input
              id="initial-amount"
              type="number"
              value={inputs.initialAmount}
              onChange={(e) => setInputs({ ...inputs, initialAmount: Number(e.target.value) })}
              data-testid="input-initial-amount"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthly-deposit" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("calculator.monthlyDeposit") || "Monthly Deposit (SAR)"}
            </Label>
            <Input
              id="monthly-deposit"
              type="number"
              value={inputs.monthlyDeposit}
              onChange={(e) => setInputs({ ...inputs, monthlyDeposit: Number(e.target.value) })}
              data-testid="input-monthly-deposit"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expected-irr" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t("calculator.expectedIRR") || "Expected Annual Return (%)"}
            </Label>
            <Input
              id="expected-irr"
              type="number"
              step="0.1"
              value={inputs.expectedIRR}
              onChange={(e) => setInputs({ ...inputs, expectedIRR: Number(e.target.value) })}
              data-testid="input-expected-irr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration-years" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("calculator.durationYears") || "Duration (Years)"}
            </Label>
            <Input
              id="duration-years"
              type="number"
              value={inputs.durationYears}
              onChange={(e) => setInputs({ ...inputs, durationYears: Number(e.target.value) })}
              data-testid="input-duration-years"
            />
          </div>
        </div>

        <Button
          onClick={calculateGoal}
          className="w-full"
          data-testid="button-calculate-goal"
        >
          <Target className="h-4 w-4 mr-2" />
          {t("calculator.calculate") || "Calculate Goal"}
        </Button>

        {result && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.futureValue") || "Future Value"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-chart-2" data-testid="stat-future-value">
                    {formatCurrency(result.futureValue)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.totalDeposits") || "Total Deposits"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary" data-testid="stat-total-deposits">
                    {formatCurrency(result.totalDeposits)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardDescription className="text-xs">
                    {t("calculator.totalReturns") || "Total Returns"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-chart-1" data-testid="stat-total-returns">
                    {formatCurrency(result.totalReturns)}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {t("calculator.projectionChart") || "Investment Projection"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.projections}>
                      <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorDeposits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="year"
                        className="text-xs"
                        label={{
                          value: t("calculator.years") || "Years",
                          position: "insideBottom",
                          offset: -5,
                        }}
                      />
                      <YAxis
                        className="text-xs"
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                      />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      {t("calculator.year") || "Year"} {payload[0].payload.year}
                                    </span>
                                    <span className="font-bold text-chart-2">
                                      {formatCurrency(payload[0].payload.value)}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {t("calculator.deposits") || "Deposits"}: {formatCurrency(payload[0].payload.deposits)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="deposits"
                        stroke="hsl(var(--primary))"
                        fill="url(#colorDeposits)"
                        strokeWidth={2}
                        name={t("calculator.deposits") || "Deposits"}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#colorValue)"
                        strokeWidth={2}
                        name={t("calculator.futureValue") || "Future Value"}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
