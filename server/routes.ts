import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import {
  insertPlatformSchema,
  insertInvestmentSchema,
  insertCashflowSchema,
  insertAlertSchema,
} from "@shared/schema";

// API schema that accepts date strings and coerces to Date objects with validation
const apiInvestmentSchema = insertInvestmentSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
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
      // Use API schema that coerces date strings to Date objects with validation
      const data = apiInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(data);
      res.status(201).json(investment);
    } catch (error: any) {
      console.error("Investment creation error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  });

  app.patch("/api/investments/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Use API schema that coerces date strings to Date objects with validation
      const data = apiInvestmentSchema.partial().parse(req.body);
      const investment = await storage.updateInvestment(id, data);
      
      if (!investment) {
        return res.status(404).json({ error: "Investment not found" });
      }

      res.json(investment);
    } catch (error: any) {
      console.error("Investment update error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
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

  const httpServer = createServer(app);
  return httpServer;
}
