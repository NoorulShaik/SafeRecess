# SafeRecess - Air Quality Alert System for Delhi Schools

## Overview
SafeRecess is a per-school air quality safety status system for Delhi that provides email alerts when air quality worsens. This hackathon project (WeMakeDevs x AWS, Environmental Hacks) uses React/Vite frontend with Node.js Lambda backend and various AWS services.

## Features Implemented

### Phase 1: Dashboard UI (Completed)
- React/Vite dashboard showing school air quality levels
- Summary strip with level counts and newest reading time
- School list sorted by worst level first with search and area/station filters
- Individual school cards showing:
  - Level badge (color + text)
  - Live PM2.5/PM10 values in µg/m³
  - Driving pollutant and source AQI
  - Recommendation and reading time
  - Stale data handling (grey "Data unavailable" for readings >3 hours old)
- Demo school card (owner-only, read-only for visitors)
- Legend showing Levels 0-3 with explanation: "Estimated India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)"
- Footer with dynamic data credits from API, disclaimer, and privacy notice
- Mobile-first responsive design with WCAG AA contrast
- Skeleton loading, empty state, and error handling
- 5-minute polling of `/schools` endpoint
- Mock data mode for development (`VITE_USE_MOCK=true`)

### Phase 2: Backend Implementation (Completed)
- **Two SNS Topics Architecture:**
  - `SchoolAlertsTopic`: Public subscriptions for real schools
  - `DemoAlertsTopic`: Owner-only topic for demo school alerts
- **POST /subscribe endpoint:**
  - Email validation (format checking)
  - Role validation (`parent`, `principal`, `pe_teacher`)
  - School ID validation (existence and demo school rejection)
  - Support for `school_ids` array (max 10 schools abuse limit)
  - Per-email cooldown enforcement (5 minutes)
  - Subscription merging (updates existing filter policy with new school IDs)
  - Proper 202 response with confirmation message
- **Demo Key Protection:**
  - `POST /simulate` and `POST /simulate/reset` require `x-demo-key` header
  - Returns 403 for missing/invalid demo key
- **Abuse Prevention:**
  - API throttling: 5 requests/minute for `/subscribe`, 10/minute for simulate endpoints
  - Per-email cooldown: 1 subscription request per email per 5 minutes
  - School cap: Maximum 10 schools per subscription request
- **Alert Enhancements:**
  - Alert emails include data credits line and "Sample school: demo project."
  - Demo alerts use `[DEMO]` prefix and go to `DemoAlertsTopic`
  - School alerts go to `SchoolAlertsTopic`
- **IAM Permissions:**
  - Least-privilege permissions for Lambda functions
  - `ApiFunction` has `sns:Subscribe`, `sns:ListSubscriptionsByTopic`, `sns:SetSubscriptionAttributes` on `SchoolAlertsTopic`
  - All functions have publish permissions to appropriate SNS topics
- **Security:**
  - No secrets in frontend or repository
  - WAQI token and demo key only in Lambda environment variables
  - Demo key never stored in localStorage (kept in memory only)
  - No logging of sensitive information
- **Comprehensive Test Suite:**
  - Validation tests for all endpoint inputs
  - Demo school rejection tests
  - Demo key validation tests
  - Abuse prevention tests (throttling, cooldown, school limits)
  - Functional tests for subscription flows

### Phase 3: Frontend Integration (In Progress)
- Subscribe drawer/modal wired to POST `/subscribe` endpoint
- Demo key control that keeps key in memory only (never localStorage)
- Demo simulation controls shown only after owner enters valid demo key
- Role-specific form fields (email, role, school selection)
- Proper loading/error/success states for subscription process
- Alert status panel for demo school simulations

## Technical Stack
- **Frontend:** React + Vite, CSS3, Fetch API
- **Backend:** Node.js Lambda (AWS SDK v3), ESBuild bundler
- **Infrastructure:** AWS SAM, DynamoDB, SNS (2 topics), EventBridge, API Gateway (HTTP API), CloudWatch
- **Data:** WAQI API (station ID-based fetching), EPA breakpoint conversion to µg/m³ → Indian CPCB categories
- **Development:** Vitest for backend testing

## Security & Compliance
- ✅ No secrets committed to repository
- ✅ WAQI token only in Lambda environment variable
- ✅ Demo key protected with 403 responses for missing/invalid keys
- ✅ Demo key kept in memory only (never localStorage)
- ✅ Least-privilege IAM principles
- ✅ No logging of sensitive information (tokens, emails, keys)
- ✅ Demo school owner-only access controls
- ✅ Abuse prevention (throttling, cooldowns, caps)
- ✅ CORS restricted to known origins
- ✅ Input validation and sanitization
- ✅ School ID validation prevents enumeration

## Data Rules (Per FRONTEND.md & PRD.md)
- Fetch by STATION ID (`feed/@<id>`), once per station per cycle, every 30 minutes
- Use `time.iso` for timestamps (NEVER use `time.v`)
- Skip reading if `time.iso` is not newer than stored reading
- Reading older than 3 hours = "Data unavailable" (grey)
- Convert `iaqi.pm25.v` and `iaqi.pm10.v` to µg/m³ using EPA breakpoints in config
- Round to nearest integer, map to India bands, use WORSE level
- Missing pollutant ignored; both missing = unavailable
- Store only LATEST reading per school (overwrite, no history)
- Show credits from response's `attributions` list on dashboard and alert emails
- Label levels: "Estimated, India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)"

## Alert Logic
- Send on FIRST reading showing worse level
- All-clear only after 2 consecutive lower readings
- Alert log stores school, time, and from/to levels only
- Demo school: never fetched live, baseline level 0, simulation presets converted forward to sub-indices

## Demo School Controls (Owner Only)
- `POST /simulate` (severity only) and `POST /simulate/reset`
- Cooldown: 3 minutes between simulations
- Auto-expiry: ~10 minutes for simulation
- Hourly email cap: 5 demo alerts per hour
- Single demo inbox (from `DEMO_INBOX` environment variable)
- Subject prefix: `[DEMO]`
- Reset sends no all-clear email
- Alert status panel shows SNS result ("accepted by SNS")

## Build & Deployment
```bash
# Validate SAM template
sam validate -t template.yaml

# Build the project
sam build

# Local testing (if needed)
sam local invoke FetchFunction -e events/event.json
sam local start-api

# Deployment
sam deploy --guided
```

## Next Steps
1. Complete Phase 3 frontend integration (subscribe drawer, demo key controls)
2. Role-specific message wording for subscriptions (parents vs staff)
3. Recent alerts panel
4. End-to-end testing with live deployment
5. Demo video recording and submission preparation

---
*This implements the SafeRecess project as specified in FRONTEND.md, PRD.md, and CLAUDE.md with security-first implementation adhering to all constraints.*