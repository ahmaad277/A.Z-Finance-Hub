import OpenAI from "openai";
import type { InvestmentWithPlatform, CashflowWithInvestment, PortfolioStats, AnalyticsData } from "../shared/schema";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

export interface AIRecommendation {
  type: "opportunity" | "warning" | "optimization";
  title: string;
  description: string;
  confidence: number;
  actionItems: string[];
  potentialReturn?: string;
  riskLevel?: "low" | "medium" | "high";
}

export interface AIRiskAnalysis {
  overallRisk: "low" | "medium" | "high";
  score: number;
  factors: {
    factor: string;
    impact: "positive" | "negative" | "neutral";
    description: string;
  }[];
  recommendations: string[];
}

export interface AICashflowForecast {
  period: string;
  predictedAmount: number;
  confidence: number;
  reasoning: string;
}

export interface AIInsights {
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

// Helper to create structured prompts
function createPrompt(context: string, question: string): string {
  return `${context}\n\n${question}\n\nProvide your analysis in JSON format.`;
}

// Get AI-powered investment recommendations
export async function getAIRecommendations(
  investments: InvestmentWithPlatform[],
  stats: PortfolioStats,
  analytics: AnalyticsData
): Promise<AIRecommendation[]> {
  const context = `
Portfolio Overview:
- Total Capital: SAR ${stats.totalCapital.toLocaleString()}
- Total Returns: SAR ${stats.totalReturns.toLocaleString()}
- Average IRR: ${stats.averageIrr.toFixed(2)}%
- Available Cash: SAR ${stats.availableCash.toLocaleString()}
- Active Investments: ${investments.filter(i => i.status === 'active').length}
- Platforms: ${Array.from(new Set(investments.map(i => i.platform?.name || 'Unknown').filter(Boolean))).join(', ')}

Current Investments:
${investments.map(inv => `- ${inv.name}: SAR ${inv.amount.toLocaleString()}, IRR: ${inv.expectedIrr}%, Risk: ${inv.riskScore}/10, Platform: ${inv.platform?.name || 'Unknown'}`).join('\n')}

Analytics:
- Monthly Returns Trend: ${analytics.monthlyReturns.slice(-3).map((m: any) => `${m.month}: SAR ${m.amount}`).join(', ')}
- Platform Distribution: ${analytics.platformAllocation.map((p: any) => `${p.platform}: ${p.percentage}%`).join(', ')}
`;

  const prompt = createPrompt(
    context,
    `As a financial advisor specializing in Sukuk and Islamic crowdfunding investments, analyze this portfolio and provide 3-5 actionable recommendations. 
    
Consider:
1. Diversification across platforms (Sukuk, Manfa'a, Lendo)
2. Risk-return optimization
3. Opportunities to reinvest available cash
4. Portfolio rebalancing suggestions
5. Vision 2040 goal alignment

Return JSON in this format:
{
  "recommendations": [
    {
      "type": "opportunity" | "warning" | "optimization",
      "title": "Brief title",
      "description": "Detailed explanation in Arabic",
      "confidence": 0-100,
      "actionItems": ["Action 1", "Action 2"],
      "potentialReturn": "Expected return if applicable",
      "riskLevel": "low" | "medium" | "high"
    }
  ]
}`
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5", // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are an expert Islamic finance advisor specializing in Sukuk and halal crowdfunding investments. Provide insights in Arabic when requested. Always respond with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"recommendations": []}');
    return result.recommendations || [];
  } catch (error) {
    console.error('[AI Service] Error getting recommendations:', error);
    return [];
  }
}

// Get AI-powered risk analysis
export async function getAIRiskAnalysis(
  investments: InvestmentWithPlatform[],
  stats: PortfolioStats
): Promise<AIRiskAnalysis> {
  const context = `
Portfolio Risk Profile:
- Total Investments: ${investments.length}
- Average Risk Score: ${investments.length > 0 ? (investments.reduce((sum, i) => sum + i.riskScore, 0) / investments.length).toFixed(1) : 0}/10
- Platform Distribution: ${Array.from(new Set(investments.map(i => i.platform?.name || 'Unknown').filter(Boolean))).join(', ')}
- Capital Allocation: SAR ${stats.totalCapital.toLocaleString()}
- Distressed Investments: ${stats.distressedInvestments}

Investments by Risk:
${investments.map(inv => `- ${inv.name}: Risk ${inv.riskScore}/10, Amount: SAR ${inv.amount.toLocaleString()}, Status: ${inv.status}`).join('\n')}
`;

  const prompt = createPrompt(
    context,
    `Analyze the risk profile of this Islamic investment portfolio. Provide:

1. Overall risk assessment (low/medium/high)
2. Risk score (0-100)
3. Key risk factors with their impact
4. Specific recommendations to mitigate risks

Return JSON with:
{
  "overallRisk": "low" | "medium" | "high",
  "score": 0-100,
  "factors": [
    {
      "factor": "Factor name",
      "impact": "positive" | "negative" | "neutral",
      "description": "Explanation in Arabic"
    }
  ],
  "recommendations": ["Recommendation 1 in Arabic", "Recommendation 2 in Arabic"]
}`
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are an expert risk analyst for Islamic finance and Sukuk investments. Provide detailed risk assessments in Arabic. Always respond with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    return result as AIRiskAnalysis;
  } catch (error) {
    console.error('[AI Service] Error getting risk analysis:', error);
    return {
      overallRisk: "medium",
      score: 50,
      factors: [],
      recommendations: []
    };
  }
}

// Get AI-powered cashflow forecast
export async function getAICashflowForecast(
  cashflows: CashflowWithInvestment[],
  investments: InvestmentWithPlatform[]
): Promise<AICashflowForecast[]> {
  const context = `
Historical Cashflows:
${cashflows.slice(-10).map(cf => `- ${cf.investment?.name || 'Unknown'}: SAR ${cf.amount.toLocaleString()}, ${cf.type}, ${cf.status}, Date: ${cf.expectedDate}`).join('\n')}

Active Investments with Expected Returns:
${investments.filter(i => i.status === 'active').map(inv => 
  `- ${inv.name}: IRR ${inv.expectedIrr}%, Amount: SAR ${inv.amount.toLocaleString()}, Distribution: ${inv.distributionFrequency}, Maturity: ${inv.maturityDate}`
).join('\n')}
`;

  const prompt = createPrompt(
    context,
    `Based on the historical cashflow patterns and active investments, forecast the expected cashflows for the next 6 months.

Consider:
1. Distribution frequency (quarterly, semi-annual)
2. Expected IRR rates
3. Maturity dates
4. Historical payment patterns

Return JSON array with forecasts:
{
  "forecasts": [
    {
      "period": "Month Year",
      "predictedAmount": number,
      "confidence": 0-100,
      "reasoning": "Explanation in Arabic"
    }
  ]
}`
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a financial forecasting expert for Islamic investments. Provide accurate cashflow predictions with reasoning in Arabic. Always respond with valid JSON."
        },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{"forecasts": []}');
    return result.forecasts || [];
  } catch (error) {
    console.error('[AI Service] Error getting cashflow forecast:', error);
    return [];
  }
}

// Get comprehensive AI insights
export async function getComprehensiveAIInsights(
  investments: InvestmentWithPlatform[],
  cashflows: CashflowWithInvestment[],
  stats: PortfolioStats,
  analytics: AnalyticsData
): Promise<AIInsights> {
  try {
    const [recommendations, riskAnalysis, cashflowForecast] = await Promise.all([
      getAIRecommendations(investments, stats, analytics),
      getAIRiskAnalysis(investments, stats),
      getAICashflowForecast(cashflows, investments)
    ]);

    // Get market insights and Vision 2040 progress
    const context = `
Portfolio Summary:
- Total Capital: SAR ${stats.totalCapital.toLocaleString()}
- Total Returns: SAR ${stats.totalReturns.toLocaleString()}
- Average IRR: ${stats.averageIrr.toFixed(2)}%
- Progress to 2040: ${stats.progressTo2040.toFixed(2)}%
- Active Investments: ${investments.filter(i => i.status === 'active').length}
`;

    const marketPrompt = createPrompt(
      context,
      `Provide:
1. Brief market insights about Saudi Islamic finance and crowdfunding (2-3 sentences in Arabic)
2. Vision 2040 progress analysis with current status and predicted progress
3. Actionable suggestions to accelerate progress toward financial independence by 2040

Return JSON:
{
  "marketInsights": "Market overview in Arabic",
  "vision2040": {
    "currentProgress": ${stats.progressTo2040},
    "predictedProgress": number (0-100),
    "suggestions": ["Suggestion 1 in Arabic", "Suggestion 2 in Arabic"]
  }
}`
    );

    const marketResponse = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        {
          role: "system",
          content: "You are a Saudi Vision 2040 financial advisor. Provide strategic insights in Arabic. Always respond with valid JSON."
        },
        { role: "user", content: marketPrompt }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 8192,
    });

    const marketResult = JSON.parse(marketResponse.choices[0]?.message?.content || '{}');

    return {
      recommendations,
      riskAnalysis,
      cashflowForecast,
      marketInsights: marketResult.marketInsights || "",
      vision2040Progress: marketResult.vision2040 || {
        currentProgress: stats.progressTo2040,
        predictedProgress: stats.progressTo2040,
        suggestions: []
      }
    };
  } catch (error) {
    console.error('[AI Service] Error getting comprehensive insights:', error);
    throw error;
  }
}
