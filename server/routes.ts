import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertPlatformSchema,
  insertInvestmentSchema,
  insertCashflowSchema,
  insertAlertSchema,
  insertUserSettingsSchema,
  insertCashTransactionSchema,
  insertSavedScenarioSchema,
  apiCustomDistributionSchema,
  type ApiCustomDistribution,
} from "@shared/schema";
import { generateCashflows, type DistributionFrequency, type ProfitPaymentStructure } from "@shared/cashflow-generator";

// API schema that accepts date strings and coerces to Date objects with validation
const apiInvestmentSchema = insertInvestmentSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  customDistributions: z.array(apiCustomDistributionSchema).optional(),
}).superRefine((data, ctx) => {
  // If frequency is custom, require customDistributions array
  if (data.distributionFrequency === 'custom') {
    if (!data.customDistributions || data.customDistributions.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Custom distribution schedule is required when frequency is 'custom'",
        path: ['customDistributions'],
      });
    }
    
    // Validate each distribution
    data.customDistributions?.forEach((dist, idx) => {
      const amount = typeof dist.amount === 'string' ? parseFloat(dist.amount) : dist.amount;
      if (amount <= 0 || isNaN(amount)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Amount must be positive",
          path: ['customDistributions', idx, 'amount'],
        });
      }
      
      // Validate dates within investment window
      if (dist.dueDate < data.startDate || dist.dueDate > data.endDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due date must be within investment period",
          path: ['customDistributions', idx, 'dueDate'],
        });
      }
    });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {

  // Platforms
  app.get("/api/platforms", async (_req, res) => {
    try {
      const platforms = await storage.getPlatforms();
      res.json(platforms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch platforms" });
    }
  });

  app.post("/api/platforms", async (req, res) => {
    try {
      const data = insertPlatformSchema.parse(req.body);
      const platform = await storage.createPlatform(data);
      res.status(201).json(platform);
    } catch (error) {
      res.status(400).json({ error: "Invalid platform data" });
    }
  });

  app.delete("/api/platforms/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deletePlatform(id);
      
      if (!success) {
        return res.status(404).json({ error: "Platform not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Platform deletion error:", error);
      if (error.message?.includes('Cannot delete platform')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to delete platform" });
    }
  });

  // Investments
  app.get("/api/investments", async (_req, res) => {
    try {
      const investments = await storage.getInvestments();
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const data = apiInvestmentSchema.parse(req.body);
      
      // Extract customDistributions if provided
      const { customDistributions, ...investmentData } = data;
      
      // Create investment with custom distributions
      const investment = await storage.createInvestment(investmentData, customDistributions);
      res.status(201).json(investment);
    } catch (error: any) {
      console.error("Investment creation error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  });

  app.patch("/api/investments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Create a partial schema with validation
      const partialInvestmentSchema = insertInvestmentSchema.extend({
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
        customDistributions: z.array(apiCustomDistributionSchema).optional(),
      }).partial().superRefine((data, ctx) => {
        // If changing frequency to custom, require customDistributions
        if (data.distributionFrequency === 'custom' && (!data.customDistributions || data.customDistributions.length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Custom distribution schedule is required when changing frequency to 'custom'",
            path: ['customDistributions'],
          });
        }
        
        // If customDistributions provided, require dates for validation
        if (data.customDistributions && data.customDistributions.length > 0) {
          if (!data.startDate || !data.endDate) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "startDate and endDate are required when updating custom distributions",
              path: ['customDistributions'],
            });
            return; // Skip further validation if dates missing
          }
          
          // Validate each distribution
          data.customDistributions.forEach((dist, idx) => {
            const amount = typeof dist.amount === 'string' ? parseFloat(dist.amount) : dist.amount;
            if (amount <= 0 || isNaN(amount)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Amount must be positive",
                path: ['customDistributions', idx, 'amount'],
              });
            }
            
            // Validate dates within investment window
            if (dist.dueDate < data.startDate! || dist.dueDate > data.endDate!) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Due date must be within investment period",
                path: ['customDistributions', idx, 'dueDate'],
              });
            }
          });
        }
      });
      
      const data = partialInvestmentSchema.parse(req.body);
      
      // Extract customDistributions if provided
      const { customDistributions, ...investmentData } = data;
      
      const investment = await storage.updateInvestment(id, investmentData, customDistributions);
      
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.json(investment);
    } catch (error: any) {
      console.error("Investment update error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  });

  app.delete("/api/investments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteInvestment(id);
      
      if (!success) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Investment deletion error:", error);
      res.status(500).json({ error: "Failed to delete investment" });
    }
  });

  // Preview cashflows for investment (before creation)
  app.post("/api/investments/preview-cashflows", async (req, res) => {
    try {
      const previewSchema = z.object({
        startDate: z.coerce.date(),
        endDate: z.coerce.date(),
        faceValue: z.coerce.number().positive(),
        totalExpectedProfit: z.coerce.number().nonnegative(),
        distributionFrequency: z.enum(['monthly', 'quarterly', 'semi_annually', 'annually', 'at_maturity']),
        profitPaymentStructure: z.enum(['periodic', 'at_maturity']).default('periodic'),
      });

      const data = previewSchema.parse(req.body);
      
      const previewCashflows = generateCashflows({
        startDate: data.startDate,
        endDate: data.endDate,
        faceValue: data.faceValue,
        totalExpectedProfit: data.totalExpectedProfit,
        distributionFrequency: data.distributionFrequency as DistributionFrequency,
        profitPaymentStructure: data.profitPaymentStructure as ProfitPaymentStructure,
      });

      res.json(previewCashflows);
    } catch (error: any) {
      console.error("Cashflow preview error:", error);
      res.status(400).json({ error: error.message || "Invalid preview parameters" });
    }
  });

  // Cashflows
  app.get("/api/cashflows", async (_req, res) => {
    try {
      const cashflows = await storage.getCashflows();
      res.json(cashflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashflows" });
    }
  });

  app.post("/api/cashflows", async (req, res) => {
    try {
      const data = insertCashflowSchema.parse(req.body);
      const cashflow = await storage.createCashflow(data);
      res.status(201).json(cashflow);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid cashflow data" });
    }
  });

  app.patch("/api/cashflows/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const data = insertCashflowSchema.partial().parse(req.body);
      const cashflow = await storage.updateCashflow(id, data);
      
      if (!cashflow) {
        return res.status(404).json({ error: "Cashflow not found" });
      }

      res.json(cashflow);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid cashflow data" });
    }
  });

  app.delete("/api/cashflows/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteCashflow(id);
      
      if (!success) {
        return res.status(404).json({ error: "Cashflow not found" });
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Cashflow deletion error:", error);
      res.status(500).json({ error: "Failed to delete cashflow" });
    }
  });

  // Alerts
  app.get("/api/alerts", async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.markAlertAsRead(id);
      
      if (!alert) {
        return res.status(404).json({ error: "Alert not found" });
      }

      res.json(alert);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark alert as read" });
    }
  });

  app.post("/api/alerts/generate", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      
      if (!settings || !settings.alertsEnabled) {
        return res.json({ message: "Alerts disabled", generatedCount: 0 });
      }

      const allCashflows = await storage.getCashflows();
      const allInvestments = await storage.getInvestments();
      const cashflows = allCashflows.map(cf => {
        const investment = allInvestments.find(inv => inv.id === cf.investmentId);
        return { ...cf, investment };
      }).filter(cf => cf.investment);
      const alerts = await storage.getAlerts();
      const now = new Date();
      const generatedAlerts: any[] = [];

      for (const cashflow of cashflows) {
        if (cashflow.status === 'received' || !cashflow.dueDate || !cashflow.investment) continue;

        const dueDate = new Date(cashflow.dueDate);
        const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        const alertKey = `cashflow-${cashflow.id}`;
        const existingAlert = alerts.find(a => 
          a.message.includes(alertKey) || 
          (a.investmentId === cashflow.investmentId && a.message.includes(cashflow.type))
        );
        
        if (existingAlert) continue;

        if (daysDiff < 0 && settings.latePaymentAlertsEnabled) {
          const alert = await storage.createAlert({
            type: 'distribution',
            title: 'Late Payment Alert',
            message: `${alertKey}: ${cashflow.type} payment for ${cashflow.investment.name} is overdue by ${Math.abs(daysDiff)} days`,
            investmentId: cashflow.investmentId,
            severity: 'error',
            read: 0,
          });
          generatedAlerts.push(alert);
        }
        else if (daysDiff >= 0 && daysDiff <= settings.alertDaysBefore) {
          const alert = await storage.createAlert({
            type: 'distribution',
            title: 'Upcoming Payment',
            message: `${alertKey}: ${cashflow.type} payment for ${cashflow.investment.name} is due in ${daysDiff} days`,
            investmentId: cashflow.investmentId,
            severity: daysDiff <= 3 ? 'warning' : 'info',
            read: 0,
          });
          generatedAlerts.push(alert);
        }
      }

      res.json({ 
        message: "Alerts generated successfully", 
        generatedCount: generatedAlerts.length,
        alerts: generatedAlerts 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to generate alerts" });
    }
  });

  // Cash Transactions
  app.get("/api/cash/transactions", async (_req, res) => {
    try {
      const transactions = await storage.getCashTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash transactions" });
    }
  });

  app.post("/api/cash/transactions", async (req, res) => {
    try {
      const data = insertCashTransactionSchema.parse(req.body);
      const transaction = await storage.createCashTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  });

  app.get("/api/cash/balance", async (_req, res) => {
    try {
      const balance = await storage.getCashBalance();
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash balance" });
    }
  });

  // Portfolio Stats
  app.get("/api/portfolio/stats", async (_req, res) => {
    try {
      const stats = await storage.getPortfolioStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio stats" });
    }
  });

  // Analytics
  app.get("/api/analytics", async (_req, res) => {
    try {
      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    try {
      const data = insertUserSettingsSchema.partial().parse(req.body);
      const settings = await storage.updateSettings(data);
      res.json(settings);
    } catch (error: any) {
      console.error("Settings update error:", error);
      res.status(400).json({ error: error.message || "Invalid settings data" });
    }
  });

  // Saved Scenarios
  app.get("/api/saved-scenarios", async (req, res) => {
    try {
      const scenarios = await storage.getSavedScenarios();
      res.json(scenarios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved scenarios" });
    }
  });

  app.post("/api/saved-scenarios", async (req, res) => {
    try {
      const data = insertSavedScenarioSchema.parse(req.body);
      const scenario = await storage.createSavedScenario(data);
      res.json(scenario);
    } catch (error: any) {
      console.error("Create scenario error:", error);
      if (error.message?.includes("Maximum of 5")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(400).json({ error: error.message || "Invalid scenario data" });
      }
    }
  });

  app.delete("/api/saved-scenarios/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSavedScenario(id);
      if (!success) {
        return res.status(404).json({ error: "Scenario not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete scenario error:", error);
      res.status(500).json({ error: "Failed to delete scenario" });
    }
  });

  // Portfolio Data Reset (Destructive Operation)
  // Note: This is a single-user application with no authentication system.
  // Security relies on server-side confirmation validation only.
  app.post("/api/portfolio/reset", async (req, res) => {
    try {
      // Validate confirmation string from user input
      const { confirm } = req.body;
      if (!confirm || confirm !== 'DELETE_ALL_DATA') {
        return res.status(400).json({ 
          error: 'Invalid confirmation. Please type DELETE_ALL_DATA exactly as shown.' 
        });
      }
      
      // Log the reset action
      await storage.logAudit({
        actorId: 'system',
        actionType: 'data_reset',
        targetType: 'portfolio',
        targetId: null,
        details: 'All portfolio data reset (investments, cashflows, cash transactions, alerts, custom distributions)',
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
      });
      
      // Execute reset
      await storage.resetAllData();
      
      res.json({ 
        success: true, 
        message: 'Portfolio data reset successfully. All investments, cashflows, cash transactions, alerts, and custom distributions have been deleted.' 
      });
    } catch (error: any) {
      console.error('Portfolio reset failed:', error);
      res.status(500).json({ error: 'Failed to reset portfolio data. Transaction rolled back.' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
