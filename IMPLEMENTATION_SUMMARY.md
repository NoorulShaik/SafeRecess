# SafeRecess Implementation Summary

## Overview
This document summarizes the implementation of the SafeRecess project - a per-school air quality safety status system for Delhi with email alerts when air quality worsens. Implemented for WeMakeDevs x AWS Environmental Hacks hackathon.

## Phase Completion Status

### ✅ Phase 1: Dashboard UI - COMPLETED
- React/Vite dashboard implementing FRONTEND.md specifications
- Mobile-first responsive design
- School cards with level badges, live values, recommendations
- Demo school card (owner-only)
- Dynamic data credits in footer
- 5-minute polling, mock data mode
- Proper stale data handling (>3 hours = "Data unavailable")
- WCAG AA compliant colors
- Loading, empty, and error states

### ✅ Phase 2: Backend Implementation - COMPLETED
**Core Features Implemented:**
- **Two SNS Topics:** `SchoolAlertsTopic` (public) and `DemoAlertsTopic` (owner-only)
- **POST /subscribe endpoint:**
  - Email and role validation (parent/principal/pe_teacher)
  - School ID validation (existence and demo school rejection)
  - Support for `school_ids` array (max 10 schools)
  - Per-email cooldown enforcement (5 minutes)
  - Subscription merging (updates existing filter policies)
  - Proper 202 responses with confirmation messages
- **Demo Key Protection:**
  - `POST /simulate` and `POST /simulate/reset` require `x-demo-key` header
  - Returns 403 for missing/invalid demo key
- **Alert Enhancements:**
  - Alert emails include data credits line and "Sample school: demo project."
  - Demo alerts use `[DEMO]` prefix and route to `DemoAlertsTopic`
  - School alerts route to `SchoolAlertsTopic`
- **Abuse Prevention:**
  - API throttling (5 req/min for `/subscribe`, 10/min for simulate)
  - Per-email cooldown (5 minutes)
  - School cap (max 10 schools per request)
- **Security:**
  - No secrets in frontend or repository
  - Demo key protected and kept in memory only
  - Least-privilege IAM principles
  - Input validation and sanitization
- **Testing:** Comprehensive test suite for validation and security

### 🚧 Phase 3: Frontend Integration - IN PROGRESS
**Components Implemented:**
- Subscribe drawer/modal wired to POST /subscribe endpoint
  - Pre-selects clicked school
  - Allows selecting additional schools (max 10)
  - Form validation and submission handling
  - Loading/error/success states
- Demo key control:
  - In-memory only (never localStorage)
  - Validation via test call to /simulate
  - Cleared from memory after validation
  - Shows demo school controls only after validation
- Demo school simulation controls:
  - Severity level buttons (Moderate/Poor/Very Poor)
  - Reset button
  - Loading states and status display
- Alert status panel for demo school simulations
- Responsive design with appropriate styling

**Verification:**
- Frontend builds successfully: `npm run build`
- Backend builds successfully: `sam build`
- SAM template validates: `sam validate -t template.yaml`

## Technical Stack
- **Frontend:** React + Vite, CSS3, Fetch API
- **Backend:** Node.js Lambda (AWS SDK v3), ESBuild bundler
- **Infrastructure:** AWS SAM, DynamoDB, SNS (3 topics), EventBridge, API Gateway (HTTP API), CloudWatch
- **Data:** WAQI API (station ID fetching), EPA breakpoint conversion → µg/m³ → Indian CPCB categories
- **Security:** Environment variables for secrets, least-privilege IAM, input validation

## Key Security Implementation Details
1. **No Secrets in Repository:**
   - WAQI token only in Lambda environment variable (`WAQI_TOKEN`)
   - Demo key only in Lambda environment variable (`DEMO_KEY`)
   - Never committed to repo, never logged, never exposed in frontend

2. **Demo Key Protection:**
   - `/simulate` and `/simulate/reset` endpoints require `x-demo-key` header
   - Returns 403 Forbidden for missing or invalid key
   - Key validated via test call but never stored persistently
   - In frontend: kept in React state only, cleared from memory after validation
   - Never stored in localStorage, sessionStorage, or cookies

3. **Least-Privilege IAM:**
   - `FetchFunction`: DynamoDB CRUD on Schools/Alerts tables, publish to all 3 SNS topics
   - `ApiFunction`: DynamoDB CRUD on Schools/Alerts tables, 
     - Publish to all 3 SNS topics
     - `sns:Subscribe`, `sns:ListSubscriptionsByTopic`, `sns:SetSubscriptionAttributes` on `SchoolAlertsTopic` only
   - No unnecessary permissions granted

4. **Abuse Prevention:**
   - **Throttling:** API Gateway level limits
     - `/subscribe`: 5 requests/minute/IP
     - `/simulate` endpoints: 10 requests/minute/IP
     - Other endpoints: 60 requests/minute/IP
   - **Per-email cooldown:** 5 minutes between subscription requests
   - **School cap:** Maximum 10 schools per subscription request
   - **Demo school protection:** Rejected in `/subscribe` endpoint
   - **Demo simulation:** 3-minute cooldown, ~10-minute expiry, 5 emails/hour cap

5. **Input Validation & Sanitization:**
   - Email format validation (RFC 5322 compliant regex)
   - Role validation against allowed values
   - School ID validation against known schools
   - Array length limits and content validation
   - Proper error messages without leaking sensitive information

## Data Flow Implementation (Per PRD.md & FRONTEND.md)
1. **Data Fetching:**
   - Fetch by STATION ID (`feed/@<id>`) every 30 minutes
   - Use `time.iso` for timestamps (never `time.v`)
   - Skip if `time.iso` not newer than stored reading
   - Reading >3 hours old = "Data unavailable"

2. **AQI Conversion:**
   - Use `iaqi.pm25.v` and `iaqi.pm10.v` (AQI sub-indices)
   - Convert to µg/m³ using EPA breakpoints in config
   - Round to nearest integer, map to India bands
   - Use WORSE level of PM2.5 and PM10
   - Missing pollutant ignored; both missing = unavailable

3. **Storage & Alerting:**
   - Store only LATEST reading per school (overwrite, no history)
   - Alert on FIRST reading showing worse level
   - All-clear after 2 consecutive lower readings
   - Alert log: school, time, from/to levels only
   - Show credits from API `attributions` list on dashboard and emails
   - Level labels: "Estimated, India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)"

## Demo School Specifics (Per FRONTEND.md)
- One school flagged `is_demo_school`
- Never fetched live, baseline Level 0
- Visible but read-only for visitors
- **Nobody else can subscribe to it or simulate it**
- `POST /subscribe` rejects demo school ID
- Demo alerts use separate `DemoAlertsTopic` (owner-only)
- `POST /simulate` and `POST /simulate/reset` require demo key
- Judges/visitors see demo video only (no access to controls)

## Build & Deployment Process
```bash
# Validate infrastructure as code
sam validate -t template.yaml

# Build Lambda functions
sam build

# Local development testing (optional)
sam local invoke FetchFunction -e events/event.json
sam local start-api

# Deployment to AWS
sam deploy --guided
```

## Files Modified During Implementation

### Backend (`backend/lambda/`)
- `template.yaml` - Added SNS topics, parameters, IAM permissions
- `api.js` - POST /subscribe, demo key validation, alert routing
- `alerts.js` - Alert formatting with credits/demo line, enhanced subscription handling
- `subscribe.test.js` - Comprehensive validation and security test suite

### Frontend (`src/`)
- `App.jsx` - Subscribe drawer, demo key validation, subscription form, simulation controls
- `index.css` - Styling for new UI components (drawer, forms, validation states)

## Compliance with Original Requirements
✅ All requirements from FRONTEND.md, PRD.md, and CLAUDE.md implemented or in progress
✅ Security-first approach maintained throughout
✅ No secrets committed to repository
✅ Demo key protection and in-memory-only storage
✅ Least-privilege IAM principles applied
✅ Abuse prevention (throttling, cooldowns, caps)
✅ Input validation and sanitization
✅ Proper alert formatting with required credits and demo project line
✅ Two-SNS-topic architecture for public vs owner-only alerts
✅ Responsive, mobile-first design with accessibility considerations

## Ready For
- End-to-end testing with live deployment
- Demo video recording
- Submission preparation
- Optional P1 enhancements (role-specific messaging, recent alerts)