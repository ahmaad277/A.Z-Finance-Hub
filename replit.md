# A.Z Finance Hub

## Overview
A.Z Finance Hub is an intelligent personal investment management platform focused on Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Its purpose is to provide comprehensive portfolio tracking, cashflow management, and AI-powered analytics, aligning with a Vision 2040 roadmap for financial independence. The platform aims to offer a robust and intuitive solution for managing Sharia-compliant investments, with capabilities for investment tracking, cashflow monitoring, advanced analytics, and AI-driven insights to guide users toward their long-term financial goals.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale
- **Mobile Optimized**: Full responsive design for all screen sizes (mobile, tablet, desktop)

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts for charting, Wouter for routing, TanStack Query for state management, and react-grid-layout for customizable widgets.
- **Backend**: Express.js and Node.js with session-based authentication.
- **Authentication**: Full authentication system with:
    - Session-based login with encrypted sessions (PostgreSQL session store for persistence)
    - User selection dropdown on login page (all active users)
    - Self-registration endpoint (/api/v2/auth/register) - new users default to Viewer role
    - Profile update endpoint (/api/v2/auth/update-profile) - users can change email/password without MANAGE_USERS permission
    - "Remember me" functionality (30-day sessions)
    - Password hashing using scrypt with salt
    - Default owner user: **A.Z** (email: az@azfinance.sa, password: az2040)
    - Protected routes using ProtectedRoute component
    - useAuth hook for accessing current user and login/logout actions
- **Styling**: Tailwind CSS with custom A.Z Finance Hub design tokens, supporting a comprehensive design system with custom color variables, typography hierarchy, and interactive states.
- **UI/UX Decisions**:
    - **Dashboard**: Features two view modes:
        - **Classic View**: Compact stat cards, **mobile-responsive Financial Metrics & Status grid** (13 metric/status cards with 2-column mobile, 4-5 column desktop layout), platform overview section with clickable cards, portfolio performance charts, upcoming cashflows, and recent investments table.
        - **Grid View** (Pro Mode Only): Customizable widget dashboard with drag-and-drop, resize, hide/show functionality. Includes 24 comprehensive widgets:
            - **Financial Metrics** (8 widgets): Portfolio Value, Cash Available, Returns Ratio, Cash Ratio, Portfolio APR, Portfolio ROI, Avg Duration, Avg Amount
            - **Status Counters** (5 widgets): Total Investments, Active, Completed, Late, Defaulted
            - **Interactive Charts** (2 widgets): Status Distribution Pie Chart, Platform Distribution Pie Chart (with value/count toggle)
            - **Legacy Widgets** (9 widgets): Stats Overview, Platform Cards, Portfolio Chart, Upcoming Cashflows, Recent Investments, Cash Balance, Goal Calculator, Quick Actions
            - Layout preferences are saved to the database with deep copy protection for mutations
            - Widget categories: metrics, counters, charts, stats, professional, actions
    - The dashboard supports a "Pro mode" toggle for advanced features like Cash Balance Widget, Goal Calculator, and Grid Dashboard.
    - **Investment Management**: Features a horizontal row-based layout for efficient space utilization on desktop, with responsive mobile layout that stacks information vertically. Desktop view displays investments as thin rows with status-based color coding (active: green tint, completed: muted, pending: blue tint). Each row shows: duration in months, expected payment date, nominal value, net profit, ROI percentage, average payment amount, payment count, and a visual progress indicator with small boxes (6px × 6px) representing received vs. remaining payments. Mobile view uses a grid layout (2 columns) to show key stats: amount, total returns, ROI, end date, and payment progress. Includes platform-based categorization, risk scoring, and real-time ROI calculations. Full RTL support for Arabic and responsive design for all screen sizes.
    - **Cashflow Tracking**: Provides a detailed table with status indicators and distribution type tracking.
    - **Analytics**: Includes monthly returns trends, platform allocation pie charts, and performance vs. 2040 target comparisons through a tabbed interface.
    - **Alerts System**: Smart alerts with user-configurable settings (enable/disable automatic alerts, configurable alert days before, late payment alerts, manual generation), severity-based classification, and in-app management.
    - **Smart Advisor (المستشار الذكي)**: A tabbed interface (Overview, Recommendations, Risk Analysis, Forecast) powered by AI, featuring an enhanced visual design with gradient headers, animated transitions, improved card layouts, and bilingual support (English/Arabic with RTL awareness). It provides personalized recommendations, risk assessments, and cashflow predictions.
    - **Platform Management**: Includes dedicated platform details pages with statistics and filtered investment lists, and enhanced management options within settings.
    - **Cash Management System**: Tracks cash balances and transactions (deposits, withdrawals, transfers, investments, distributions) with real-time balance calculations.
    - **Goal Calculator**: A dynamic investment goal calculator for Vision 2040 planning, offering real-time projections and an interactive growth chart.
    - **Smart Payment Processing**: An enhanced dialog for completing investments, featuring automatic date confirmation, single-click processing, and ROI calculation.
    - **Widget System**: A modular, extensible widget architecture featuring:
        - Widget Registry pattern for easy addition of new widgets
        - Deep copy protection to prevent layout mutation bugs
        - Persistent layout storage in UserSettings (dashboardLayout, hiddenWidgets fields)
        - View mode filtering (simple/professional widgets)
        - Full bilingual support with responsive design
        - localStorage preference persistence for view mode (Classic vs Grid)
    - **Design System**: Implements dark/light mode, full bilingual support (English/Arabic) with RTL typography enhancements (e.g., Arabic secondary text sizing, muted text font-weight adjustment, sidebar auto-close on navigation).
    - **Roles & Permissions System** (Multi-User):
        - **6 Role Types**: Owner, Admin, Advanced Analyst, Basic Analyst, Data Entry, Viewer
        - **29 Permissions** organized in 11 categories: System, Data Access, Investments, Cashflows, Cash, Analytics, Users, Export/View Requests, Roles, Alerts, Platform Management
        - **Granular Permission Gates**: Separate permissions for create, edit, and delete operations (e.g., CREATE_ROLES, EDIT_ROLES, DELETE_ROLES)
        - **Atomic Transactions**: Role creation/update uses database transactions for data consistency
        - **Field-Level Masking**: Sensitive data masked based on VIEW_ABSOLUTE_AMOUNTS, VIEW_PERCENTAGES, VIEW_SENSITIVE permissions
        - **Admin Section**: Sidebar section with Users and Roles management, visible only with appropriate permissions
        - **Audit Logging**: All sensitive actions tracked with actor, action type, target details, and IP address
        - **Impersonation**: Admins can view/operate as other users with full audit trail
        - **Temporary Roles**: Time-limited role assignments with automatic expiration
        - **Export/View Approval Workflows**: Request-based access for sensitive operations
        - **Translation System**: Comprehensive English/Arabic translations for all permission categories and role management UI
- **Financial Metrics System**: Comprehensive calculation utilities (`lib/dashboardMetrics.ts`) for:
    - Portfolio calculations: Total value, cash ratio, investment returns (actual vs expected)
    - Performance metrics: APR (Annual Percentage Rate), ROI (Return on Investment)
    - Statistical analysis: Average duration, average amount, average payment
    - Status tracking: Late investments (overdue cashflows), Defaulted investments (>60 days overdue)
    - Platform distribution: Value and count breakdown by platform
    - All calculations respect date ranges and support real-time filtering
- **Core Entities**: Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings (with dashboardLayout and hiddenWidgets for widget customization), PortfolioStats, AnalyticsData, Users, Roles, Permissions, RolePermissions, UserPlatforms, TemporaryRoles, AuditLogs, ExportRequests, ViewRequests, ImpersonationSessions.

## External Dependencies
- **AI/ML**: OpenAI GPT-5 (for Smart Advisor features like recommendations, risk analysis, and cashflow forecasting).
- **Charting**: Recharts.
- **Database**: In-memory storage (MemStorage) is currently used for MVP, with a planned migration to PostgreSQL for persistence.
- **Third-Party Integrations**: Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) is planned for automatic data synchronization.