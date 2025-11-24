import { db } from "./db";
import { platforms, investments, cashflows } from "@shared/schema";
import { eq, and } from "drizzle-orm";

/**
 * Comprehensive Seed Script for Sukuk Investments
 * 
 * This script performs two main operations:
 * 1. Deletes old 26 completed investments and re-inserts them with correct data
 * 2. Inserts 18 new active investments with partial cashflows
 * 
 * Key Corrections:
 * - Profit = (Total Amount Below Green Line - Face Value)
 * - ROI% is TOTAL return, not annual IRR
 * - IRR = ROI% / (months / 12)
 * - Cashflow frequency inferred from payment count:
 *   - 1 payment = end-of-term
 *   - Multiple payments = quarterly (every 3 months)
 * 
 * Usage on Railway (Production):
 * npm run seed:sukuk
 */

// Helper: Calculate annual IRR from total ROI
function calculateIRR(totalROI: number, months: number): number {
  const years = months / 12;
  return Math.round((totalROI / years) * 100) / 100;
}

// Helper: Add months to a date
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

// Helper: Subtract months from a date
function subtractMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() - months);
  return result;
}

// Helper: Infer distribution frequency from duration and payment count
function inferDistributionFrequency(durationMonths: number, paymentCount: number): 'end-of-term' | 'quarterly' | 'monthly' {
  if (paymentCount === 1) return 'end-of-term';
  
  // Calculate interval between payments
  const interval = durationMonths / paymentCount;
  
  // Monthly: interval ≈ 1 month (tolerance: < 1.5 months)
  if (interval < 1.5) return 'monthly';
  
  // Quarterly: interval ≈ 3 months (tolerance: 1.5 to 4.5 months)
  if (interval >= 1.5 && interval <= 4.5) return 'quarterly';
  
  // For longer intervals (>4.5 months), still use quarterly as baseline
  // The actual interval will be calculated in generateCashflowDates
  return 'quarterly';
}

// Helper: Generate cashflow dates based on frequency
function generateCashflowDates(
  startDate: Date,
  endDate: Date,
  durationMonths: number,
  paymentCount: number,
  receivedCount: number,
  frequency: 'end-of-term' | 'quarterly' | 'monthly'
): { dueDate: Date; status: 'received' | 'awaited' }[] {
  const cashflowDates: { dueDate: Date; status: 'received' | 'awaited' }[] = [];
  
  if (frequency === 'end-of-term') {
    cashflowDates.push({
      dueDate: endDate,
      status: receivedCount > 0 ? 'received' : 'awaited'
    });
  } else {
    // CRITICAL: Always generate exactly paymentCount cashflows
    // Distribute evenly so last cashflow aligns with endDate
    
    // Calculate precise interval to ensure last payment = endDate
    const totalMonths = durationMonths;
    const intervalMonths = totalMonths / paymentCount;
    
    for (let i = 0; i < paymentCount; i++) {
      // Use proportional distribution: month_offset = (i + 1) * intervalMonths
      const monthOffset = Math.round((i + 1) * intervalMonths);
      const dueDate = addMonths(startDate, monthOffset);
      
      cashflowDates.push({
        dueDate,
        status: i < receivedCount ? 'received' : 'awaited'
      });
    }
  }
  
  return cashflowDates;
}

async function seedSukukInvestments() {
  console.log('🌱 Starting comprehensive Sukuk seed...\n');
  
  // Check if Sukuk platform exists, create if not
  let sukukPlatform = await db.select().from(platforms).where(eq(platforms.name, 'صكوك')).limit(1);
  
  if (sukukPlatform.length === 0) {
    console.log('Creating صكوك platform...');
    const [newPlatform] = await db.insert(platforms).values({
      name: 'صكوك',
      type: 'sukuk',
      feePercentage: '0',
      deductFees: 0,
    }).returning();
    sukukPlatform = [newPlatform];
    console.log('✅ صكوك platform created\n');
  } else {
    console.log('✅ صكوك platform found\n');
  }
  
  const platformId = sukukPlatform[0].id;
  
  // =======================================================================
  // PHASE 1: DELETE AND RE-INSERT 26 COMPLETED INVESTMENTS
  // =======================================================================
  console.log('📋 PHASE 1: Deleting old 26 completed investments...');
  
  const completedInvestmentNames = [
    'الأعمال التقنية #4', 'الأعمال التقنية', 'عباب للتجارة', 'الأعمال التقنية #5',
    'خليج الوراد', 'الهندسية الحديثة', 'الغنيم', 'مروج الحائل', 'عبد الخليج',
    'الرعاية الطبية', 'رائدة المسكان', 'ايجاز الأعمال', 'أليات الدقيقة',
    'باسقات القصيم', 'تالة العقارية', 'الشنيد العالي', 'شامي خير #1',
    'شامي خير #2', 'أوج الذكية', 'أوتار النهد #1', 'لذائذ الرياض',
    'نواهض العالية', 'وجا', 'أوتار النهد #5', 'الوحدة للإستثمار', 'ذكاء اليوم'
  ];
  
  // Delete old investments and their cashflows
  for (const name of completedInvestmentNames) {
    const [oldInvestment] = await db.select().from(investments)
      .where(and(eq(investments.name, name), eq(investments.platformId, platformId)))
      .limit(1);
    
    if (oldInvestment) {
      // Delete associated cashflows first
      await db.delete(cashflows).where(eq(cashflows.investmentId, oldInvestment.id));
      // Delete investment
      await db.delete(investments).where(eq(investments.id, oldInvestment.id));
      console.log(`  🗑️  Deleted: ${name}`);
    }
  }
  
  console.log('\n✅ Phase 1 deletion complete\n');
  
  // Re-insert 26 completed investments with CORRECT calculations
  console.log('📝 Re-inserting 26 completed investments with corrected data...\n');
  
  const completedInvestments = [
    // Correct format: { name, faceValue, totalAmountReceived, months, paymentCount }
    // Profit = totalAmountReceived - faceValue
    // ROI% = (Profit / faceValue) * 100
    // IRR = ROI% / (months / 12)
    
    { name: 'الأعمال التقنية #4', faceValue: 5000, totalAmountReceived: 6215, months: 18, paymentCount: 7 },
    { name: 'الأعمال التقنية', faceValue: 5000, totalAmountReceived: 6065, months: 16, paymentCount: 6 },
    { name: 'عباب للتجارة', faceValue: 5000, totalAmountReceived: 5379, months: 9, paymentCount: 4 },
    { name: 'الأعمال التقنية #5', faceValue: 10000, totalAmountReceived: 12275, months: 20, paymentCount: 8 },
    { name: 'خليج الوراد', faceValue: 20000, totalAmountReceived: 21770, months: 9, paymentCount: 4 },
    { name: 'الهندسية الحديثة', faceValue: 5000, totalAmountReceived: 5550, months: 12, paymentCount: 5 },
    { name: 'الغنيم', faceValue: 10000, totalAmountReceived: 10780, months: 9, paymentCount: 4 },
    { name: 'مروج الحائل', faceValue: 20000, totalAmountReceived: 20313, months: 4, paymentCount: 1 },
    { name: 'عبد الخليج', faceValue: 5000, totalAmountReceived: 5379, months: 9, paymentCount: 4 },
    { name: 'الرعاية الطبية', faceValue: 20000, totalAmountReceived: 25010, months: 17, paymentCount: 7 },
    { name: 'رائدة المسكان', faceValue: 5000, totalAmountReceived: 6523, months: 24, paymentCount: 9 },
    { name: 'ايجاز الأعمال', faceValue: 5000, totalAmountReceived: 5933, months: 14, paymentCount: 5 },
    { name: 'أليات الدقيقة', faceValue: 10000, totalAmountReceived: 10330, months: 6, paymentCount: 3 },
    { name: 'باسقات القصيم', faceValue: 5000, totalAmountReceived: 6053, months: 16, paymentCount: 6 },
    { name: 'تالة العقارية', faceValue: 5000, totalAmountReceived: 5396, months: 10, paymentCount: 4 },
    { name: 'الشنيد العالي', faceValue: 5000, totalAmountReceived: 5383, months: 9, paymentCount: 4 },
    { name: 'شامي خير #1', faceValue: 5000, totalAmountReceived: 5417, months: 9, paymentCount: 4 },
    { name: 'شامي خير #2', faceValue: 5000, totalAmountReceived: 5217, months: 6, paymentCount: 3 },
    { name: 'أوج الذكية', faceValue: 5000, totalAmountReceived: 5403, months: 9, paymentCount: 4 },
    { name: 'أوتار النهد #1', faceValue: 5000, totalAmountReceived: 5203, months: 6, paymentCount: 3 },
    { name: 'لذائذ الرياض', faceValue: 5000, totalAmountReceived: 6433, months: 17, paymentCount: 7 },
    { name: 'نواهض العالية', faceValue: 5000, totalAmountReceived: 6428, months: 24, paymentCount: 9 },
    { name: 'وجا', faceValue: 5000, totalAmountReceived: 5575, months: 13, paymentCount: 5 },
    { name: 'أوتار النهد #5', faceValue: 5000, totalAmountReceived: 6462, months: 17, paymentCount: 7 },
    { name: 'الوحدة للإستثمار', faceValue: 5000, totalAmountReceived: 5514, months: 9, paymentCount: 1 },
    { name: 'ذكاء اليوم', faceValue: 5000, totalAmountReceived: 5278, months: 9, paymentCount: 4 },
  ];
  
  const endDate = new Date(); // Today (completed recently)
  
  for (const inv of completedInvestments) {
    const profit = inv.totalAmountReceived - inv.faceValue;
    const totalROI = (profit / inv.faceValue) * 100;
    const irr = calculateIRR(totalROI, inv.months);
    const endDateForInv = new Date(endDate); // Use a copy to avoid mutation
    const startDate = subtractMonths(endDateForInv, inv.months);
    const frequency = inferDistributionFrequency(inv.months, inv.paymentCount);
    
    // Insert investment
    const [newInvestment] = await db.insert(investments).values({
      platformId,
      name: inv.name,
      faceValue: inv.faceValue.toString(),
      totalExpectedProfit: profit.toString(),
      startDate,
      endDate: endDateForInv,
      durationMonths: inv.months,
      expectedIrr: irr.toString(),
      status: 'completed',
      riskScore: 50,
      distributionFrequency: frequency,
      profitPaymentStructure: 'periodic',
      isReinvestment: 0,
      fundedFromCash: 0,
      needsReview: 0,
      tags: ['AI Entry', 'Completed'],
    }).returning();
    
    // Generate and insert cashflows (all received)
    const cashflowDates = generateCashflowDates(startDate, endDateForInv, inv.months, inv.paymentCount, inv.paymentCount, frequency);
    const amountPerCashflow = Math.round((profit / inv.paymentCount) * 100) / 100;
    
    for (let i = 0; i < cashflowDates.length; i++) {
      await db.insert(cashflows).values({
        investmentId: newInvestment.id,
        type: 'profit',
        amount: amountPerCashflow.toString(),
        dueDate: cashflowDates[i].dueDate,
        status: 'received',
        receivedDate: cashflowDates[i].dueDate,
      });
    }
    
    console.log(`  ✅ ${inv.name} (Profit: ${profit} SAR, IRR: ${irr.toFixed(1)}%, ${inv.paymentCount} payments)`);
  }
  
  console.log('\n✅ 26 completed investments inserted successfully!\n');
  
  // =======================================================================
  // PHASE 2: INSERT 18 ACTIVE INVESTMENTS WITH PARTIAL CASHFLOWS
  // =======================================================================
  console.log('📋 PHASE 2: Inserting 18 active investments...\n');
  
  const activeInvestments = [
    // Format: { name, faceValue, totalAmountReceived, months, paymentCount, receivedCount }
    { name: 'منار العلم للتعليم', faceValue: 5000, totalAmountReceived: 8135.75, months: 38, paymentCount: 7, receivedCount: 4 },
    { name: 'استثمارات الخليج القابضة', faceValue: 5000, totalAmountReceived: 7951.37, months: 28, paymentCount: 5, receivedCount: 4 },
    { name: 'أزق سكن العقارية (الرضا السكني)', faceValue: 5000, totalAmountReceived: 6151.34, months: 24, paymentCount: 1, receivedCount: 0 },
    { name: 'عبدالخليف احمد العريج وشريكه', faceValue: 5000, totalAmountReceived: 5610.29, months: 13, paymentCount: 3, receivedCount: 0 },
    { name: 'محمد عمر بانعيم للتجارة', faceValue: 20000, totalAmountReceived: 22154.87, months: 18, paymentCount: 18, receivedCount: 11 },
    { name: 'بيان الإنشاء للمقاولات (بيان 3)', faceValue: 5000, totalAmountReceived: 6251.93, months: 24, paymentCount: 1, receivedCount: 0 },
    { name: 'مصنع الأنسجة المتطورة', faceValue: 4000, totalAmountReceived: 4396.34, months: 12, paymentCount: 4, receivedCount: 3 },
    { name: 'دار الهمة للمشاريع المحدودة', faceValue: 8000, totalAmountReceived: 10571.94, months: 30, paymentCount: 6, receivedCount: 2 },
    { name: 'الراسيات للتطوير العقاري (مشروع الراسيات برينديس)', faceValue: 10000, totalAmountReceived: 12583.52, months: 23, paymentCount: 1, receivedCount: 0 },
    { name: 'بامن للتطوير والاستثمار العقاري', faceValue: 5000, totalAmountReceived: 6518.86, months: 26, paymentCount: 1, receivedCount: 0 },
    { name: 'منابر إيجار للتطوير العقاري (مشروع بدء 41)', faceValue: 10000, totalAmountReceived: 12885.89, months: 27, paymentCount: 1, receivedCount: 0 },
    { name: 'الدرر الخليجية للمقاولات (مشروع الصدفة)', faceValue: 5000, totalAmountReceived: 5673.33, months: 13, paymentCount: 1, receivedCount: 0 },
    { name: 'نيو هوم للتطوير العقاري (مشروع نيو هوم حطين)', faceValue: 10000, totalAmountReceived: 13045.67, months: 31, paymentCount: 1, receivedCount: 0 },
    { name: 'الراسيات للتطوير العقاري (رقم الإصدار 35)', faceValue: 10000, totalAmountReceived: 12083.62, months: 19, paymentCount: 1, receivedCount: 0 },
    { name: 'رفيعة العقارية (مشروع رفيعة 03)', faceValue: 20000, totalAmountReceived: 27780.37, months: 34, paymentCount: 1, receivedCount: 0 },
    { name: 'خيال العقارية (مشروع خيال باير)', faceValue: 10000, totalAmountReceived: 12804.06, months: 24, paymentCount: 1, receivedCount: 0 },
    { name: 'مهاد للتطوير العقاري (مشروع مهاد السيف)', faceValue: 20000, totalAmountReceived: 27135.56, months: 31, paymentCount: 1, receivedCount: 0 },
    { name: 'شركة محمد عمر بانعيم للتجارة (رقم الإصدار 27)', faceValue: 20000, totalAmountReceived: 22339.88, months: 18, paymentCount: 6, receivedCount: 2 },
  ];
  
  // Active investments started in the past (approximate dates)
  const today = new Date();
  
  for (const inv of activeInvestments) {
    const profit = inv.totalAmountReceived - inv.faceValue;
    const totalROI = (profit / inv.faceValue) * 100;
    const irr = calculateIRR(totalROI, inv.months);
    
    // Calculate frequency based on duration and payment count
    const frequency = inferDistributionFrequency(inv.months, inv.paymentCount);
    
    // CRITICAL: Use fractional interval for accurate date calculation
    // This ensures the receivedCount-th payment falls on/before today
    const fractionalInterval = inv.months / inv.paymentCount;
    const monthsElapsed = inv.receivedCount * fractionalInterval;
    
    // For active investments:
    // 1. Calculate how many months have elapsed based on received payments
    // 2. endDate = today + remaining duration
    // 3. startDate = endDate - total duration
    const endDate = addMonths(today, inv.months - monthsElapsed);
    const startDate = subtractMonths(endDate, inv.months);
    
    // Insert investment
    const [newInvestment] = await db.insert(investments).values({
      platformId,
      name: inv.name,
      faceValue: inv.faceValue.toString(),
      totalExpectedProfit: profit.toString(),
      startDate,
      endDate,
      durationMonths: inv.months,
      expectedIrr: irr.toString(),
      status: 'active',
      riskScore: 50,
      distributionFrequency: frequency,
      profitPaymentStructure: 'periodic',
      isReinvestment: 0,
      fundedFromCash: 0,
      needsReview: 0,
      tags: ['AI Entry', 'Active'],
    }).returning();
    
    // Generate and insert cashflows (partial received + awaited)
    const cashflowDates = generateCashflowDates(startDate, endDate, inv.months, inv.paymentCount, inv.receivedCount, frequency);
    const amountPerCashflow = Math.round((profit / inv.paymentCount) * 100) / 100;
    
    for (let i = 0; i < cashflowDates.length; i++) {
      await db.insert(cashflows).values({
        investmentId: newInvestment.id,
        type: 'profit',
        amount: amountPerCashflow.toString(),
        dueDate: cashflowDates[i].dueDate,
        status: cashflowDates[i].status,
        receivedDate: cashflowDates[i].status === 'received' ? cashflowDates[i].dueDate : null,
      });
    }
    
    console.log(`  ✅ ${inv.name} (Profit: ${profit.toFixed(2)} SAR, IRR: ${irr.toFixed(1)}%, ${inv.receivedCount}/${inv.paymentCount} received)`);
  }
  
  console.log('\n✅ 18 active investments inserted successfully!\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('✨ SEED COMPLETED SUCCESSFULLY!');
  console.log('═══════════════════════════════════════════════════════');
  console.log('📊 Summary:');
  console.log('  • 26 completed investments with all cashflows received');
  console.log('  • 18 active investments with partial cashflows');
  console.log('  • All tagged with "AI Entry"');
  console.log('  • ROI calculations corrected');
  console.log('  • IRR calculated properly (annual rate)');
  console.log('═══════════════════════════════════════════════════════\n');
}

// Run the seed function
seedSukukInvestments()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  });
