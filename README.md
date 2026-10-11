# SafeRecess

SafeRecess is a Delhi school air-quality monitoring and alerting platform. It turns live station-level AQI readings into a simple decision-support dashboard for principals, PE teachers, and parents: is it safe for students to be outside today, and when should they be alerted?

The system combines:
- A React + Vite frontend dashboard
- AWS API Gateway + Lambda APIs
- DynamoDB for school and alert state
- SNS for email alerts
- EventBridge schedule-driven WAQI polling
- Data conversion logic that maps AQI readings into India CPCB-style safety levels

This project was built as a hackathon-ready solution for the WeMakeDevs x AWS Environmental Hacks challenge.

## Why this exists
Delhi schools often need a fast operational decision when air quality worsens. A raw AQI number is not enough for a school administrator or parent. SafeRecess converts that data into a clear action level and recommendation:
- Level 0: Good / Satisfactory
- Level 1: Moderate
- Level 2: Poor
- Level 3: Very Poor / Severe

Each school card shows the current status, local recommendation, pollutant context, and reading timestamp.

## Project goals
- Show live air-quality status for sample Delhi schools
- Use PM2.5 and PM10 to determine the worse school-level condition
- Send email alerts when a school becomes worse
- Support owner-only demo simulation without exposing the demo key to visitors
- Keep the system secure, minimal, and AWS-native

## Architecture overview

SafeRecess follows a simple event-driven AWS design.

### Frontend (React/Vite)
- Fetches `/schools` from the API
- Renders school cards with level badges, values, and recommendations
- Allows owners to enter a demo key to reveal demo controls
- Allows subscribers to submit an email, role, and selected schools

### API layer (AWS Lambda)
- `GET /schools` returns public school status
- `GET /schools/{id}` returns a single school
- `GET /alerts` returns stored alert history
- `POST /subscribe` validates and registers alert subscriptions
- `POST /simulate` and `POST /simulate/reset` manage owner-only demo behavior

### Data and event layer
- `FetchFunction` runs on a schedule and polls WAQI
- School reading data is stored in DynamoDB
- Alerts are written to DynamoDB and published to SNS topics

### AWS services used
- API Gateway HTTP API
- AWS Lambda
- DynamoDB
- SNS
- EventBridge schedule
- CloudWatch logging
- AWS SAM for deployment

## High-level flow

1. The frontend loads the dashboard and calls `GET /schools`.
2. The API reads the current school records from DynamoDB.
3. The scheduled `FetchFunction` polls WAQI station feeds every 30 minutes.
4. WAQI readings are normalized and converted into a school level.
5. The updated data is saved back to DynamoDB.
6. If a school crosses into a worse level, an alert is created and published to the SNS topic for that audience.
7. Subscribed users receive email alerts after confirmation.
8. The demo school can be simulated by the owner only using a protected demo key.

## Detailed runtime flow

### 1) Dashboard load flow
- The browser loads the app and calls the API endpoint `/schools`.
- The Lambda API returns a list of school objects with fields like:
  - `school_id`
  - `display_name`
  - `station_name`
  - `level`
  - `category_label`
  - `recommendation`
  - `est_pm25`
  - `est_pm10`
  - `reading_timestamp`
  - `attribution`
  - `is_demo_school`
- The frontend sorts schools by worst level first and renders cards.
- A polling loop re-fetches every 5 minutes to refresh status.

### 2) Background fetch flow
- `FetchFunction` is triggered by EventBridge on a schedule.
- It reads all schools and finds the unique station IDs in use.
- For each station, it calls the WAQI feed endpoint using the station ID.
- It validates the response and checks whether the reading is newer than the stored reading.
- It converts the AQI data to estimated µg/m³ values and then to an India-style action level.
- It computes the worse of PM2.5 and PM10, since the final school status is based on the more severe condition.
- It updates DynamoDB with the latest reading and the derived school level.

### 3) Alert generation flow
- The app keeps the previous level for comparison.
- If the current level is worse than the prior level, the Lambda raises an alert.
- The alert is written to the Alerts table and published to the correct SNS topic.
- Public-school alerts go to `SchoolAlertsTopic`.
- Demo alerts go to `DemoAlertsTopic`.
- The alert message includes the school name, old-to-new level change, recommendation, and attribution credit notice.

### 4) Subscription flow
- A visitor or parent submits an email, role, and school selection.
- The API validates:
  - valid email format
  - role must be `parent`, `principal`, or `pe_teacher`
  - selected school exists
  - the school is not the demo school
  - request count is under rate limits
  - email is not being re-requested too soon
- The backend triggers the SNS subscription flow.
- If the email already has a confirmed subscription, it merges the selected school IDs into the existing filter policy.
- Otherwise it creates a subscription and asks the user to confirm by email.
- The API responds with a 202 and a confirmation message.

### 5) Demo simulation flow
- Only the owner can use simulation controls.
- The frontend asks for a demo key.
- The key is kept in React state only and is never stored in localStorage or persistent storage.
- `POST /simulate` requires the `x-demo-key` header.
- `POST /simulate/reset` also requires the same key.
- The demo school is always read-only for visitors.
- Simulation uses a cooldown and expiry time to prevent abuse.

## Data model

### School record
Each school record in DynamoDB includes:
- `school_id`
- `display_name`
- `station_id`
- `contact_email`
- `current_level`
- `category_label`
- `driving_pollutant`
- `est_pm25`
- `est_pm10`
- `pm25_subindex`
- `pm10_subindex`
- `source_timestamp`
- `last_updated`
- `station_name`
- `attribution`
- `is_demo_school`
- `is_simulated`
- `baseline_level`
- `sim_expires_at`
- `last_sim_at`

### Alert record
Each alert record captures:
- `school_id`
- `timestamp`
- `from_level`
- `to_level`
- `status`
- `is_demo`

## Level logic
The project converts raw AQI sub-index values to estimated Indian CPCB-band categories. The logic follows the PM2.5 and PM10 worse-of-two rule.

- Level 0: Good / Satisfactory
- Level 1: Moderate
- Level 2: Poor
- Level 3: Very Poor / Severe

This is displayed with clear text and color styling in the frontend.

## Key rules implemented
- Fetch by station ID (`feed/@<id>`) rather than coordinates
- Use `time.iso` for timestamps
- Ignore stale or duplicate data
- Treat readings older than 3 hours as unavailable
- Keep only the latest reading per school
- Always attribute the source data to WAQI and the origin agency
- Show the recommendation appropriate to the final school level
- Do not expose secrets in the client or repository

## Repository structure

```text
SafeRecess/
├── .aws-sam/                 # SAM build output
├── backend/
│   └── lambda/
│       ├── alerts.js         # Alert formatting and SNS publish logic
│       ├── api.js            # HTTP API handlers for schools, subscribe, simulate
│       ├── convert.js        # AQI conversion and level mapping
│       ├── fetch.js          # Scheduled WAQI fetch process
│       ├── parse.js          # WAQI parsing helpers
│       ├── seed.js           # Seed data loader for schools and stations
│       ├── store.js          # DynamoDB and in-memory store abstraction
│       ├── *.test.js         # Unit tests for conversion, data flow, subscriptions
│       └── package.json      # Backend dependencies
├── data/
│   └── stations_and_schools.json
├── frontend/
│   └── src/
├── src/
│   ├── App.jsx              # Frontend dashboard UI
│   ├── main.jsx             # React bootstrap
│   ├── index.css            # Styling and level colors
│   └── api.js               # Frontend API helper layer
├── .env                     # Local environment values (keep out of repo)
├── template.yaml            # AWS SAM template
├── package.json             # Root Vite app package
├── README.md                # Project documentation
├── FRONTEND.md              # Frontend-specific design doc
├── PRD.md                   # Product requirements
├── CLAUDE.md                # Implementation notes
├── PLAN.md                  # Planning docs
└── ...
```

## Local development setup

### Prerequisites
- Node.js 18+ or 20+
- npm
- AWS SAM CLI
- Optional: AWS credentials configured for deployment and testing

### Install dependencies
From the project root:

```bash
npm install
cd backend/lambda
npm install
cd ../..
```

### Start the frontend locally
```bash
npm run dev
```

The app will run using the Vite dev server. If you want to use mock data locally:

```bash
VITE_USE_MOCK=true npm run dev
```

### Frontend environment variables
Set these in your environment or `.env` file:

```bash
VITE_API_URL=http://localhost:3000
VITE_USE_MOCK=false
```

The backend Lambda environment variables are configured through AWS SAM template parameters, not directly in the frontend.

## Backend deployment and build

### Validate the SAM template
```bash
sam validate -t template.yaml
```

### Build the application
```bash
sam build
```

### Deploy to AWS
```bash
sam deploy --guided
```

You will be prompted for values such as:
- `AlertEmail`
- `WaqiToken`
- `DemoKey`
- `AllowedOrigin`

## Runtime environment variables
The Lambda functions use these environment values:
- `WAQI_TOKEN`
- `DEMO_KEY`
- `DEMO_INBOX`
- `SCHOOLS_TABLE`
- `ALERTS_TABLE_NAME`
- `ALERT_TOPIC_ARN`
- `SCHOOL_ALERTS_TOPIC_ARN`
- `DEMO_ALERTS_TOPIC_ARN`
- `STALE_AFTER_HOURS`
- `AWS_REGION`

## API behavior summary

### `GET /schools`
Returns the public list of all schools.
- sorted by severity
- includes recommendation and attribution
- marks stale or unavailable data correctly

### `GET /schools/{id}`
Returns one school by ID.

### `GET /alerts`
Returns recent alert events for a selected school, including demo alerts when requested.

### `POST /subscribe`
Request body:
```json
{
  "email": "parent@example.com",
  "role": "parent",
  "school_ids": ["najafgarh-a", "okhla-b"]
}
```

Behavior:
- validates email and role
- ensures each school exists
- rejects the demo school
- limits the number of selected schools
- applies throttling for repeated requests
- creates or merges SNS filter policy for email subscriptions

### `POST /simulate`
Requires `x-demo-key` header.

Request example:
```bash
curl -X POST https://.../simulate \
  -H "x-demo-key: YOUR_DEMO_KEY" \
  -H "Content-Type: application/json" \
  -d '{"severity":"poor"}'
```

This updates the demo school state to a simulated air-quality condition.

### `POST /simulate/reset`
Resets the demo school to its baseline state.

## Security notes
SafeRecess follows a security-first design:
- No secrets are committed to the frontend
- WAQI token and demo key live in Lambda environment variables only
- The demo key is validated server-side and never stored in browser storage
- SNS subscriptions use filtering to target school IDs
- Input validation blocks invalid emails, invalid school IDs, and bad roles
- API rate limits reduce abuse and bot spam
- Deployment uses least-privilege IAM permissions

## Testing
Backend tests are included for:
- data conversion logic
- WAQI parsing and validation
- alert generation
- subscription validation and abuse prevention
- demo-key protection

Run tests from the project root or backend folder:

```bash
npm test
```

Or in the backend Lambda package:

```bash
cd backend/lambda
npm test
```

## Example user journey

1. A parent opens the dashboard and sees the status of all sample schools.
2. One school moves from Moderate to Poor.
3. The scheduled fetch saves the new status to DynamoDB.
4. The backend detects the worse level and sends an alert.
5. The parent sees the school card update and receives the email after subscription confirmation.
6. A school owner logs in to the owner-only demo view and simulates a severe spike for a presentation or judging scenario.

## Future enhancements
- Recent alert history panel in the dashboard
- More expressive role-based subscription messaging
- Better owner/admin dashboard management
- Additional AWS observability and CloudWatch metrics
- More realistic public deployment configuration for final demo hosting

## Final notes
SafeRecess is designed to be a clear, production-style demo of how AWS services can support a public-health decision system. It focuses on a real event-driven workflow:
- collect live station data,
- transform it into decision-ready school status,
- distribute alerts automatically,
- and keep the demo secure.

The project is intentionally simple, readable, and practical: no unnecessary abstraction, no secret leakage, and no heavy app framework overhead.
