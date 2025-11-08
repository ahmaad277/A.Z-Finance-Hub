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

## External Dependencies
-   **Charting:** Recharts for data visualization.
-   **Database:** Currently uses in-memory storage (MemStorage), with future plans for migration to PostgreSQL.
-   **Third-Party Integrations:** Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) for automatic data synchronization is planned.