# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform for tracking and analyzing Sharia-compliant investments, specifically Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). It provides comprehensive portfolio tracking, cashflow management, and analytics to help users achieve financial independence aligned with Saudi Arabia's Vision 2040. The platform is designed as a single-user tool to ensure simplicity and focus on Sharia-compliant financial management.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- Layout Direction: **Permanent RTL** - Application uses right-to-left layout for both English and Arabic, optimized for right-hand mobile usage
- Mobile Optimized: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application is a single-user personal tool built with a modern web stack, operating without authentication.

**UI/UX Decisions:**
- **Dashboard:** Simplified "Classic View" with compact financial metric cards and platform overview. A "Pro mode" toggle offers advanced features.
- **Investment Management:** Investments are displayed in a horizontal row-based layout for desktop and a stacked vertical layout for mobile, with status-based color coding, payment progress indicators, and real-time ROI calculations.
- **Unified Cashflows Interface:** A single integrated page (`/cashflows`) merges Investment Cashflows and Cash Management with three tabs: All Transactions, Investment Cashflows (with interactive payment schedule), and Cash Transactions. It features a combined statistics dashboard.
- **Analytics:** Includes monthly returns trends, platform allocation, and performance comparisons against Vision 2040 targets, separating principal from profit.
- **Alerts System:** Smart, user-configurable alerts with severity classification.
- **Platform Management:** Dedicated pages for platform details, statistics, and filtered investment lists.
- **Vision 2040 Progress Calculator:** A unified component for goal planning and progress tracking, featuring dual progress bars, an interactive timeline, smart indicators, and saved scenarios management.
- **Reports System:** Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, and platform filtering.

**Technical Implementations & Design Choices:**
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
- **Backend:** Express.js and Node.js.
- **Styling:** Tailwind CSS with custom design tokens, dark/light mode, and full bilingual support (English/Arabic) with RTL typography.
- **Design System Unification:** Standardized reusable primitives, consistent spacing, typography, card padding, grid gaps, icon sizing, and motion variants across all pages and components.
- **Mobile Chart Optimization:** Universal edge-to-edge chart pattern for optimal mobile viewing across all chart components, with self-contained responsive patterns and optimized heights.
- **Cashflow Forecast Chart Redesign:** Rebuilt as a horizontal stacked bar chart for enhanced readability of 40-month forecasts, separating principal and profit. Features inline numeric labels, dynamic height calculation, and mobile edge-to-edge rendering.
- **Financial Metrics System:** Comprehensive utilities for calculating portfolio value, cash ratio, investment returns (profit-only ROI), APR, and statistical analysis, respecting Sukuk structure.
- **Core Entities:** Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData, SavedScenarios.
- **Cache Management:** App-level version tracking, `refetchOnMount: true` for investments, global `staleTime: Infinity` for offline support, and targeted `refetchQueries` for efficient cache updates.
- **Smart Sukuk Cashflow System:** Intelligent automatic cashflow generation system that understands Sukuk structure, supports flexible profit payment schedules, and generates smart payment distributions based on frequency.
- **Custom Distribution Scheduling:** Production-ready backend system for manual cashflow scheduling with irregular payment patterns, offering CRUD support, transaction-safe operations, and comprehensive validation.
- **Automatic Investment Status Management:** Background task system for hourly status transitions (Active → Late → Defaulted → Completed), with centralized configuration, optimized cashflow grouping, and transaction-wrapped database updates.
- **Late Status Management System:** Comprehensive late payment handling with a dedicated dialog offering three reconciliation options: clear late status, keep unchanged, or update late days manually.
- **Atomic Cash Transaction Automation System:** Production-ready automatic cash movement tracking integrated throughout the investment lifecycle with three-layer protection for `createInvestment`, `updateCashflow`, and `completeAllPendingPayments`. All operations are wrapped in `db.transaction()` for ACID compliance.
- **Cash Balance Calculation:** Platform-specific balance aggregation using signed CASE logic, supporting legacy transactions via investment linkage.
- **Portfolio Checkpoint System:** Full snapshot backup/restore functionality, allowing users to save and restore complete portfolio states with metadata tracking, using transaction-safe operations.

## External Dependencies
- **Charting:** Recharts for data visualization.
- **Database:** Currently uses in-memory storage (MemStorage).