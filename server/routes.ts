import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import multer from "multer";
import OpenAI from "openai";
import { storage } from "./storage";
import {
  insertPlatformSchema,
  insertInvestmentSchema,
  insertCashflowSchema,
  insertAlertSchema,
  insertUserSettingsSchema,
  insertCashTransactionSchema,
  insertSavedScenarioSchema,
  insertPortfolioSnapshotSchema,
  apiCustomDistributionSchema,
  type ApiCustomDistribution,
} from "@shared/schema";
import { generateCashflows, type DistributionFrequency, type ProfitPaymentStructure } from "@shared/cashflow-generator";

// Configure multer for image upload (store in memory as buffer)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept image files only
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed.'));
    }
  },
});

// Initialize OpenAI client using Replit AI Integrations
// This internally uses Replit AI Integrations for OpenAI access, does not require your own API key, and charges are billed to your credits
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// API schema that accepts date strings and coerces to Date objects with validation
const apiInvestmentSchema = insertInvestmentSchema.extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(), // Optional if durationMonths provided
  durationMonths: z.number().int().positive().optional(), // Optional if endDate provided
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
      
      // Validate dates within investment window (if endDate provided)
      if (data.endDate && (dist.dueDate < data.startDate || dist.dueDate > data.endDate)) {
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

  // Bulk create investments
  app.post("/api/investments/bulk", async (req, res) => {
    try {
      const bulkSchema = z.object({
        investments: z.array(apiInvestmentSchema),
      });
      
      const { investments } = bulkSchema.parse(req.body);
      
      // Get all platforms for validation
      const allPlatforms = await storage.getPlatforms();
      const platformIds = new Set(allPlatforms.map(p => p.id));
      
      // Validate all investments before creating any
      const results = {
        created: [] as any[],
        errors: [] as { index: number; error: string }[],
      };
      
      for (let i = 0; i < investments.length; i++) {
        try {
          const investmentData = investments[i];
          
          // Validate that platformId exists and platform is valid
          if (!investmentData.platformId) {
            throw new Error('Platform ID is required');
          }
          
          if (!platformIds.has(investmentData.platformId)) {
            throw new Error(`Platform with ID ${investmentData.platformId} does not exist`);
          }
          
          // Extract customDistributions if provided
          const { customDistributions, durationMonths: clientDurationMonths, ...rawInvestmentData } = investmentData;
          
          // Auto-calculate financial fields (similar to single investment creation)
          const { validateInvestmentFinancials } = await import("@shared/profit-calculator");
          const validatedFinancials = validateInvestmentFinancials({
            faceValue: rawInvestmentData.faceValue,
            expectedIrr: rawInvestmentData.expectedIrr,
            startDate: rawInvestmentData.startDate,
            endDate: rawInvestmentData.endDate,
            durationMonths: clientDurationMonths,
            totalExpectedProfit: rawInvestmentData.totalExpectedProfit,
          });
          
          // Merge validated fields with rest of investment data
          const finalInvestmentData = {
            ...rawInvestmentData,
            ...validatedFinancials,
          };

          // Create investment (this also creates cashflows automatically)
          const created = await storage.createInvestment(finalInvestmentData, customDistributions);

          results.created.push(created);
        } catch (error) {
          console.error(`Error creating investment ${i}:`, error);
          results.errors.push({
            index: i,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      res.status(201).json(results);
    } catch (error) {
      console.error("Bulk investment creation error:", error);
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid request" });
    }
  });

  // Extract investments from image using OpenAI Vision (gpt-4o)
  app.post("/api/investments/extract-from-image", upload.single('image'), async (req, res) => {
    try {
      // Validate image upload
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Convert buffer to base64
      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      // Get all platforms for matching
      const allPlatforms = await storage.getPlatforms();

      // Craft prompt for GPT-4o Vision to extract investment data
      const prompt = `You are a financial data extraction expert. Analyze this image which contains an Excel table or spreadsheet showing investment data.

Extract ALL investment rows from the table and return them as a JSON array. Each investment should have these fields:

- name: Investment name or opportunity name (string)
- platformName: Platform or source name if visible (string, can be null)
- faceValue: Face value, principal amount, or investment amount (number, no commas)
- irr: Expected IRR percentage (number, just the number without % symbol)
- profit: Total expected profit if visible (number, can be null)
- startDate: Start date in ISO format YYYY-MM-DD (string)
- endDate: End date or maturity date in ISO format YYYY-MM-DD (string)
- duration: Duration in months if visible (number, can be null)
- status: Status code if visible - examples: PAID, Waiting, Check, Active, Completed, etc. (string, can be null)

Important instructions:
1. The table may contain Arabic or English text - extract both
2. Column names might be in Arabic (اسم الفرصة, المنصة, القيمة الاسمية, معدل العائد, تاريخ البداية, تاريخ النهاية, المدة, الحالة) or English
3. Extract ALL rows that appear to be investment data (skip header rows)
4. For dates, be lenient with formats and convert to YYYY-MM-DD
5. Remove commas and currency symbols from numbers
6. If IRR has a % symbol, remove it and keep just the number
7. If a field is not visible or unclear, use null
8. Return ONLY valid JSON array, no markdown formatting

Example output format:
[
  {
    "name": "Investment Opportunity 1",
    "platformName": "Platform A",
    "faceValue": 10000,
    "irr": 15.5,
    "profit": 1550,
    "startDate": "2024-01-15",
    "endDate": "2024-12-15",
    "duration": 11,
    "status": "Active"
  }
]`;

      // Call OpenAI Vision API
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      // However, for vision tasks with images, we use gpt-4o which has excellent vision capabilities
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // gpt-4o has excellent vision capabilities for image analysis
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
        temperature: 0.1, // Low temperature for more deterministic/accurate extraction
      });

      const responseText = completion.choices[0]?.message?.content || "";
      
      // Parse JSON response
      let extractedData: any[];
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        extractedData = JSON.parse(cleanedResponse);
        
        if (!Array.isArray(extractedData)) {
          throw new Error("Response is not an array");
        }
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", responseText);
        return res.status(500).json({ 
          error: "Failed to parse investment data from image. Please try a clearer image.",
          details: parseError instanceof Error ? parseError.message : "Unknown error"
        });
      }

      // Normalize column name helper (same as bulk-import)
      const normalizeColumnName = (name: string): string => {
        return name
          .toLowerCase()
          .trim()
          .replace(/[\u064B-\u065F\u0670]/g, '') // Remove Arabic diacritics
          .replace(/\u0640/g, '') // Remove Arabic tatweel
          .replace(/[%_\-\s]+/g, '_')
          .replace(/^_+|_+$/g, '');
      };

      // Transform extracted data to ParsedInvestment structure
      const parsedInvestments = extractedData.map((row: any, index: number) => {
        const warnings: string[] = [];
        const errors: string[] = [];
        const id = `image-temp-${Date.now()}-${index}`;

        // Extract fields from AI response
        const name = row.name || '';
        const platformNameFromAI = row.platformName;
        const faceValue = typeof row.faceValue === 'number' ? row.faceValue : parseFloat(String(row.faceValue || '0').replace(/[,\s]/g, ''));
        const expectedIrr = typeof row.irr === 'number' ? row.irr : parseFloat(String(row.irr || '0').replace(/[%\s]/g, ''));
        const totalExpectedProfit = typeof row.profit === 'number' ? row.profit : parseFloat(String(row.profit || '0').replace(/[,\s]/g, ''));
        const startDate = row.startDate || '';
        const endDate = row.endDate || '';
        const duration = typeof row.duration === 'number' ? row.duration : parseInt(String(row.duration || '0').replace(/[^\d]/g, ''));
        const statusFromAI = row.status;

        // Match platform name to existing platforms (case/diacritics insensitive)
        let matchedPlatformId: string | null = null;
        if (platformNameFromAI && allPlatforms.length > 0) {
          const normalizedInput = normalizeColumnName(platformNameFromAI);
          const matchedPlatform = allPlatforms.find(p => 
            normalizeColumnName(p.name) === normalizedInput || 
            normalizeColumnName(p.id) === normalizedInput
          );
          
          if (matchedPlatform) {
            matchedPlatformId = matchedPlatform.id;
          } else {
            warnings.push(`Platform "${platformNameFromAI}" not found. Please select manually.`);
          }
        }

        // Calculate duration if we have both dates but no duration
        let calculatedDuration = duration;
        if ((!calculatedDuration || calculatedDuration <= 0) && startDate && endDate) {
          try {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            calculatedDuration = Math.round(diffDays / 30); // Approximate months
          } catch (e) {
            // If date parsing fails, leave duration as is
          }
        }
        
        // Validation: Required fields
        if (!name) {
          errors.push("Missing required field: Name");
        }
        
        if (!faceValue || faceValue <= 0 || isNaN(faceValue)) {
          errors.push("Missing or invalid Face Value (must be > 0)");
        }
        
        if (!expectedIrr || isNaN(expectedIrr)) {
          errors.push("Missing or invalid IRR (required for risk calculation)");
        } else if (expectedIrr < 0 || expectedIrr > 100) {
          errors.push("Invalid IRR value (must be 0-100%)");
        }
        
        if (!startDate) {
          warnings.push("Missing Start Date");
        }
        
        // Only warn if we have neither endDate nor calculated duration
        if (!endDate && (!calculatedDuration || calculatedDuration <= 0)) {
          warnings.push("Missing End Date and Duration - please add manually");
        }

        // Calculate risk score: (IRR / 30) × 100
        const riskScore = expectedIrr && !isNaN(expectedIrr)
          ? Math.min(100, Math.round((expectedIrr / 30) * 100))
          : 0;

        // Determine status
        let status = 'active';
        if (statusFromAI) {
          const normalizedStatus = normalizeColumnName(statusFromAI);
          if (normalizedStatus.includes('paid') || normalizedStatus.includes('completed')) {
            status = 'completed';
          } else if (normalizedStatus.includes('wait') || normalizedStatus.includes('pending')) {
            status = 'active';
          }
        }

        return {
          id,
          name: name || `Investment ${index + 1}`,
          platformId: matchedPlatformId,
          faceValue: faceValue || 0,
          totalExpectedProfit: totalExpectedProfit || 0,
          expectedIrr: expectedIrr || 0,
          riskScore,
          startDate,
          endDate,
          durationMonths: calculatedDuration || 0,
          distributionFrequency: 'quarterly',
          profitPaymentStructure: 'periodic',
          status,
          isReinvestment: 0,
          fundedFromCash: 0,
          warnings,
          errors,
        };
      });

      // Collect global warnings
      const globalWarnings: string[] = [];
      if (parsedInvestments.length === 0) {
        globalWarnings.push("No investment data found in the image. Please ensure the image contains a clear table with investment data.");
      }

      res.json({
        investments: parsedInvestments,
        warnings: globalWarnings,
      });

    } catch (error: any) {
      console.error("Image extraction error:", error);
      
      // Handle specific OpenAI errors
      if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
        return res.status(429).json({ 
          error: "Rate limit exceeded. Please try again in a moment.",
          details: error.message 
        });
      }
      
      res.status(500).json({ 
        error: "Failed to extract investment data from image",
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const data = apiInvestmentSchema.parse(req.body);
      
      // Extract customDistributions if provided
      const { customDistributions, durationMonths: clientDurationMonths, ...rawInvestmentData } = data;
      
      // Auto-calculate financial fields (durationMonths, totalExpectedProfit)
      const { validateInvestmentFinancials } = await import("@shared/profit-calculator");
      const validatedFinancials = validateInvestmentFinancials({
        faceValue: rawInvestmentData.faceValue,
        expectedIrr: rawInvestmentData.expectedIrr,
        startDate: rawInvestmentData.startDate,
        endDate: rawInvestmentData.endDate,
        durationMonths: clientDurationMonths,
        totalExpectedProfit: rawInvestmentData.totalExpectedProfit,
      });
      
      // Merge validated fields with rest of investment data
      const investmentData = {
        ...rawInvestmentData,
        ...validatedFinancials,
      };
      
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
        durationMonths: z.number().int().positive().optional(),
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
      const { customDistributions, durationMonths: clientDurationMonths, ...rawInvestmentData } = data;
      
      // If financial fields are being updated, recalculate them
      let investmentData = rawInvestmentData;
      if (rawInvestmentData.faceValue || rawInvestmentData.expectedIrr || rawInvestmentData.startDate || rawInvestmentData.endDate || clientDurationMonths) {
        const { validateInvestmentFinancials } = await import("@shared/profit-calculator");
        
        // Fetch current investment for defaults
        const currentInvestment = await storage.getInvestment(id);
        if (!currentInvestment) {
          return res.status(404).json({ error: "Investment not found" });
        }
        
        const validatedFinancials = validateInvestmentFinancials({
          faceValue: rawInvestmentData.faceValue ?? parseFloat(currentInvestment.faceValue),
          expectedIrr: rawInvestmentData.expectedIrr ?? parseFloat(currentInvestment.expectedIrr),
          startDate: rawInvestmentData.startDate ?? new Date(currentInvestment.startDate),
          endDate: rawInvestmentData.endDate,
          durationMonths: clientDurationMonths ?? currentInvestment.durationMonths,
          totalExpectedProfit: rawInvestmentData.totalExpectedProfit,
        });
        
        investmentData = {
          ...rawInvestmentData,
          ...validatedFinancials,
        };
      }
      
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

  // Complete all pending payments for an investment
  app.post("/api/investments/:id/complete-all-payments", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Schema for bulk completion with late status management
      const bulkCompleteSchema = z.object({
        receivedDate: z.coerce.date().optional(),
        clearLateStatus: z.boolean().optional(),
        updateLateInfo: z.object({
          lateDays: z.number().int().min(1),
        }).strict().optional(),
      }).refine(
        (data) => {
          // Reject contradictory payloads
          if (data.clearLateStatus && data.updateLateInfo) {
            return false;
          }
          return true;
        },
        {
          message: "Cannot both clear late status and update late info simultaneously",
        }
      );
      
      const { receivedDate, clearLateStatus, updateLateInfo } = bulkCompleteSchema.parse(req.body);
      
      const result = await storage.completeAllPendingPayments(
        id,
        receivedDate || new Date(),
        { clearLateStatus, updateLateInfo }
      );
      
      if (!result) {
        return res.status(404).json({ error: "Investment not found or no pending payments" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("Bulk completion error:", error);
      res.status(400).json({ error: error.message || "Failed to complete payments" });
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
      
      // Extended schema to support late status management and receivedDate
      const extendedCashflowSchema = insertCashflowSchema.partial().extend({
        receivedDate: z.coerce.date().nullable().optional(),
        clearLateStatus: z.boolean().optional(),
        updateLateInfo: z.object({
          lateDays: z.number().int().min(1),
        }).strict().optional(), // Require lateDays if updateLateInfo is provided
      }).refine(
        (data) => {
          // Reject contradictory payloads (both clearLateStatus and updateLateInfo)
          if (data.clearLateStatus && data.updateLateInfo) {
            return false;
          }
          return true;
        },
        {
          message: "Cannot both clear late status and update late info simultaneously",
        }
      );
      
      const { clearLateStatus, updateLateInfo, ...cashflowData } = extendedCashflowSchema.parse(req.body);
      
      // Update the cashflow
      const cashflow = await storage.updateCashflow(id, cashflowData);
      
      if (!cashflow) {
        return res.status(404).json({ error: "Cashflow not found" });
      }
      
      // Handle late status management if payment is being marked as received
      if (cashflowData.status === "received" && cashflowData.receivedDate) {
        // Get the investment to check its status
        const investment = await storage.getInvestment(cashflow.investmentId);
        
        if (investment && (investment.status === "late" || investment.status === "defaulted")) {
          // Check if user wants to clear late status
          if (clearLateStatus === true) {
            // Clear late/defaulted dates
            await storage.updateInvestmentStatus(
              cashflow.investmentId,
              "active", // Will be recalculated by status checker
              null,
              null
            );
          } else if (updateLateInfo?.lateDays) {
            // Update late date to reflect custom late days
            const now = new Date();
            const customLateDate = new Date(now.getTime() - (updateLateInfo.lateDays * 24 * 60 * 60 * 1000));
            
            // Keep defaultedDate if it exists, just update lateDate
            await storage.updateInvestmentStatus(
              cashflow.investmentId,
              investment.status,
              customLateDate,
              investment.defaultedDate ? new Date(investment.defaultedDate) : null
            );
          }
          // If neither option is specified, keep existing late/defaulted status
        }
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
      const balanceData = await storage.getCashBalance();
      // Return both total and byPlatform for backwards compatibility and new features
      res.json({ 
        balance: balanceData.total, // Backwards compatible
        total: balanceData.total,
        byPlatform: balanceData.byPlatform
      });
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

  // Portfolio Snapshots (Checkpoints)
  app.get("/api/snapshots", async (_req, res) => {
    try {
      const snapshots = await storage.getSnapshots();
      res.json(snapshots);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.post("/api/snapshots", async (req, res) => {
    try {
      const { name } = insertPortfolioSnapshotSchema.pick({ name: true }).parse(req.body);
      const snapshot = await storage.createSnapshot(name);
      res.status(201).json(snapshot);
    } catch (error: any) {
      console.error("Create snapshot error:", error);
      res.status(400).json({ error: error.message || "Invalid snapshot data" });
    }
  });

  app.post("/api/snapshots/:id/restore", async (req, res) => {
    try {
      const { id } = req.params;
      const result = await storage.restoreSnapshot(id);
      res.json(result);
    } catch (error: any) {
      console.error("Restore snapshot error:", error);
      if (error.message?.includes("not found")) {
        res.status(404).json({ error: "Snapshot not found" });
      } else {
        res.status(500).json({ error: error.message || "Failed to restore snapshot" });
      }
    }
  });

  app.delete("/api/snapshots/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteSnapshot(id);
      if (!success) {
        return res.status(404).json({ error: "Snapshot not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete snapshot error:", error);
      res.status(500).json({ error: "Failed to delete snapshot" });
    }
  });

  // Investment Status Check Trigger
  app.post("/api/investments/check-status", async (_req, res) => {
    try {
      const { checkAllInvestmentStatuses } = await import("@shared/status-manager");
      
      // Get all investments and cashflows
      const investments = await storage.getInvestments();
      const allCashflows = await storage.getCashflows();
      
      // Group cashflows by investment
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
        // Apply each status update
        for (const update of statusUpdates) {
          await storage.updateInvestmentStatus(
            update.investmentId,
            update.newStatus,
            update.lateDate,
            update.defaultedDate
          );
        }
      }
      
      res.json({ 
        message: "Status check completed", 
        updatesApplied: statusUpdates.length,
        updates: statusUpdates 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to check investment statuses" });
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
