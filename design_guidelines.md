# Design Guidelines: A.Z Finance Hub – Vision 2040

## Design Approach
**System-Based Approach**: Custom financial dashboard design system inspired by modern fintech applications (Stripe Dashboard, Linear's data views) with emphasis on data clarity, professional aesthetics, and bilingual support.

## Core Design Principles

### Typography
- **Arabic**: Tajawal (primary), IBM Plex Arabic (alternative)
- **English**: Poppins (primary), Inter (alternative)
- **Hierarchy**: 
  - Headers: 32px (2xl) bold
  - Section titles: 24px (xl) semibold
  - Card titles: 18px (lg) medium
  - Body text: 16px (base) regular
  - Secondary info: 15px (sm+) regular / medium weight for Arabic (improved readability)
  - Labels/captions: 12px (xs) medium
  
**Arabic Typography Enhancements**:
- Secondary text in Arabic uses `text-[15px]` (slightly larger than standard sm)
- Arabic secondary text uses `font-medium` weight for better clarity
- Muted/tertiary text in Arabic maintains readable weight (not too thin)
- Number formatting respects Arabic numerals when language is Arabic

### Layout System
**Spacing Units**: Tailwind 4, 6, 8, 12, 16 (p-4, gap-6, mb-8, etc.)
- Card padding: p-6 or p-8
- Section margins: mb-12 or mb-16
- Grid gaps: gap-6 (desktop), gap-4 (mobile)
- Container max-width: max-w-7xl

### Color Palette
**Dark Mode (Primary)**:
- Background: #0F172A
- Secondary bg: #1E293B
- Primary action: #2563EB
- Success/growth: #22C55E
- Danger/alerts: #EF4444
- Text primary: #F8FAFC
- Text secondary: #94A3B8

**Light Mode**:
- Background: #F8FAFC
- Secondary bg: #E2E8F0
- Primary action: #3B82F6
- Success/growth: #16A34A
- Text primary: #0F172A
- Text secondary: #64748B

## Component Library

### Dashboard Layout
- **Sidebar Navigation** (260px): Fixed left sidebar with logo, main nav items, and theme toggle at bottom
- **Main Content Area**: Full height with padding p-6 to p-8, scrollable
- **Header Bar**: Sticky top bar with page title, date range selector, and user profile

### Key Components

**Stat Cards** (Portfolio Overview):
- Grid: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Card structure: Rounded corners (rounded-xl), subtle border, p-6
- Layout: Icon + label above, large number below, percentage change indicator
- Icons: Use Heroicons (chart-bar, banknotes, trending-up, calendar)

**Investment Cards**:
- Full-width cards with left accent border (4px) indicating status
- Header: Platform name + investment title
- Body: Amount, IRR%, maturity date in structured grid
- Footer: Status badge + action buttons (Edit, View Details)

**Cashflow Table**:
- Clean table design with alternating row backgrounds
- Columns: Date, Investment, Amount, Status, Actions
- Status badges: Pill-shaped with appropriate colors (received=green, expected=blue, upcoming=gray)

**Charts & Analytics**:
- Use Chart.js or Recharts for line charts (portfolio growth), bar charts (quarterly returns), and donut charts (allocation)
- Consistent color usage: Primary blue for main data, green for profits, red for comparisons
- Chart containers: White/dark cards with p-6, subtle shadow

**Alert Notifications**:
- Toast-style notifications (top-right)
- In-app notification center icon in header with badge count
- Notification cards: Icon left, message content, timestamp, dismiss button

### Interactions
- **Hover States**: Subtle scale (hover:scale-105 transition-transform) for cards
- **Button States**: Primary buttons with solid background, secondary with outline
- **Loading States**: Skeleton screens for data-heavy sections
- **Transitions**: Fast and subtle (duration-200) for UI elements

### Bilingual Considerations
- RTL support for Arabic with automatic layout flip
- Language toggle in header
- Hybrid terminology: Arabic UI labels + English financial terms in parentheses
- Example: "إجمالي الأرباح (Total Returns)"

## Page-Specific Guidelines

### Dashboard Home
- 4-column stat cards at top (total capital, current returns, IRR, progress to goal)
- Portfolio performance line chart (medium height, full width)
- 2-column layout below: Recent investments (left 60%) + Upcoming cashflows (right 40%)

### Investments Page
- Filter bar at top (platform dropdown, date range, search)
- Investment cards in responsive grid
- Add Investment FAB (floating action button, bottom-right, primary blue)

### Analytics Page
- Multiple chart sections with clear section headers
- Tabs for different time periods (Monthly, Quarterly, Yearly, All-time)
- Export button (top-right) for report generation

### Images
**Dashboard**: No hero image. Focus on data visualization and charts.
**Login/Landing** (if created): Optional abstract financial growth illustration or graph visualization - not critical for MVP.

## Accessibility
- WCAG AA contrast ratios for all text
- Focus indicators on all interactive elements (ring-2 ring-primary)
- Keyboard navigation support
- Screen reader labels for financial data

This design system prioritizes clarity, professionalism, and efficient information display while maintaining the futuristic, intelligent aesthetic outlined in the Vision 2040 document.