# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform focused on Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Its primary purpose is to provide comprehensive portfolio tracking, cashflow management, and analytics to support Sharia-compliant investments, helping users achieve financial independence aligned with Saudi Arabia's Vision 2040. The platform is designed as a single-user tool to simplify functionality and reduce operational overhead.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- Mobile Optimized: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application uses a modern web stack for both frontend and backend. It operates as a single-user personal tool without authentication.

**UI/UX Decisions:**
-   **Dashboard:** Features a "Classic View" with compact financial metric cards (13), platform overview, portfolio performance charts, upcoming cashflows, and recent investments. A "Pro mode" toggle offers advanced features.
-   **Investment Management:** Investments are displayed in a horizontal row-based layout for desktop and a stacked vertical layout for mobile, featuring status-based color coding, payment progress indicators, platform categorization, risk scoring, and real-time ROI calculations.
-   **Cashflow Tracking:** A detailed table with status indicators and distribution type tracking.
-   **Analytics:** Includes monthly returns trends, platform allocation pie charts, and performance comparisons against Vision 2040 targets via a tabbed interface.
-   **Alerts System:** Smart, user-configurable alerts with severity classification and in-app management.
-   **Platform Management:** Dedicated pages for platform details, statistics, and filtered investment lists.
-   **Cash Management System:** Tracks cash balances and transactions (deposits, withdrawals, transfers, investments, distributions) with real-time balance calculations and automatic cash distribution for received cashflows.
-   **Goal Calculator:** A dynamic investment goal calculator for Vision 2040 planning, offering real-time projections.
-   **Smart Payment Processing:** Enhanced dialog for investment completion with automatic date confirmation and ROI calculation.
-   **Reports System:** Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, platform filtering, and real-time preview.
-   **Investment Display Metrics:** Prominently displays total expected profit and received returns with distinct color coding and clear subtitles, adapting layout for mobile and desktop.
-   **Interactive Payment Schedule System:** A visual, color-coded payment tracking system with interactive boxes for cashflows. Users can add, remove, and mark payments as received, triggering real-time updates to portfolio metrics and cash balance.

**Technical Implementations & Design Choices:**
-   **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
-   **Backend:** Express.js and Node.js.
-   **Authentication:** Removed; the application functions as a direct-access, single-user tool.
-   **Styling:** Tailwind CSS with custom design tokens, dark/light mode, and full bilingual support (English/Arabic) with RTL typography.
-   **Financial Metrics System:** Comprehensive utilities for calculating portfolio value, cash ratio, investment returns (profit-only ROI), APR, statistical analysis, and tracking late/defaulted investments. Includes Weighted APR and Portfolio ROI calculations displayed on the dashboard.
-   **Core Entities:** Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData.
-   **Cache Management:** App-level version tracking clears localStorage cache on version mismatch to prevent stale data.
-   **Investment Dialog Calculated Fields:** Real-time calculation and display of total expected return, number of units, payment count, and payment value per installment within the investment dialog, with locale-aware number formatting.
-   **Cash Balance Calculation:** Implemented sum aggregation across all transactions for accurate cash balance regardless of transaction creation order.
-   **Page Header Redesign:** Unified blue header area for all page titles with action buttons, improved typography, and reduced spacing for a more compact layout.

## Smart Sukuk Cashflow System (Complete Implementation - November 2025)

### Phase 1 - Backend Infrastructure (COMPLETED)
Intelligent automatic cashflow generation system integrated into the backend. The system understands Sukuk structure (faceValue + totalExpectedProfit), supports flexible profit payment schedules (periodic vs. at_maturity), and generates smart payment distributions based on frequency (monthly, quarterly, semi_annually, annually, at_maturity).

**Implementation includes:**
- `shared/cashflow-generator.ts`: Core logic for generating cashflows with proper date arithmetic
- Enhanced schema with `faceValue`, `totalExpectedProfit`, `profitPaymentStructure` fields
- Enum validation across the entire stack to prevent invalid frequency values
- Preview endpoint (`POST /api/investments/preview-cashflows`) for frontend to test cashflow generation before creating investments
- Type conversion layer in storage to handle Drizzle's string-based numeric fields
- Full validation consistency between preview and creation endpoints

### Phase 2 - Frontend Integration (COMPLETED)
Complete frontend implementation with Sukuk-native UI components and intelligent automation.

**Investment Dialog (client/src/components/investment-dialog.tsx):**
- Auto-calculates `totalExpectedProfit` from IRR using formula: `faceValue * (expectedIrr / 100) * durationYears`
- Visual "Suggested" badge displays calculated value with locale formatting
- Manual override capability with `userEditedProfit` state tracking
- Real-time calculated metrics display (total return, payment count, payment value per installment)
- **Bug Fix**: Removed blocking condition in useEffect auto-fill logic to ensure field always updates with calculated value

**Investment Cards (client/src/components/investment-row.tsx):**
- Beautiful card-based display matching reference design ("محفظة صكوك المالية" app)
- Face Value (القيمة الاسمية) displayed prominently as principal/deployed capital
- Expected Profit (الأرباح المتوقعة) shown separately with blue color coding
- Total Returns (العوائد الإجمالية) displayed in green for received amounts
- Payment progress visualization (X/Y format) with percentage bar
- Status-based color coding and platform categorization
- Profit payment structure indicator (Periodic vs At Maturity)

**Payment Schedule Manager (client/src/components/payment-schedule-manager.tsx):**
- Interactive colored boxes for each cashflow payment
- Click-to-mark-as-received functionality
- Real-time progress updates
- Visual checkmarks (✓) for completed payments
- Smart profit calculation separating principal from profit cashflows

**Dashboard Metrics (client/src/lib/dashboardMetrics.ts):**
- **Weighted APR**: Calculated from `totalExpectedProfit / faceValue` ratio across all active investments
- **Portfolio ROI**: Based on received profit vs total expected profit (excludes principal)
- All metrics respect Sukuk structure (capital vs profit separation)
- No double-counting of principal returns

**Analytics Integration (server/storage.ts):**
- **Monthly Returns Chart**: Filters cashflows to `type="profit"` only, preventing principal spikes
- **Platform Allocation Chart**: Uses `faceValue` for capital deployment percentages (not inflated `amount`)
- **Performance vs Target Chart**: Calculates as invested capital (`faceValue`) + received profit only (no double counting)
- All analytics respect profit/principal distinction for accurate financial reporting

### Phase 3 - Testing & Validation (COMPLETED)
Comprehensive end-to-end testing validating the complete Sukuk investment lifecycle.

**Test Coverage:**
- Investment creation with all Sukuk fields (faceValue, expectedIrr, distributionFrequency, profitPaymentStructure)
- Auto-calculation verification (e.g., SAR 1,199.18 profit for 12% IRR on SAR 10,000 over 1 year)
- Automatic cashflow generation (12 monthly payments for monthly frequency)
- Payment confirmation workflow from investments page
- Cache invalidation propagation across all pages (investments, cashflows, dashboard, analytics)
- Dashboard metrics integration using Sukuk-aware calculations
- Analytics profit/principal filtering accuracy

**Test Results:**
- ✅ Investment creation successful
- ✅ Auto-calculation accurate (1,199.18 not 0.12)
- ✅ Cashflow generation working (12 monthly profit payments)
- ✅ Payment marking functional
- ✅ Dashboard updates in real-time
- ✅ Analytics charts accurate (no double counting)
- ✅ Cache synchronization working
- ✅ No console errors

**Bug Fixes:**
1. Investment Dialog auto-fill: Removed blocking condition preventing field updates
2. Analytics Monthly Returns: Added `type="profit"` filter to exclude principal spikes
3. Analytics Platform Allocation: Changed from `amount` to `faceValue` to prevent inflated percentages
4. Analytics Performance vs Target: Fixed double-counting by using `faceValue + profit` only

## Cash-Funded Investment System (November 2025)

### Feature: Automatic Cash Deduction for Investments
Investment dialog now supports funding investments directly from cash balance with intelligent validation.

**Investment Dialog Enhancements:**
- **Fund from Cash Balance** checkbox with real-time balance display
- Cash balance fetched from `/api/cash/balance` endpoint (returns `{ balance: number }`)
- Insufficient balance validation using `faceValue` (not `amount`)
- Destructive alert appears when `faceValue > cashBalance`
- Toast warning prevents submission when insufficient funds
- **Critical Fix**: Corrected API response parsing from bare number to `{ balance: number }` object

**Backend Implementation:**
- `createInvestment()` in `server/storage.ts` deducts `faceValue` from cash when `fundedFromCash = 1`
- Creates automatic cash transaction with `type='investment'` and `amount = -faceValue`
- Uses principal invested (face value) for deduction, not total amount including expected profits
- Proper Sukuk-aware capital tracking

**Cache Invalidation:**
After creating cash-funded investment, invalidates:
- `/api/investments`
- `/api/portfolio/stats`
- `/api/analytics`
- `/api/cash/transactions`
- `/api/cash/balance`

## Enhanced Goal Calculator (November 2025)

### Feature: Portfolio-Linked Vision 2040 Planning
Goal calculator now integrates with actual portfolio data and provides comprehensive progress tracking.

**Portfolio Integration:**
- `currentPortfolioValue` auto-calculated from active investments + cash balance
- Uses `faceValue` for active investments (capital invested, excludes expected profits)
- Syncs initial investment amount with current portfolio value
- Real-time updates when investments or cash balance changes

**UI Improvements:**
- **Current Portfolio Value Card**: Displays total invested capital + cash (blue/primary theme)
- **Vision 2040 Goal Card**: Shows SAR 10,000,000 target (green/chart-2 theme)
- **Progress Bar**: Visual indicator of current progress toward 10M goal with percentage
- **Gap Indicator**: Displays remaining amount needed to reach target
- **Smart Alerts**:
  - Red destructive alert when projected future value falls short of 10M target
  - Green success alert when plan exceeds 10M goal
  - Dynamic messaging based on calculation results

**Calculations:**
```typescript
currentPortfolioValue = sum(faceValue for active investments) + cashBalance
progressPercentage = (currentPortfolioValue / 10_000_000) * 100
remainingToGoal = 10_000_000 - currentPortfolioValue
```

## Recent Changes (November 2025)
- **Cash-Funded Investment System**: Complete implementation of automatic cash deduction with validation and balance checking
- **Enhanced Goal Calculator**: Portfolio-linked planning with progress tracking, smart alerts, and Vision 2040 integration
- **Complete Sukuk System Integration**: Implemented intelligent cashflow generation understanding Sukuk structure (face value + profits)
- **Financial Accuracy Improvements**: All metrics now properly separate capital (faceValue) from profit (totalExpectedProfit)
- **Analytics Enhancements**: Charts filter profit vs principal to prevent double-counting and provide accurate reporting
- **UI/UX Polish**: Investment cards, payment schedule, auto-calculation, cash funding validation, and goal tracking all working seamlessly
- **Bug Fixes**: Cash balance API response parsing corrected to handle `{ balance: number }` structure
- **Production Ready**: Full end-to-end testing passed with architect approval

## External Dependencies
-   **Charting:** Recharts for data visualization.
-   **Database:** Currently uses in-memory storage (MemStorage), with future plans for migration to PostgreSQL.
-   **Third-Party Integrations:** Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) for automatic data synchronization is planned.
