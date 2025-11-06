import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import crypto from "crypto";
import { storage } from "./storage";
import {
  insertPlatformSchema,
  insertInvestmentSchema,
  insertCashflowSchema,
  insertAlertSchema,
  insertUserSettingsSchema,
  insertCashTransactionSchema,
} from "@shared/schema";

// Import new modular routes
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import rolesRoutes from "./routes/roles";
import auditRoutes from "./routes/audit";
import impersonationRoutes from "./routes/impersonation";
import exportRequestsRoutes from "./routes/export-requests";
import viewRequestsRoutes from "./routes/view-requests";
import temporaryRolesRoutes from "./routes/temporary-roles";

// Import field masking helpers
import { getMaskingConfig, applyMasking, type MaskingConfig } from "./helpers/field-masking";
import type { AuthenticatedRequest } from "./middleware/auth";

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (attempts.count >= 5) {
    return false; // Max 5 attempts per minute
  }
  
  attempts.count++;
  return true;
}

// Helper to hash PIN for server-side verification
function hashPIN(pin: string): string {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

// Auth middleware
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session.isAuthenticated) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

// Middleware that allows public access but checks for security requirement
async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await storage.getSettings();
    const authReq = req as AuthenticatedRequest;
    
    // Helper to attach owner user for legacy compatibility
    const attachOwnerUser = async () => {
      if (!authReq.user) {
        const users = await storage.getUsers();
        const owner = users.find(u => u.roleId === '1'); // Owner role
        if (owner) {
          const role = await storage.getRole('1');
          authReq.user = {
            id: owner.id,
            effectiveUserId: owner.id,
            permissions: role?.permissions || [],
            roleId: owner.roleId,
          };
        }
      }
    };
    
    // If security is not enabled, allow access with owner permissions
    if (!settings || settings.securityEnabled !== 1 || !settings.pinHash) {
      // Always attach owner user in open-access mode to prevent masking
      await attachOwnerUser();
      return next();
    }
    
    // Security is enabled, require authentication
    if (req.session.isAuthenticated) {
      // Attach owner user for legacy authenticated sessions
      await attachOwnerUser();
      return next();
    }
    
    res.status(401).json({ error: "Authentication required" });
  } catch (error) {
    res.status(500).json({ error: "Failed to check auth status" });
  }
}

// Helper to apply field masking based on user permissions
function withMasking(type: 'investment' | 'cashflow' | 'cash_transaction' | 'portfolio_stats' | 'analytics') {
  return (handler: (req: Request, res: Response) => Promise<any>) => {
    return async (req: Request, res: Response) => {
      const authReq = req as AuthenticatedRequest;
      
      // Get masking config - if no user, apply default masking (no permissions)
      const config: MaskingConfig = authReq.user 
        ? getMaskingConfig(authReq)
        : {
            maskAbsoluteAmounts: true,  // Mask amounts for unauthenticated users
            maskSensitiveData: true,    // Hide sensitive data
            maskPersonalInfo: true,     // Hide personal info
          };
      
      // Intercept res.json to apply masking
      const originalJson = res.json.bind(res);
      res.json = function(data: any) {
        const masked = applyMasking(data, type, config);
        return originalJson(masked);
      };
      
      return handler(req, res);
    };
  };
}

// API schema that accepts date strings and coerces to Date objects with validation
const apiInvestmentSchema = insertInvestmentSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register new modular routes for multi-user system
  app.use("/api/v2/auth", authRoutes);
  app.use("/api/v2/users", usersRoutes);
  app.use("/api/v2/roles", rolesRoutes);
  app.use("/api/v2/audit", auditRoutes);
  app.use("/api/v2/impersonation", impersonationRoutes);
  app.use("/api/v2/export-requests", exportRequestsRoutes);
  app.use("/api/v2/view-requests", viewRequestsRoutes);
  app.use("/api/v2/temporary-roles", temporaryRolesRoutes);

  // Legacy authentication endpoints (kept for backward compatibility)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      
      if (!checkRateLimit(ip)) {
        return res.status(429).json({ error: "Too many login attempts. Please try again later." });
      }
      
      const { pin } = req.body;
      
      if (!pin || typeof pin !== 'string' || pin.length < 4 || pin.length > 6) {
        return res.status(400).json({ error: "Invalid PIN format" });
      }
      
      const settings = await storage.getSettings();
      
      if (!settings || !settings.pinHash) {
        return res.status(400).json({ error: "PIN not configured" });
      }
      
      const pinHash = hashPIN(pin);
      
      if (pinHash === settings.pinHash) {
        req.session.isAuthenticated = true;
        req.session.userId = settings.id;
        return res.json({ success: true });
      }
      
      res.status(401).json({ error: "Incorrect PIN" });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      // Return security configuration (not sensitive data)
      // Note: biometricCredentialId is safe to expose (it's like a public key ID)
      // It's needed for WebAuthn authentication flow, even when locked
      res.json({
        isAuthenticated: req.session.isAuthenticated || false,
        securityEnabled: settings?.securityEnabled === 1,
        biometricEnabled: settings?.biometricEnabled === 1,
        hasPIN: !!settings?.pinHash,
        biometricCredentialId: settings?.biometricEnabled === 1 
          ? settings?.biometricCredentialId 
          : undefined,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get auth status" });
    }
  });

  // Platforms (protected)
  app.get("/api/platforms", optionalAuth, async (_req, res) => {
    try {
      const platforms = await storage.getPlatforms();
      res.json(platforms);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch platforms" });
    }
  });

  app.post("/api/platforms", optionalAuth, async (req, res) => {
    try {
      const data = insertPlatformSchema.parse(req.body);
      const platform = await storage.createPlatform(data);
      res.status(201).json(platform);
    } catch (error) {
      res.status(400).json({ error: "Invalid platform data" });
    }
  });

  // Investments
  app.get("/api/investments", optionalAuth, withMasking('investment')(async (_req, res) => {
    try {
      const investments = await storage.getInvestments();
      res.json(investments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch investments" });
    }
  }));

  app.post("/api/investments", optionalAuth, withMasking('investment')(async (req, res) => {
    try {
      // Use API schema that coerces date strings to Date objects with validation
      const data = apiInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(data);
      res.status(201).json(investment);
    } catch (error: any) {
      console.error("Investment creation error:", error);
      res.status(400).json({ error: error.message || "Invalid investment data" });
    }
  }));

  app.patch("/api/investments/:id", optionalAuth, withMasking('investment')(async (req, res) => {
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
  }));

  // Cashflows
  app.get("/api/cashflows", optionalAuth, withMasking('cashflow')(async (_req, res) => {
    try {
      const cashflows = await storage.getCashflows();
      res.json(cashflows);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cashflows" });
    }
  }));

  app.post("/api/cashflows", optionalAuth, withMasking('cashflow')(async (req, res) => {
    try {
      const data = insertCashflowSchema.parse(req.body);
      const cashflow = await storage.createCashflow(data);
      res.status(201).json(cashflow);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid cashflow data" });
    }
  }));

  app.patch("/api/cashflows/:id", optionalAuth, withMasking('cashflow')(async (req, res) => {
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
  }));

  // Alerts
  app.get("/api/alerts", optionalAuth, async (_req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.post("/api/alerts", optionalAuth, async (req, res) => {
    try {
      const data = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(data);
      res.status(201).json(alert);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid alert data" });
    }
  });

  app.patch("/api/alerts/:id/read", optionalAuth, async (req, res) => {
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

  app.post("/api/alerts/generate", optionalAuth, async (_req, res) => {
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
  app.get("/api/cash/transactions", optionalAuth, withMasking('cash_transaction')(async (_req, res) => {
    try {
      const transactions = await storage.getCashTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash transactions" });
    }
  }));

  app.post("/api/cash/transactions", optionalAuth, withMasking('cash_transaction')(async (req, res) => {
    try {
      const data = insertCashTransactionSchema.parse(req.body);
      const transaction = await storage.createCashTransaction(data);
      res.status(201).json(transaction);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Invalid transaction data" });
    }
  }));

  app.get("/api/cash/balance", optionalAuth, async (_req, res) => {
    try {
      const balance = await storage.getCashBalance();
      res.json({ balance });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cash balance" });
    }
  });

  // Portfolio Stats
  app.get("/api/portfolio/stats", optionalAuth, withMasking('portfolio_stats')(async (_req, res) => {
    try {
      const stats = await storage.getPortfolioStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio stats" });
    }
  }));

  // Analytics
  app.get("/api/analytics", optionalAuth, withMasking('analytics')(async (_req, res) => {
    try {
      const analytics = await storage.getAnalyticsData();
      res.json(analytics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch analytics data" });
    }
  }));

  // Settings
  app.get("/api/settings", optionalAuth, async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (!settings) {
        return res.json(null);
      }
      
      // Never expose sensitive security data to client
      const { pinHash, biometricCredentialId, ...safeSettings } = settings;
      
      res.json(safeSettings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", optionalAuth, async (req, res) => {
    try {
      let data = insertUserSettingsSchema.partial().parse(req.body);
      
      // If setting a new PIN, hash it server-side
      if (data.pinHash && typeof data.pinHash === 'string') {
        // Only hash if it looks like a plain PIN (4-6 digits)
        if (/^\d{4,6}$/.test(data.pinHash)) {
          data.pinHash = hashPIN(data.pinHash);
        }
      }
      
      const settings = await storage.updateSettings(data);
      
      // Never expose sensitive security data in response
      const { pinHash, biometricCredentialId, ...safeSettings } = settings;
      
      res.json(safeSettings);
    } catch (error: any) {
      console.error("Settings update error:", error);
      res.status(400).json({ error: error.message || "Invalid settings data" });
    }
  });

  // AI Insights endpoints
  app.get("/api/ai/insights", optionalAuth, async (_req, res) => {
    try {
      const { getComprehensiveAIInsights } = await import("./ai-service");
      
      const [investments, cashflows, stats, analytics] = await Promise.all([
        storage.getInvestments(),
        storage.getCashflows(),
        storage.getPortfolioStats(),
        storage.getAnalyticsData(),
      ]);

      const insights = await getComprehensiveAIInsights(
        investments,
        cashflows,
        stats,
        analytics
      );
      
      res.json(insights);
    } catch (error: any) {
      console.error("AI insights error:", error);
      res.status(500).json({ error: "Failed to generate AI insights" });
    }
  });

  app.get("/api/ai/recommendations", optionalAuth, async (_req, res) => {
    try {
      const { getAIRecommendations } = await import("./ai-service");
      
      const [investments, stats, analytics] = await Promise.all([
        storage.getInvestments(),
        storage.getPortfolioStats(),
        storage.getAnalyticsData(),
      ]);

      const recommendations = await getAIRecommendations(investments, stats, analytics);
      res.json(recommendations);
    } catch (error: any) {
      console.error("AI recommendations error:", error);
      res.status(500).json({ error: "Failed to generate AI recommendations" });
    }
  });

  app.get("/api/ai/risk-analysis", optionalAuth, async (_req, res) => {
    try {
      const { getAIRiskAnalysis } = await import("./ai-service");
      
      const [investments, stats] = await Promise.all([
        storage.getInvestments(),
        storage.getPortfolioStats(),
      ]);

      const riskAnalysis = await getAIRiskAnalysis(investments, stats);
      res.json(riskAnalysis);
    } catch (error: any) {
      console.error("AI risk analysis error:", error);
      res.status(500).json({ error: "Failed to generate AI risk analysis" });
    }
  });

  app.get("/api/ai/cashflow-forecast", optionalAuth, async (_req, res) => {
    try {
      const { getAICashflowForecast } = await import("./ai-service");
      
      const [cashflows, investments] = await Promise.all([
        storage.getCashflows(),
        storage.getInvestments(),
      ]);

      const forecast = await getAICashflowForecast(cashflows, investments);
      res.json(forecast);
    } catch (error: any) {
      console.error("AI cashflow forecast error:", error);
      res.status(500).json({ error: "Failed to generate cashflow forecast" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
