# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform for tracking and analyzing Sharia-compliant investments, including Sukuk-based portfolios and crowdfunding debt. It offers portfolio tracking, cashflow management, and analytics to support users in achieving financial independence aligned with Saudi Arabia's Vision 2040. The platform is designed as a single-user tool to provide focused Sharia-compliant financial management.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- Number Format: All numbers display in English digits (0-9) across both English and Arabic interfaces, using `Intl.NumberFormat('en-US')` consistently throughout the application
- Layout Direction: Permanent RTL - Application maintains right-to-left (RTL) layout regardless of language for optimal right-hand mobile usage
- Mobile Optimized: Full responsive design for all screen sizes (mobile, tablet, desktop)
- Mobile Gesture Navigation: Swipe from right edge (>50px from edge) to left on mobile devices to open sidebar navigation

## System Architecture
The application is a single-user personal tool built with a modern web stack, operating without authentication.

**UI/UX Decisions:**
- **Dashboard:** Features "Classic View" and "Pro mode" for advanced features.
- **Investment Management:** Displays investments with status-based color coding, payment progress, and real-time ROI. Offers three view modes: Ultra-Compact, Compact, and Expanded, all designed for high information density.
- **Unified Cashflows Interface:** An integrated page (`/cashflows`) combining Investment Cashflows and Cash Management with tabs and a combined statistics dashboard.
- **Analytics:** Includes monthly returns trends, platform allocation with interactive three-mode switching (All Value/Active Value/Count), and performance comparisons against Vision 2040 targets, separating principal from profit.
- **Alerts System:** Smart, user-configurable alerts with severity classification.
- **Platform Management:** Dedicated pages for platform details, statistics, and filtered investment lists with CRUD operations.
- **Vision 2040 Progress Calculator:** Unified interface at `/vision-2040` with an integrated chart showing current projection, adaptive target, and historical actuals, featuring editable inputs and full bilingual support.
- **Reports System:** Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, and platform filtering. Supports independent report language selection and full bilingual PDF export with RTL formatting.

**Technical Implementations & Design Choices:**
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
- **Backend:** Express.js and Node.js.
- **Styling:** Tailwind CSS with custom design tokens, dark/light mode, and full bilingual support (English/Arabic) with RTL typography.
- **Performance Optimizations:** Code splitting, Suspense boundaries, and optimized component re-renders.
- **Error Handling:** Global ErrorBoundary component.
- **Progressive Web App (PWA):** Full PWA support with versioned service worker for caching and offline navigation.
- **Number Formatting:** Unified `Intl.NumberFormat('en-US')` for consistent English digit display.
- **Automatic Arabic-to-English Number Conversion:** Global normalization system for text inputs (excluding date, email, password) that converts Arabic numerals to English.
- **Mobile Swipe Gesture Navigation:** Custom `useSwipeGesture` hook for sidebar navigation.
- **Design System Unification:** Standardized reusable primitives and components.
- **Cashflow Forecast Chart:** Rebuilt as a horizontal stacked bar chart for readability.
- **Financial Metrics System:** Comprehensive utilities for calculating portfolio value, cash ratio, investment returns, APR, and statistical analysis.
- **Three-Mode Platform Distribution System:** Interactive chart system for platform allocation with `localStorage` persistence.
- **Platform Color System:** Centralized platform-specific color definitions with smart fallback.
- **Smart Pie Chart Label System:** Intelligent label positioning for platform distribution charts.
- **Core Entities:** Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData, SavedScenarios.
- **Cache Management:** App-level version tracking, `refetchOnMount: true` for investments, global `staleTime: Infinity` for offline support, and targeted `refetchQueries`.
- **Smart Sukuk Cashflow System:** Automatic cashflow generation for Sukuk structures.
- **Custom Distribution Scheduling:** Backend system for manual cashflow scheduling.
- **Automatic Investment Status Management:** Background task system for hourly status transitions (Active → Late → Defaulted → Completed).
- **Late Status Management System:** Comprehensive late payment handling.
- **Atomic Cash Transaction Automation System:** Automatic cash movement tracking with database transactions.
- **Cash Balance Calculation:** Platform-specific balance aggregation.
- **Portfolio Checkpoint System:** Full snapshot backup/restore functionality.
- **Data-Entry Sharing System:** Secure token-based system for external users to manage investments with UI isolation and multi-layer security.
- **Platform Fee Management System:** Automatic profit deduction based on configurable platform fees. The system stores NET PROFIT (`totalExpectedProfit`) after fee deduction. Gross profit is reverse-calculated for display.
- **Intelligent Sukuk Seed System (v1.0.2):** Comprehensive seed script (`server/seed-sukuk.ts`) for AI-assisted bulk investment entry with smart cashflow generation. Key features:
  - **Correct Financial Calculations:** Profit = Total Amount - Face Value; ROI% = total return from images; IRR = annual rate (ROI% ÷ years)
  - **Smart Frequency Inference:** Analyzes duration/payment ratio with tolerance bands (monthly: <1.5 months, quarterly: 1.5-4.5 months, custom: >4.5 months)
  - **Proportional Cashflow Distribution:** Uses `Math.round((i + 1) * intervalMonths)` to ensure exactly `paymentCount` cashflows ending precisely on `endDate`
  - **Accurate Timeline Alignment:** For active investments, uses fractional intervals (`duration/paymentCount`) to back-calculate start dates, ensuring all received cashflows fall on/before today and awaited cashflows in the future
  - **Two-Phase System:** Phase 1 inserts 26 completed investments with all cashflows received; Phase 2 adds 18 active investments with partial cashflows and correct received/awaited status
  - **AI Entry Tagging:** All seed entries tagged with "AI Entry" for tracking

## External Dependencies
- **Charting:** Recharts.
- **Database:** PostgreSQL (via Neon) with Drizzle ORM.
- **Deployment:** Railway platform.