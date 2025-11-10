import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { checkAllInvestmentStatuses } from "../shared/status-manager";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });

  // Background task: Periodic investment status checker
  async function runInvestmentStatusCheck() {
    try {
      log('Running investment status check...');
      
      // Get all investments and cashflows
      const investments = await storage.getInvestments();
      const allCashflows = await storage.getCashflows();
      
      // Group cashflows by investment (optimized with Map to avoid O(n²))
      const cashflowsByInvestment = new Map<string, typeof allCashflows>();
      for (const cashflow of allCashflows) {
        const investmentCashflows = cashflowsByInvestment.get(cashflow.investmentId) || [];
        investmentCashflows.push(cashflow);
        cashflowsByInvestment.set(cashflow.investmentId, investmentCashflows);
      }
      
      const investmentsWithCashflows = investments.map((investment) => ({
        investment,
        cashflows: cashflowsByInvestment.get(investment.id) || [],
      }));

      // Check for status updates
      const statusUpdates = checkAllInvestmentStatuses(investmentsWithCashflows);
      
      if (statusUpdates.length > 0) {
        log(`Found ${statusUpdates.length} status updates to apply`);
        
        // Apply each status update
        for (const update of statusUpdates) {
          await storage.updateInvestmentStatus(
            update.investmentId,
            update.newStatus,
            update.lateDate,
            update.defaultedDate
          );
          log(`Updated investment ${update.investmentId} to status: ${update.newStatus}`);
        }
      } else {
        log('No status updates needed');
      }
    } catch (error) {
      log(`Error in investment status check: ${error}`);
    }
  }

  // Run status check immediately on startup
  runInvestmentStatusCheck();

  // Run status check periodically (configurable via environment variable)
  const CHECK_INTERVAL_MINUTES = parseInt(process.env.STATUS_CHECK_INTERVAL_MINUTES || '60', 10);
  const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000;
  setInterval(runInvestmentStatusCheck, CHECK_INTERVAL_MS);
  log(`Investment status checker scheduled to run every ${CHECK_INTERVAL_MINUTES} minutes`);
})();
