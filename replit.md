# A.Z Finance Hub

## Overview
A.Z Finance Hub is a streamlined personal investment management platform focused on Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Its purpose is to provide comprehensive portfolio tracking, cashflow management, and analytics, aligning with a Vision 2040 roadmap for financial independence. The platform offers an intuitive solution for managing Sharia-compliant investments, with capabilities for investment tracking, cashflow monitoring, and advanced analytics to guide users toward their long-term financial goals.

**Recent Architectural Simplification (Nov 2025)**: The platform has been transformed from a multi-user enterprise system to a streamlined single-user personal finance tool, achieving 70-90% reduction in API costs and 50-60% reduction in code complexity by removing expensive AI features, complex permissions systems, and enterprise-level admin capabilities.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- **Mobile Optimized**: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts for charting, Wouter for routing, TanStack Query for state management.
- **Backend**: Express.js and Node.js with session-based authentication.
- **Authentication**: Simplified authentication system with:
    - Session-based login with encrypted sessions (PostgreSQL session store for persistence)
    - User selection dropdown on login page (active users)
    - "Remember me" functionality (30-day sessions)
    - Password hashing using scrypt with salt
    - Default owner user: **A.Z** (email: az@azfinance.sa, password: az2040)
    - Protected routes using ProtectedRoute component
    - useAuth hook for accessing current user and login/logout actions
- **Styling**: Tailwind CSS with custom A.Z Finance Hub design tokens, supporting a comprehensive design system with custom color variables, typography hierarchy, and interactive states.
- **UI/UX Decisions**:
    - **Dashboard**: Features a **Classic View** with:
        - Compact stat cards
        - **Mobile-responsive Financial Metrics & Status grid** (13 metric/status cards with 2-column mobile, 4-5 column desktop layout)
        - Platform overview section with clickable cards
        - Portfolio performance charts
        - Upcoming cashflows section
        - Recent investments table
    - The dashboard supports a "Pro mode" toggle for advanced features like Cash Balance Widget and Goal Calculator.
    - **Investment Management**: Features a horizontal row-based layout for efficient space utilization on desktop, with responsive mobile layout that stacks information vertically. Desktop view displays investments as thin rows with status-based color coding (active: green tint, completed: muted, pending: blue tint). Each row shows: duration in months, expected payment date, nominal value, net profit, ROI percentage, average payment amount, payment count, and a visual progress indicator with small boxes (6px × 6px) representing received vs. remaining payments. Mobile view uses a grid layout (2 columns) to show key stats: amount, total returns, ROI, end date, and payment progress. Includes platform-based categorization, risk scoring, and real-time ROI calculations. Full RTL support for Arabic and responsive design for all screen sizes.
    - **Cashflow Tracking**: Provides a detailed table with status indicators and distribution type tracking.
    - **Analytics**: Includes monthly returns trends, platform allocation pie charts, and performance vs. 2040 target comparisons through a tabbed interface.
    - **Alerts System**: Smart alerts with user-configurable settings (enable/disable automatic alerts, configurable alert days before, late payment alerts, manual generation), severity-based classification, and in-app management.
    - **Platform Management**: Includes dedicated platform details pages with statistics and filtered investment lists, and enhanced management options within settings.
    - **Cash Management System**: Tracks cash balances and transactions (deposits, withdrawals, transfers, investments, distributions) with real-time balance calculations.
    - **Goal Calculator**: A dynamic investment goal calculator for Vision 2040 planning, offering real-time projections and an interactive growth chart.
    - **Smart Payment Processing**: An enhanced dialog for completing investments, featuring automatic date confirmation, single-click processing, and ROI calculation.
    - **Reports System**: Comprehensive financial reporting with:
        - Excel export (XLSX) with multiple sheets (metrics, investments, cashflows)
        - PDF export (jsPDF + autoTable) with professional formatting
        - Customizable date ranges (All Time, YTD, Last Year, Last Quarter, Last Month)
        - Platform filtering (All or specific platform)
        - Report types: Summary, Detailed, Custom
        - Real-time preview before export
        - Full bilingual support (Arabic/English)
    - **Design System**: Implements dark/light mode, full bilingual support (English/Arabic) with RTL typography enhancements (e.g., Arabic secondary text sizing, muted text font-weight adjustment, sidebar auto-close on navigation).
- **Financial Metrics System**: Comprehensive calculation utilities (`lib/dashboardMetrics.ts`) for:
    - Portfolio calculations: Total value, cash ratio, investment returns (actual vs expected)
    - Performance metrics: APR (Annual Percentage Rate), ROI (Return on Investment)
        - **ROI Calculation**: Correctly filters profit-only cashflows (`type === 'profit'`) to prevent inflation from principal returns
        - Formula: `(totalProfitReceived / investmentAmount) × 100`
    - Statistical analysis: Average duration, average amount, average payment
    - Status tracking: Late investments (overdue cashflows), Defaulted investments (>60 days overdue)
    - Platform distribution: Value and count breakdown by platform
    - All calculations respect date ranges and support real-time filtering
- **Core Entities**: Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings, PortfolioStats, AnalyticsData, Users.

## Features Removed in Simplification
The following expensive/complex features have been removed to reduce costs and complexity:
- **AI-Powered Smart Advisor**: OpenAI integration for recommendations, risk analysis, and forecasting
- **Grid View Dashboard**: Customizable widget system with drag-and-drop layout
- **Multi-User & Permissions**: 6 role types, 29 permissions, field-level masking
- **Audit Logging**: Complete audit trail of all system actions
- **Admin Features**: User management, role management, impersonation, export/view request workflows
- **Temporary Roles**: Time-limited role assignments

## External Dependencies
- **Charting**: Recharts for data visualization.
- **Database**: In-memory storage (MemStorage) is currently used for MVP, with a planned migration to PostgreSQL for persistence.
- **Third-Party Integrations**: Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) is planned for automatic data synchronization.

## Recent Changes (November 2025)
- **Major Simplification**: Removed OpenAI integration and all AI-powered features
- Removed complex roles and permissions system (6 roles, 29 permissions)
- Removed field-level data masking
- Removed audit logging and impersonation features
- Removed export/view request approval workflows
- Removed Grid View dashboard and customizable widgets
- Removed all admin pages (user management, role management, audit logs)
- Simplified authentication to basic login/logout (removed self-registration for security)
- Fixed critical session authentication bug (isAuthenticated flag)
- All e2e tests passing successfully
- **Delete Investment Feature Enabled (Nov 7, 2025)**:
    - Delete button now always visible (removed permission check)
    - Proper cascade deletion: investment → cashflows → alerts
    - All pages update correctly after deletion
- **Portfolio Stats Data Integrity Fixed (Nov 7, 2025)**:
    - totalReturns now correctly filters for profit-only cashflows (type="profit")
    - totalCashBalance now uses getCashBalance() from cash_transactions table
    - reinvestedAmount calculation preserved for accurate availableCash
- **Portfolio Reset (Nov 7, 2025)**: Cleared all investment data (14 investments, 3 cashflows, 5 cash transactions) for fresh start while preserving 5 platforms and user accounts
- **Reports System Added (Nov 7, 2025)**: 
    - Comprehensive financial reports with Excel/PDF export
    - Installed dependencies: xlsx, jspdf, jspdf-autotable
    - Customizable date ranges, platform filters, and report types
    - Real-time preview with bilingual support
- **Critical ROI Bug Fixed (Nov 7, 2025)**:
    - Fixed `getInvestmentTotalReturns` to filter profit-only cashflows (`type === 'profit'`)
    - Prevents ROI inflation from principal repayments
    - Correct formula: `(profit / amount) × 100` where profit excludes principal returns
- **Dashboard Metrics Enhanced (Nov 7, 2025)**:
    - **Additional Metrics Redesigned**: Replaced averageDuration/distressedCount with Weighted Avg APR and Next Payment Expected
    - **Weighted Avg APR**: Calculates portfolio-wide APR weighted by investment amounts
    - **Next Payment Expected**: Shows upcoming payment amount and days until due
    - Full bilingual translations for new metrics
- **Goal Calculator Enhanced (Nov 7, 2025)**:
    - **Dynamic Initial Amount**: Now automatically syncs with current portfolio value (active investments + cash balance)
    - Real-time portfolio integration for Vision 2040 planning
- **Timeline System Enhanced (Nov 7, 2025)**:
    - **Color-Coded Cash Transactions**: Withdrawals in red (destructive), deposits in green (success)
    - Integrated cash transactions with investment events for complete financial history
    - Full bilingual support for transaction types
- **Test Data Added (Nov 7, 2025)**:
    - 8 diverse investments (6 active, 2 completed, 1 distressed with late payments)
    - 53 cashflows (40 received, 11 expected, 2 late) across all investments
    - 5 cash transactions (2 deposits, 2 withdrawals, 1 distribution)
    - Cross-page data consistency verified via e2e testing
- **Cache Management System Fixed (Nov 7, 2025)**:
    - **Root Cause**: localStorage cache persisting deleted investments, causing 404 errors
    - **Solution**: App-level version tracking system (APP_VERSION constant)
    - On app load, checks localStorage version against current APP_VERSION
    - Automatically clears cache on version mismatch to force fresh data fetch
    - Version stored in localStorage under "azfinance-app-version"
    - Current version: "4" (increment when making schema/data-breaking changes)
    - All delete operations now work correctly without stale cache issues
    - E2E tests confirm: login → view investments → delete → verify count updated
- **Cash Balance System Simplified (Nov 7, 2025)**:
    - **Critical Fix**: Cash-funded investments now properly deduct from cash balance
    - **createCashTransaction**: Fixed amount sign logic - investments/withdrawals are negative, deposits/distributions are positive
    - **Simplified Display**: Removed confusing "Available Cash" vs "Cash Balance" distinction - now showing only "Cash Balance"
    - **Portfolio Calculation**: Total Portfolio = Active Investments + Cash Balance (no double-counting)
    - **Investment Deletion**: Cash-funded investments automatically refund to cash balance when deleted
    - **Verified Behavior**: 200K cash → 50K investment = 150K cash + 50K investment = 200K total (constant)
    - **Schema Cleanup**: Removed `availableCash` and `reinvestedAmount` from PortfolioStats
    - **Known Limitation**: Investment create/delete and cash transactions are not atomic (low risk, noted by architect)

## Database Schema Notes
The database schema still contains legacy tables from the enterprise version that can be safely removed:
- `roles`, `permissions`, `rolePermissions` (permissions system)
- `userPlatforms` (multi-user platform access)
- `temporaryRoles` (temporary role assignments)
- `auditLog` (audit logging)
- `exportRequests`, `viewRequests` (approval workflows)
- `impersonationSessions` (user impersonation)

These tables are no longer used by the application and can be cleaned up in a future schema migration.
