# A.Z Finance Hub

## Overview
A.Z Finance Hub is an intelligent personal investment management platform focused on Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Its purpose is to provide comprehensive portfolio tracking, cashflow management, and AI-powered analytics, aligning with a Vision 2040 roadmap for financial independence. The platform aims to offer a robust and intuitive solution for managing Sharia-compliant investments, with capabilities for investment tracking, cashflow monitoring, advanced analytics, and AI-driven insights to guide users toward their long-term financial goals.

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale

## System Architecture
The application is built with a modern web stack:
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI, Recharts for charting, Wouter for routing, TanStack Query for state management, and react-grid-layout for customizable widgets.
- **Backend**: Express.js and Node.js.
- **Styling**: Tailwind CSS with custom A.Z Finance Hub design tokens, supporting a comprehensive design system with custom color variables, typography hierarchy, and interactive states.
- **UI/UX Decisions**:
    - **Dashboard**: Features two view modes:
        - **Classic View**: Compact stat cards, platform overview section with clickable cards, portfolio performance charts, upcoming cashflows, and recent investments table.
        - **Grid View** (Pro Mode Only): Customizable widget dashboard with drag-and-drop, resize, hide/show functionality. Includes 3 widgets: Stats Overview, Platform Cards, and Portfolio Chart. Layout preferences are saved to the database.
    - The dashboard supports a "Pro mode" toggle for advanced features like Cash Balance Widget, Goal Calculator, and Grid Dashboard.
    - **Investment Management**: Allows viewing, adding, and editing investments, with platform-based categorization, risk scoring, and real-time ROI calculations.
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
- **Core Entities**: Platforms, Investments, Cashflows, CashTransactions, Alerts, UserSettings (with dashboardLayout and hiddenWidgets for widget customization), PortfolioStats, and AnalyticsData.

## External Dependencies
- **AI/ML**: OpenAI GPT-5 (for Smart Advisor features like recommendations, risk analysis, and cashflow forecasting).
- **Charting**: Recharts.
- **Database**: In-memory storage (MemStorage) is currently used for MVP, with a planned migration to PostgreSQL for persistence.
- **Third-Party Integrations**: Future integration with external platform APIs (Sukuk, Manfa'a, Lendo) is planned for automatic data synchronization.