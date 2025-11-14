const SUKUK_PLATFORM_ID = "c2d3e4f5-0000-4000-8000-000000000001";
const API_BASE = "http://localhost:5000";

// Helper function to calculate start date from end date and duration
function calculateStartDate(endDate, durationMonths) {
  const end = new Date(endDate);
  const start = new Date(end);
  start.setMonth(start.getMonth() - durationMonths);
  return start.toISOString();
}

// Helper function to convert status
function convertStatus(excelStatus) {
  if (excelStatus === "PAID") return "completed";
  if (excelStatus === "Waiting") return "active";
  if (excelStatus === "Check!") return "active";
  return "active";
}

// All investments from the Excel image
const investments = [
  { months: 16, endDate: "2024-07-11", paymentDate: "2024-07-11", faceValue: 5000, profit: 976.19, status: "PAID", name: "001-02623 2#", irr: 16.00 },
  { months: 18, endDate: "2024-09-16", paymentDate: "2024-09-16", faceValue: 5000, profit: 1122.66, status: "PAID", name: "001-02623 4#", irr: 16.20 },
  { months: 20, endDate: "2024-10-10", paymentDate: "2024-10-10", faceValue: 10000, profit: 2378.56, status: "PAID", name: "001-02623 5#", irr: 16.40 },
  { months: 9, endDate: "2023-12-26", paymentDate: "2023-12-26", faceValue: 5000, profit: 459.00, status: "PAID", name: "001-4059", irr: 13.50 },
  { months: 12, endDate: "2023-12-26", paymentDate: "2023-12-26", faceValue: 5000, profit: 607.05, status: "PAID", name: "001-2834", irr: 13.30 },
  { months: 9, endDate: "2024-05-01", paymentDate: "2024-05-01", faceValue: 20000, profit: 1963.57, status: "PAID", name: "001-3926", irr: 14.20 },
  { months: 4, endDate: "2024-02-29", paymentDate: "2024-02-29", faceValue: 20000, profit: 826.52, status: "PAID", name: "001-4381", irr: 14.20 },
  { months: 9, endDate: "2024-08-15", paymentDate: "2024-08-15", faceValue: 10000, profit: 953.20, status: "PAID", name: "001-7936", irr: 13.90 },
  { months: 17, endDate: "2025-03-26", paymentDate: "2025-03-26", faceValue: 20000, profit: 3744.86, status: "PAID", name: "002-0535", irr: 14.80 },
  { months: 28, startDate: "2026-05-05", endDate: null, faceValue: 5000, profit: 1652.77, status: "Waiting", name: "001-08010", irr: 15.20, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 9, endDate: "2024-10-27", paymentDate: "2024-10-27", faceValue: 5000, profit: 463.86, status: "PAID", name: "001-09127", irr: 13.50 },
  { months: 14, endDate: "2025-01-26", paymentDate: "2025-01-26", faceValue: 5000, profit: 631.95, status: "PAID", name: "001-7215", irr: 13.80 },
  { months: 38, startDate: "2027-04-04", endDate: null, faceValue: 5000, profit: 2055.02, status: "Waiting", name: "001-1101", irr: 14.10, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 24, endDate: "2024-06-09", paymentDate: "2024-06-09", faceValue: 5000, profit: 205.51, status: "PAID", name: "اللبنية العقارية", irr: 13.10 },
  { months: 16, endDate: "2025-06-04", paymentDate: "2025-06-04", faceValue: 5000, profit: 713.33, status: "PAID", name: "001-0523", irr: 11.80 },
  { months: 6, endDate: "2024-08-08", paymentDate: "2024-08-08", faceValue: 10000, profit: 569.01, status: "PAID", name: "001-5171", irr: 13.20 },
  { months: 9, endDate: "2024-11-04", paymentDate: "2024-11-04", faceValue: 5000, profit: 390.38, status: "PAID", name: "001-5243", irr: 12.30 },
  { months: 10, endDate: "2025-01-12", paymentDate: "2025-01-12", faceValue: 5000, profit: 428.76, status: "PAID", name: "ثلة العقارية", irr: 11.40 },
  { months: 6, endDate: "2024-09-26", paymentDate: "2024-09-26", faceValue: 5000, profit: 300.25, status: "PAID", name: "001-101472 1#", irr: 13.20 },
  { months: 9, endDate: "2024-12-29", paymentDate: "2024-12-29", faceValue: 5000, profit: 458.24, status: "PAID", name: "001-101472 2#", irr: 13.40 },
  { months: 6, endDate: "2024-09-30", paymentDate: "2024-09-30", faceValue: 5000, profit: 280.00, status: "PAID", name: "001-010589 1#", irr: 12.30 },
  { months: 9, endDate: "2024-12-23", paymentDate: "2024-12-23", faceValue: 5000, profit: 431.37, status: "PAID", name: "001-10536", irr: 13.00 },
  { months: 13, startDate: "2025-05-15", endDate: null, faceValue: 5000, profit: 610.29, status: "Check!", name: "003-0728", irr: 14.70, notes: "⚠️ تاريخ الاستحقاق ناقص - Check!" },
  { months: 24, endDate: "2025-02-17", paymentDate: "2025-02-17", faceValue: 5000, profit: 481.39, status: "PAID", name: "اللبنية روبيدس 10", irr: 12.90 },
  { months: 24, startDate: "2026-04-28", endDate: null, faceValue: 5000, profit: 1151.34, status: "Waiting", name: "الرضا السكني", irr: 12.70, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 17, endDate: "2025-09-22", paymentDate: "2025-09-22", faceValue: 5000, profit: 936.94, status: "PAID", name: "003-350", irr: 14.40 },
  { months: 17, endDate: "2025-10-01", paymentDate: "2025-10-01", faceValue: 5000, profit: 843.34, status: "PAID", name: "001-010589", irr: 13.10 },
  { months: 13, endDate: "2025-06-03", paymentDate: "2025-06-03", faceValue: 5000, profit: 622.41, status: "PAID", name: "002-01207", irr: 12.40 },
  { months: 24, startDate: "2026-05-03", endDate: null, faceValue: 5000, profit: 1251.93, status: "Waiting", name: "بيت 3", irr: 13.70, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 9, endDate: "2025-04-06", paymentDate: "2025-04-06", faceValue: 5000, profit: 341.49, status: "PAID", name: "001-6495", irr: 14.60 },
  { months: 18, startDate: "2026-06-23", endDate: null, faceValue: 20000, profit: 2154.87, status: "Waiting", name: "محمد يالعيم للتجارة", irr: 14.30, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 30, startDate: "2026-03-29", endDate: null, faceValue: 8000, profit: 2571.94, status: "Waiting", name: "001-11286", irr: 14.00, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 12, endDate: "2025-12-30", paymentDate: null, faceValue: 4000, profit: 396.34, status: "Waiting", name: "001-12791", irr: 11.10 },
  { months: 9, endDate: "2025-09-01", paymentDate: "2025-09-01", faceValue: 5000, profit: 532.94, status: "PAID", name: "001-14552", irr: 18.30 },
  { months: 26, startDate: "2027-03-07", endDate: null, faceValue: 5000, profit: 1518.87, status: "Waiting", name: "يامن للتطوير العقاري", irr: 15.20, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 23, startDate: "2027-03-02", endDate: null, faceValue: 10000, profit: 2583.52, status: "Waiting", name: "#27 دراسيات ريو يندس", irr: 14.60, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 13, startDate: "2026-05-03", endDate: null, faceValue: 5000, profit: 673.33, status: "Waiting", name: "الدرر للمقاولات", irr: 13.60, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 27, startDate: "2027-07-07", endDate: null, faceValue: 10000, profit: 2885.89, status: "Waiting", name: "41 ريا", irr: 14.00, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 19, startDate: "2026-11-22", endDate: null, faceValue: 10000, profit: 2083.62, status: "Waiting", name: "#35 دراسيات ريو يندس", irr: 14.20, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 31, startDate: "2027-12-08", endDate: null, faceValue: 10000, profit: 3045.67, status: "Waiting", name: "ثمر هوم وحطين", irr: 12.90, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 24, startDate: "2027-11-09", endDate: null, faceValue: 10000, profit: 2804.06, status: "Waiting", name: "خيل رابز", irr: 15.17, notes: "⚠️ تاريخ الاستحقاق ناقص" },
  { months: 34, startDate: "2028-09-12", endDate: null, faceValue: 20000, profit: 7780.00, status: "Waiting", name: "رفيعة 3", irr: 14.90, notes: "⚠️ تاريخ الاستحقاق ناقص" },
];

async function createInvestment(inv) {
  try {
    // Calculate dates
    let startDate, endDate;
    
    if (inv.endDate) {
      // If we have endDate, calculate startDate
      endDate = new Date(inv.endDate);
      startDate = calculateStartDate(inv.endDate, inv.months);
    } else if (inv.startDate) {
      // If we have startDate, calculate endDate
      startDate = new Date(inv.startDate).toISOString();
      const end = new Date(inv.startDate);
      end.setMonth(end.getMonth() + inv.months);
      endDate = end;
    } else {
      console.error(`⚠️ No date information for ${inv.name}`);
      return { success: false, name: inv.name, error: "No date information" };
    }

    const payload = {
      platformId: SUKUK_PLATFORM_ID,
      name: inv.name,
      faceValue: inv.faceValue,
      totalExpectedProfit: inv.profit,
      startDate: startDate,
      endDate: endDate.toISOString ? endDate.toISOString() : endDate,
      durationMonths: inv.months,
      expectedIrr: inv.irr,
      status: convertStatus(inv.status),
      distributionFrequency: "at_maturity",
      profitPaymentStructure: "at_maturity",
      riskScore: 50,
      fundedFromCash: 0,
      isReinvestment: 0,
    };

    const response = await fetch(`${API_BASE}/api/investments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed to create ${inv.name}: ${error}`);
      return { success: false, name: inv.name, error };
    }

    const result = await response.json();
    console.log(`✅ Created: ${inv.name} (${inv.status})`);

    // If PAID status and we have payment date, update the cashflow
    if (inv.status === "PAID" && inv.paymentDate && result.id) {
      await updateCashflowForPaidInvestment(result.id, inv.paymentDate);
    }

    return { success: true, name: inv.name, id: result.id };
  } catch (error) {
    console.error(`❌ Error creating ${inv.name}:`, error.message);
    return { success: false, name: inv.name, error: error.message };
  }
}

async function updateCashflowForPaidInvestment(investmentId, paymentDate) {
  try {
    // Get cashflows for this investment
    const response = await fetch(`${API_BASE}/api/cashflows`);
    const cashflows = await response.json();
    
    const investmentCashflows = cashflows.filter(cf => cf.investmentId === investmentId);
    
    for (const cf of investmentCashflows) {
      await fetch(`${API_BASE}/api/cashflows/${cf.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "received",
          receivedDate: new Date(paymentDate).toISOString(),
        }),
      });
    }
    
    console.log(`   💰 Updated cashflow for paid investment`);
  } catch (error) {
    console.error(`   ⚠️ Failed to update cashflow:`, error.message);
  }
}

async function main() {
  console.log(`🚀 Starting import of ${investments.length} investments...\n`);
  
  const results = [];
  
  for (let i = 0; i < investments.length; i++) {
    const inv = investments[i];
    console.log(`[${i + 1}/${investments.length}] Processing: ${inv.name}...`);
    const result = await createInvestment(inv);
    results.push(result);
    
    // Small delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log(`\n📊 Import Summary:`);
  console.log(`✅ Success: ${results.filter(r => r.success).length}`);
  console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
  
  const failures = results.filter(r => !r.success);
  if (failures.length > 0) {
    console.log(`\n❌ Failed investments:`);
    failures.forEach(f => console.log(`   - ${f.name}: ${f.error}`));
  }
}

main().catch(console.error);
