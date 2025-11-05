# A.Z Finance Hub – Vision 2040

## Project Overview
A.Z Finance Hub is an intelligent personal investment management platform designed for Sukuk-based portfolios and crowdfunding debt platforms (Sukuk, Manfa'a, Lendo). Built with a Vision 2040 roadmap, this application provides comprehensive portfolio tracking, cashflow management, and AI-powered analytics.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn UI
- **Backend**: Express.js + Node.js
- **Data Storage**: In-memory storage (MemStorage) for MVP
- **Charts**: Recharts for data visualization
- **State Management**: TanStack Query (React Query)
- **Routing**: Wouter
- **Styling**: Tailwind CSS with custom A.Z Finance Hub design tokens

## Key Features Implemented

### 1. Dashboard
- Portfolio overview with 4 key metrics (Total Capital, Total Returns, Average IRR, Progress to 2040)
- Portfolio performance chart
- Upcoming cashflows widget
- Recent investments table

### 2. Investments Management
- View all investments across platforms
- Add new investments with detailed form
- Edit existing investments
- Platform-based categorization (Sukuk, Manfa'a, Lendo)
- Risk score visualization
- IRR tracking

### 3. Cashflow Tracking
- Comprehensive cashflow table
- Status indicators (Received, Expected, Upcoming)
- Distribution type tracking (Profit, Principal)
- Total received and expected metrics
- Quarterly/semi-annual distribution support

### 4. Analytics
- Monthly returns trend chart
- Platform allocation pie chart
- Performance vs 2040 target comparison
- Tabbed interface for different analytics views

### 5. Timeline
- Complete investment history
- Event timeline (investments started, matured, distributions received)
- Visual timeline with icons and status indicators

### 6. Alerts System
- Smart notifications for distributions, maturities, and risks
- Unread count badge
- Mark as read functionality
- Severity-based color coding

### 7. Design System
- **Color Scheme**: 
  - Dark mode primary: #0F172A (background), #2563EB (primary action), #22C55E (success)
  - Light mode: #F8FAFC (background), #3B82F6 (primary)
- **Fonts**: Tajawal (Arabic), Poppins (English)
- **Dark/Light Mode**: Full theme toggle support
- **Bilingual Support**: Arabic/English language toggle with full translations

## Design Tokens
The application implements a comprehensive design system with:
- Custom color variables for light/dark modes
- Consistent spacing (p-4, p-6, p-8, gap-6)
- Typography hierarchy (3xl, 2xl, xl, lg, base, sm, xs)
- Interactive states (hover-elevate, active-elevate-2)
- Responsive grid layouts

## Data Model
### Entities:
1. **Platforms**: Investment platforms (Sukuk, Manfa'a, Lendo)
2. **Investments**: Individual investment opportunities with platform association
3. **Cashflows**: Profit distributions and principal returns
4. **Alerts**: System notifications and user alerts
5. **PortfolioStats**: Calculated portfolio metrics
6. **AnalyticsData**: Aggregated analytics for visualization

## API Endpoints
- `GET /api/platforms` - List all platforms
- `GET /api/investments` - List all investments with platform details
- `POST /api/investments` - Create new investment
- `PATCH /api/investments/:id` - Update investment
- `GET /api/cashflows` - List all cashflows with investment details
- `POST /api/cashflows` - Create cashflow
- `PATCH /api/cashflows/:id` - Update cashflow
- `GET /api/alerts` - List all alerts
- `PATCH /api/alerts/:id/read` - Mark alert as read
- `GET /api/portfolio/stats` - Get portfolio statistics
- `GET /api/analytics` - Get analytics data

## Sample Data
The application seeds with:
- 3 platforms (Sukuk, Manfa'a, Lendo)
- 2 active investments (Sukuk 2025-A, Manfa'a Growth Fund)
- 3 cashflows (1 received, 2 upcoming)
- 1 sample alert

## Development
- **Start**: `npm run dev` (already configured in workflow)
- **Port**: 5000 (Vite dev server + Express backend)
- **Hot Reload**: Automatic via Vite HMR

## Testing
All interactive elements and data displays include `data-testid` attributes for E2E testing:
- `data-testid="page-{pagename}"` for pages
- `data-testid="button-{action}"` for buttons
- `data-testid="card-{type}-{id}"` for cards
- `data-testid="stat-{metric}"` for statistics

## Vision 2040 Roadmap
### Phase 1 (MVP - Current)
✅ Core portfolio management
✅ Investment tracking
✅ Cashflow monitoring
✅ Basic analytics
✅ Bilingual support (EN/AR)
✅ Dark/Light mode

### Phase 2 (Next)
- PostgreSQL database for persistence
- AI-powered predictions using OpenAI
- Platform API integrations (Sukuk, Manfa'a, Lendo)
- Advanced risk scoring algorithms
- Automated profit reinvestment

### Phase 3 (2030)
- International platform support
- Advanced AI analytics
- Custom investment strategies
- Mobile apps (iOS/Android native)

### Phase 4 (2040)
- Fully autonomous investment management
- AI-driven portfolio optimization
- Global multi-currency support
- Financial independence tools

## User Preferences
- Default theme: Dark mode
- Default language: English (supports Arabic)
- Currency: SAR (Saudi Riyal)
- Date format: en-US locale

## Notes for Future Development
- The in-memory storage will be replaced with PostgreSQL
- AI predictions will integrate with OpenAI API
- Platform APIs will be connected for automatic data sync
- Authentication system will be added for multi-user support
- Export functionality (PDF/Excel) will be enhanced
