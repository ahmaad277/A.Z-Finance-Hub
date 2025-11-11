# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform designed for tracking and analyzing Sharia-compliant investments, specifically Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Its core purpose is to provide comprehensive portfolio tracking, cashflow management, and analytics to help users achieve financial independence aligned with Saudi Arabia's Vision 2040. The platform is built as a single-user tool to ensure simplicity and reduce operational overhead, offering a focused approach to Sharia-compliant financial management.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- Mobile Optimized: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application is a single-user personal tool built with a modern web stack, operating without authentication.

**UI/UX Decisions:**
-   **Dashboard:** Features a "Classic View" with compact financial metric cards, platform overview, portfolio performance charts, upcoming cashflows, and recent investments. A "Pro mode" toggle offers advanced features.
-   **Investment Management:** Investments are displayed in a horizontal row-based layout for desktop and a stacked vertical layout for mobile, with status-based color coding, payment progress indicators, platform categorization, risk scoring, and real-time ROI calculations. An ultra-compact 40px investment row view is available for mobile, displaying essential metrics and opening a detailed drawer on click.
-   **Cashflow Tracking:** A detailed table with status indicators and distribution type tracking, including an interactive, color-coded payment schedule system.
-   **Analytics:** Includes monthly returns trends, platform allocation pie charts, and performance comparisons against Vision 2040 targets. All analytics are designed to respect Sukuk structure by separating principal from profit.
-   **Alerts System:** Smart, user-configurable alerts with severity classification.
-   **Platform Management:** Dedicated pages for platform details, statistics, and filtered investment lists.
-   **Cash Management System:** Tracks cash balances and transactions (deposits, withdrawals, transfers, investments, distributions) with real-time balance calculations and automatic cash distribution for received cashflows. It also supports automatic cash deduction for investments directly from the cash balance with intelligent validation.
-   **Goal Calculator:** A dynamic investment goal calculator linked to portfolio data for Vision 2040 planning, offering real-time projections, progress bars, gap indicators, and smart alerts based on projected future value.
-   **Smart Payment Processing:** Enhanced dialog for investment completion with automatic date confirmation and ROI calculation.
-   **Reports System:** Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, and platform filtering.

**Technical Implementations & Design Choices:**
-   **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
-   **Backend:** Express.js and Node.js.
-   **Styling:** Tailwind CSS with custom design tokens, dark/light mode, and full bilingual support (English/Arabic) with RTL typography.
-   **Financial Metrics System:** Comprehensive utilities for calculating portfolio value, cash ratio, investment returns (profit-only ROI), APR, statistical analysis, and tracking late/defaulted investments. Includes Weighted APR and Portfolio ROI calculations that respect Sukuk structure (capital vs. profit separation).
-   **Core Entities:** Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData.
-   **Cache Management:** App-level version tracking clears localStorage cache on version mismatch. Investment query uses `refetchOnMount: true` to ensure fresh data on navigation, while global `staleTime: Infinity` preserves offline cache support. Mutation callbacks use `refetchQueries({ type: 'all' })` to force cache updates even when data considered fresh.
-   **Smart Sukuk Cashflow System:** Features an intelligent automatic cashflow generation system that understands Sukuk structure (faceValue + totalExpectedProfit), supports flexible profit payment schedules (periodic vs. at_maturity), and generates smart payment distributions based on frequency (monthly, quarterly, semi_annually, annually, at_maturity). The system includes `shared/cashflow-generator.ts` and enhanced schema with `faceValue`, `totalExpectedProfit`, `profitPaymentStructure` fields. Frontend components (Investment Dialog, Investment Cards, Payment Schedule Manager, Dashboard Metrics, Analytics) are fully integrated to reflect Sukuk-native calculations and displays, accurately separating principal from profit.
-   **Custom Distribution Scheduling:** Production-ready backend system for manual cashflow scheduling when investments have irregular payment patterns. Features: (1) `custom_distributions` table with full CRUD support via `customDistributions` API parameter; (2) Transaction-safe create/update operations with preserve/clear/replace logic (undefined=preserve existing, []=clear & regenerate, non-empty=replace); (3) Comprehensive validation requiring custom schedules when frequency='custom', enforcing positive amounts and date-range validation (startDate/endDate required for PATCH with custom distributions); (4) Automatic matching cashflow generation from custom distribution records; (5) Historical data preservation (received cashflows never deleted during updates); (6) `CustomCashflowEditor` component for adding/removing distribution rows with real-time totals. **Status:** Backend complete and architect-approved, frontend edit mode (hydrating existing custom distributions) deferred for future implementation.
-   **Automatic Investment Status Management:** Background task system with hourly periodic checks for status transitions (Active → Late → Defaulted → Completed). Features centralized status configuration utility (`shared/status-manager.ts`), optimized O(n) cashflow grouping, transaction-wrapped database updates with `lateDate`/`defaultedDate` tracking, and bilingual status display with distinct color schemes across all UI components.
-   **Cash Balance Calculation:** Implemented sum aggregation across all transactions for accurate cash balance.

## External Dependencies
-   **Charting:** Recharts for data visualization.
-   **Database:** Currently uses in-memory storage (MemStorage).