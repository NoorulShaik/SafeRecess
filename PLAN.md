# Phase 1 Plan: Dashboard UI (frontend only)

## Goals
- Build dashboard from FRONTEND.md against existing GET /schools
- Use VITE_API_URL from environment
- Include all specified UI components
- Add mock-data mode (VITE_USE_MOCK=true)
- Mobile-first layout, accessible markup, 5-minute polling

## Components to implement
1. Header with sample-data banner
2. Summary strip with level counts and newest reading time
3. School list with search and area/station filter
4. Worst-first cards with level badge (color + text)
5. Live values: PM2.5/PM10, driving pollutant, source AQI
6. Reading time with stale handling
7. Separate read-only demo school card
8. Legend with levels 0-3
9. Footer credits from API attributions
10. Skeleton/empty/error states
11. Subscribe button (disabled for now)
12. 5-minute polling of GET /schools

## Files to modify/create
- src/App.jsx (main dashboard component)
- src/index.css (may need adjustments)
- Possibly create new components: SchoolCard, SummaryStrip, etc.
- Add mock data functionality

## Steps
1. Analyze current App.jsx vs FRONTEND.md requirements
2. Create mock data mode
3. Implement header with banner
4. Implement summary strip
5. Implement school grid with search/filter
6. Enhance school card with all required fields
7. Implement demo school card (separate, read-only)
8. Add legend
9. Add footer with dynamic credits
10. Implement loading/error/empty states
11. Add 5-minute polling
12. Ensure mobile-first, accessible markup
13. Run tests after completion

## Commands to run
- npm run dev (to view dashboard)
- npx vitest run (to run tests after phase)