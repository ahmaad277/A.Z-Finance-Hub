# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform designed for Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). It provides comprehensive portfolio tracking, cashflow management, and analytics to support Sharia-compliant investments and aid users in achieving financial independence aligned with a Vision 2040 roadmap. The platform has been simplified from a multi-user enterprise system to a single-user tool, significantly reducing API costs and code complexity.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- **Mobile Optimized**: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application utilizes a modern web stack:
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
- **Backend**: Express.js and Node.js with session-based authentication.
- **Authentication**: Simplified session-based login with encrypted sessions (PostgreSQL store), "Remember me" functionality, scrypt password hashing, and protected routes. Default owner user: **A.Z** (az@azfinance.sa, az2040).
- **Styling**: Tailwind CSS with custom A.Z Finance Hub design tokens, including comprehensive dark/light mode and full bilingual support (English/Arabic) with RTL typography enhancements.
- **UI/UX Decisions**:
    - **Dashboard**: Features a "Classic View" with compact stat cards, a mobile-responsive financial metrics grid (13 cards), platform overview, portfolio performance charts, upcoming cashflows, and recent investments. Includes a "Pro mode" toggle for advanced features.
    - **Investment Management**: Displays investments in a horizontal row-based layout for desktop and a stacked vertical layout for mobile. Features status-based color coding, visual payment progress indicators, platform categorization, risk scoring, and real-time ROI calculations.
    - **Cashflow Tracking**: Detailed table with status indicators and distribution type tracking.
    - **Analytics**: Monthly returns trends, platform allocation pie charts, and performance vs. 2040 target comparisons via a tabbed interface.
    - **Alerts System**: Smart, user-configurable alerts with severity-based classification and in-app management.
    - **Platform Management**: Dedicated pages for platform details, statistics, and filtered investment lists.
    - **Cash Management System**: Tracks cash balances and transactions (deposits, withdrawals, transfers, investments, distributions) with real-time balance calculations. Automatic cash distribution for received cashflows.
    - **Goal Calculator**: Dynamic investment goal calculator for Vision 2040 planning, offering real-time projections and integrating current portfolio value.
    - **Smart Payment Processing**: Enhanced dialog for investment completion with automatic date confirmation and ROI calculation.
    - **Reports System**: Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, platform filtering, and real-time preview.
- **Financial Metrics System**: Comprehensive calculation utilities for portfolio value, cash ratio, investment returns (profit-only ROI), APR, statistical analysis, late/defaulted investment tracking, and platform distribution.
- **Core Entities**: Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData, Users.
- **Cache Management**: App-level version tracking to clear localStorage cache on version mismatch, preventing stale data issues.

## Recent Updates

### Cash Balance Calculation Fix (Nov 8, 2025)
- **Critical Bug Fixed**: Cash balance was calculated incorrectly using `balanceAfter` from latest transaction by `createdAt`
- **Problem**: Transactions added out of chronological order caused massive balance discrepancies
- **Solution**: 
  - `getCashBalance()` now uses SUM aggregation across all transactions
  - Deposits & distributions: +amount
  - Withdrawals & investments: -amount
  - No longer relies on `balanceAfter` field (deprecated)
- **Impact**: Balance is always accurate regardless of transaction creation order
- **Tested**: Multiple deposits/withdrawals verified with SQL (408,710 SAR ✓)
- **Performance**: O(n) aggregation query, suitable for current scale

### Auto Cash Distribution (Nov 7, 2025)
- **Feature**: Automatic cash transaction creation when cashflows are marked as "received"
- **Implementation**:
  - `updateCashflow` in server/storage.ts checks status change to "received"
  - Prevents duplicates by checking for existing cashflow-linked transactions
  - Smart classification based on cashflow type:
    - Profit distributions → source: "profit", notes: "Distribution from: {name}"
    - Principal returns → source: "investment_return", notes: "Principal return from: {name}"
- **Database**: Added `cashflow_id` column to `cash_transactions` table for full traceability
- **Impact**: Cash balance automatically increases when distributions/returns are received
- **Tested**: Verified with profit (2,500 SAR) and principal (10,000 SAR) cashflows

### Cash Transaction Buttons (Nov 7, 2025)
- **Green Deposit Button** (ArrowDown icon): Adds money to cash balance
  - Uses new variant="success" on Button component
  - Semantic color using chart-2 theme token (green)
- **Red Withdrawal Button** (ArrowUp icon): Removes money from cash balance
  - Uses variant="destructive" on Button component
- **Streamlined UI**: Removed separate Cash Management card from Dashboard
- **Header Layout**: Filter → Deposit → Withdrawal → Export Report

## External Dependencies
- **Charting**: Recharts for data visualization.
- **Database**: In-memory storage (MemStorage) currently, with planned migration to PostgreSQL.
- **Third-Party Integrations**: Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) for automatic data synchronization is planned.