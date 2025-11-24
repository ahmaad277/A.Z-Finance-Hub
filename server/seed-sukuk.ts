import { db } from "./db";
import { platforms, investments } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Seed Script for Sukuk Investments
 * 
 * This script populates the database with 26 Sukuk investment opportunities
 * from the "صكوك" platform. All investments are tagged with "AI Entry" and 
 * set to "pending" status, allowing for manual date entry later.
 * 
 * Usage on Railway (Production):
 * npm run seed:sukuk
 */

// Calculate expected profit from duration, face value, and IRR
function calculateProfit(faceValue: number, irrPercent: number, months: number): number {
  const years = months / 12;
  return Math.round(faceValue * (irrPercent / 100) * years * 100) / 100;
}

// Add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

async function seedSukukInvestments() {
  console.log('🌱 Starting Sukuk investments seed...');
  
  // Check if Sukuk platform exists, create if not
  let sukukPlatform = await db.select().from(platforms).where(eq(platforms.name, 'صكوك')).limit(1);
  
  if (sukukPlatform.length === 0) {
    console.log('Creating صكوك platform...');
    const [newPlatform] = await db.insert(platforms).values({
      name: 'صكوك',
      type: 'sukuk',
      feePercentage: '0', // No fees by default, can be updated later
      deductFees: 0,
    }).returning();
    sukukPlatform = [newPlatform];
    console.log('✅ صكوك platform created');
  } else {
    console.log('✅ صكوك platform already exists');
  }
  
  const platformId = sukukPlatform[0].id;
  
  // Investment data extracted from images
  const investmentData = [
    // From first set of images
    { name: 'الأعمال التقنية #4', faceValue: 5000, irr: 24.3, months: 18 },
    { name: 'الأعمال التقنية', faceValue: 5000, irr: 21.3, months: 16 },
    { name: 'عباب للتجارة', faceValue: 5000, irr: 10.1, months: 9 },
    { name: 'الأعمال التقنية #5', faceValue: 10000, irr: 27.3, months: 20 },
    { name: 'خليج الوراد', faceValue: 20000, irr: 10.6, months: 9 },
    { name: 'الهندسية الحديثة', faceValue: 5000, irr: 13.2, months: 12 },
    { name: 'الغنيم', faceValue: 10000, irr: 10.4, months: 9 },
    { name: 'مروج الحائل', faceValue: 20000, irr: 4.7, months: 4 },
    { name: 'عبد الخليج', faceValue: 5000, irr: 10.1, months: 9 },
    { name: 'الرعاية الطبية', faceValue: 20000, irr: 21.2, months: 17 },
    { name: 'رائدة المسكان', faceValue: 5000, irr: 26.1, months: 24 },
    { name: 'ايجاز الأعمال', faceValue: 5000, irr: 16.0, months: 14 },
    { name: 'أليات الدقيقة', faceValue: 10000, irr: 6.6, months: 6 },
    { name: 'باسقات القصيم', faceValue: 5000, irr: 15.8, months: 16 },
    
    // From second set of images
    { name: 'تالة العقارية', faceValue: 5000, irr: 9.5, months: 10 },
    { name: 'الشنيد العالي', faceValue: 5000, irr: 9.2, months: 9 },
    { name: 'شامي خير #1', faceValue: 5000, irr: 10.0, months: 9 },
    { name: 'شامي خير #2', faceValue: 5000, irr: 6.5, months: 6 },
    { name: 'أوج الذكية', faceValue: 5000, irr: 9.7, months: 9 },
    { name: 'أوتار النهد #1', faceValue: 5000, irr: 6.1, months: 6 },
    { name: 'لذائذ الرياض', faceValue: 5000, irr: 20.3, months: 17 },
    { name: 'نواهض العالية', faceValue: 5000, irr: 25.7, months: 24 },
    { name: 'وجا', faceValue: 5000, irr: 13.8, months: 13 },
    { name: 'أوتار النهد #5', faceValue: 5000, irr: 18.5, months: 17 },
    { name: 'الوحدة للإستثمار', faceValue: 5000, irr: 13.7, months: 9 },
    { name: 'ذكاء اليوم', faceValue: 5000, irr: 7.4, months: 9 },
  ];
  
  console.log(`Preparing to insert ${investmentData.length} investments...`);
  
  // Check for existing investments by name to avoid duplicates
  const existingNames = await db.select({ name: investments.name })
    .from(investments)
    .where(eq(investments.platformId, platformId));
  
  const existingNamesSet = new Set(existingNames.map(inv => inv.name));
  
  // Filter out investments that already exist
  const newInvestments = investmentData.filter(inv => !existingNamesSet.has(inv.name));
  
  if (newInvestments.length === 0) {
    console.log('⚠️  All investments already exist in database. Skipping insertion.');
    console.log('✨ Seed completed successfully!');
    return;
  }
  
  console.log(`Inserting ${newInvestments.length} new investments (${investmentData.length - newInvestments.length} already exist)...`);
  
  // Temporary date for pending investments (today)
  const tempStartDate = new Date();
  
  // Insert investments
  for (const inv of newInvestments) {
    const profit = calculateProfit(inv.faceValue, inv.irr, inv.months);
    const tempEndDate = addDays(tempStartDate, inv.months * 30);
    
    await db.insert(investments).values({
      platformId,
      name: inv.name,
      faceValue: inv.faceValue.toString(),
      totalExpectedProfit: profit.toString(),
      startDate: tempStartDate, // Temporary - to be updated manually
      endDate: tempEndDate, // Temporary - to be updated manually
      durationMonths: inv.months,
      expectedIrr: inv.irr.toString(),
      status: 'pending', // Requires manual review and date update
      riskScore: 50, // Default risk score
      distributionFrequency: 'quarterly', // Default - to be updated manually
      profitPaymentStructure: 'periodic', // Default - to be updated manually
      isReinvestment: 0,
      fundedFromCash: 0,
      needsReview: 1, // Flag for manual review
      tags: ['AI Entry'], // Tag to identify AI-entered investments
    });
    
    console.log(`✅ ${inv.name}`);
  }
  
  console.log(`\n✨ Successfully inserted ${newInvestments.length} investments!`);
  console.log('📝 Note: All investments are marked as "pending" and "needs review"');
  console.log('🗓️  Please update start/end dates manually in the application');
  console.log('🏷️  All investments are tagged with "AI Entry"');
}

// Run the seed function
seedSukukInvestments()
  .then(() => {
    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  });
