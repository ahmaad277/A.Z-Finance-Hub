# A.Z Finance Hub

## Overview
A.Z Finance Hub is a personal investment management platform focused on tracking and analyzing Sharia-compliant investments, specifically Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). It provides comprehensive portfolio tracking, cashflow management, and analytics to help users achieve financial independence aligned with Saudi Arabia's Vision 2040. The platform is designed as a single-user tool to ensure simplicity and focus on Sharia-compliant financial management.

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
- **Dashboard:** Simplified "Classic View" with a "Pro mode" toggle for advanced features.
- **Investment Management:** Displays investments with status-based color coding, payment progress, and real-time ROI.
- **Unified Cashflows Interface:** An integrated page (`/cashflows`) merging Investment Cashflows and Cash Management with tabs for All Transactions, Investment Cashflows, and Cash Transactions, including a combined statistics dashboard.
- **Analytics:** Features monthly returns trends, platform allocation with interactive three-mode switching (All Value/Active Value/Count), and performance comparisons against Vision 2040 targets, separating principal from profit.
- **Alerts System:** Smart, user-configurable alerts with severity classification.
- **Platform Management:** Dedicated pages for platform details, statistics, and filtered investment lists. Includes CRUD operations for platforms with validation.
- **Vision 2040 Progress Calculator:** Unified interface at `/vision-2040` with a single integrated chart showing current projection, adaptive target, and historical actuals. Features editable inputs, historical data table, full responsiveness, and complete bilingual support with compact spacing.
- **Reports System:** Comprehensive financial reporting with Excel (XLSX) and PDF export, customizable date ranges, and platform filtering. Features independent report language selection and full bilingual PDF export with Noto Sans Arabic font, RTL text alignment, and bidirectional table formatting. Includes a complete bilingual translation system for 77 report-related translation keys.

**Technical Implementations & Design Choices:**
- **Frontend:** React, TypeScript, Tailwind CSS, Shadcn UI, Recharts, Wouter, TanStack Query.
- **Backend:** Express.js and Node.js.
- **Styling:** Tailwind CSS with custom design tokens, dark/light mode, and full bilingual support (English/Arabic) with RTL typography.
- **Performance Optimizations:** Code splitting with React.lazy(), Suspense boundaries, and optimized component re-renders.
- **Error Handling:** Global ErrorBoundary component for user-friendly error recovery.
- **Code Quality:** Clean codebase, organized imports, and production-ready error handling.
- **Progressive Web App (PWA):** Full PWA support with versioned service worker (v1.0.1) for intelligent caching (static, runtime, network-only for APIs) and offline navigation. Includes PWA manifest with branded icons and theme color integration.
- **Number Formatting:** Unified `Intl.NumberFormat('en-US')` for consistent English digit display across all numeric values.
- **Automatic Arabic-to-English Number Conversion:** Global input handler in base Input component that automatically converts Arabic numerals (٠-٩) to English (0-9) in real-time during typing via `onBeforeInput` event. Applied to all text inputs (excluding date, email, password fields) for consistent data entry experience.
- **Mobile Swipe Gesture Navigation:** Custom `useSwipeGesture` hook for touch-based sidebar navigation on mobile devices.
- **Design System Unification:** Standardized reusable primitives, spacing, typography, and component design across the application.
- **Mobile Chart Optimization:** Universal edge-to-edge chart pattern for optimal mobile viewing.
- **Cashflow Forecast Chart Redesign:** Rebuilt as a horizontal stacked bar chart for enhanced readability of 40-month forecasts, separating principal and profit.
- **Financial Metrics System:** Comprehensive utilities for calculating portfolio value, cash ratio, investment returns (profit-only ROI), APR, and statistical analysis.
- **Three-Mode Platform Distribution System:** Interactive chart system for viewing platform allocation by "All Value", "Active Value", or "Count", with localStorage persistence and bilingual support.
- **Platform Color System:** Centralized platform-specific color definitions for consistent visual identity, with smart fallback to rotating palette colors for unknown platforms in charts.
- **Smart Pie Chart Label System:** Intelligent label positioning for platform distribution charts, with threshold-based internal/external label placement, connector lines for small slices, and responsive sizing.
- **Core Entities:** Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData, SavedScenarios.
- **Cache Management:** App-level version tracking, `refetchOnMount: true` for investments, global `staleTime: Infinity` for offline support, and targeted `refetchQueries`.
- **Smart Sukuk Cashflow System:** Automatic cashflow generation system understanding Sukuk structure and flexible payment schedules.
- **Custom Distribution Scheduling:** Backend system for manual cashflow scheduling with CRUD support and transaction-safe operations.
- **Automatic Investment Status Management:** Background task system for hourly status transitions (Active → Late → Defaulted → Completed) with transaction-wrapped database updates.
- **Late Status Management System:** Comprehensive late payment handling with reconciliation options.
- **Atomic Cash Transaction Automation System:** Automatic cash movement tracking integrated throughout the investment lifecycle with three-layer protection and database transactions for ACID compliance.
- **Cash Balance Calculation:** Platform-specific balance aggregation supporting legacy transactions.
- **Portfolio Checkpoint System:** Full snapshot backup/restore functionality with transaction-safe operations.
- **Data-Entry Sharing System:** Secure token-based system for external users to manage investments with complete UI isolation. Features triple-layer security architecture: (1) AppContent synchronous gating preventing owner UI rendering, (2) DataEntryProvider automatic redirect with route subscription, (3) RouteGuard client-side protection. Token persists in localStorage, supports both client-side and full-page navigation protection, and ensures zero owner UI exposure during all navigation attempts. Backend middleware protects API endpoints with per-request token validation.

## External Dependencies
- **Charting:** Recharts for data visualization.
- **Database:** PostgreSQL (via Neon) with Drizzle ORM.
- **Deployment:** Railway platform.

## Version History

### v1.0.1 (November 22, 2025)
**Real-Time Data Synchronization & Mobile Improvements**

**New Features:**
- Real-time data synchronization: Implemented 60-second automatic polling for critical queries (dashboard, investments, cashflows, data-entry) to keep data synchronized across devices
- Comprehensive changelog page: Added `/changelog` route with version history display, bilingual support, and integration into sidebar navigation
- Automatic Arabic-to-English number conversion: All input fields now automatically convert Arabic numerals (٠-٩) to English (0-9) during typing for consistent data entry

**Improvements:**
- Enhanced mobile keyboard: Changed numeric input fields (face value, expected IRR, total expected profit) from `type="number"` to `type="text"` with `inputMode="decimal"` to display comma/decimal separator on iOS keyboards
- Reverted to permanent RTL layout: Application now maintains right-to-left layout regardless of language selection for optimal right-hand mobile usage (language selection only affects text translations)
- Arabic decimal separator conversion: Enhanced conversion system to handle both Arabic decimal separator (٫) and Arabic comma (،), automatically converting them to English period (.)
- Face Value 5K+ button architecture: Refactored to use uncontrolled input with ref-based DOM reading, eliminating state synchronization issues between Arabic-to-English conversion and React state

**Bug Fixes:**
- Fixed iOS keyboard not showing decimal separator for financial input fields
- Fixed 5K+ button behavior: Button now correctly increments current value by 5000 instead of replacing it, working seamlessly with Arabic numeral auto-conversion
- Fixed controlled/uncontrolled input warnings in numeric fields

### v1.0.0 (Initial Release)
Complete Sharia-compliant investment management platform with Sukuk tracking, Vision 2040 calculator, bilingual support, PWA capabilities, and comprehensive financial reporting.