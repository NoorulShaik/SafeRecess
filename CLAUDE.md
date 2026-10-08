# SafeRecess: rules for the coding assistant
Read PRD.md first (the latest PRD version). If this file and the PRD disagree, ask me.

## What this is
Per-school air quality safety status for Delhi, with email alerts when a level worsens. Hackathon project (WeMakeDevs x AWS, Environmental Hacks). Solo builder, small scope on purpose.

## Stack
React + Vite (Amplify Hosting), Node.js Lambda (AWS SDK v3), DynamoDB, SNS (email), EventBridge, API Gateway (HTTP API), CloudWatch. Seed data: data/stations_and_schools.json. Thresholds: data/config.json.

## Data rules (provider: WAQI, free token)
- Fetch by STATION ID (`feed/@<id>`), once per station per cycle, every 30 minutes. No coordinate lookup.
- Use `time.iso` for timestamps. NEVER use `time.v` (it is local time treated as UTC).
- Skip a reading if its `time.iso` is not newer than the stored one.
- Reading older than 3 hours = "Data unavailable" (grey). Never alert on stale data.
- Use `iaqi.pm25.v` and `iaqi.pm10.v` (AQI sub-indices, US scale). Ignore the top-level `aqi`.
- Convert each sub-index to µg/m3 with the EPA breakpoints in config (PM2.5 table chosen by `epa_pm25_version`), round to the nearest integer, map to India bands, and use the WORSE level. A missing pollutant is ignored; both missing = unavailable.
- Thresholds live in config, never hard-coded.
- Store only the LATEST reading per school (overwrite). No history, no archiving (provider terms).
- Show the credits from the response's `attributions` list on the dashboard and in every alert email.
- Label levels "Estimated, India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)".

## Alerts
- Send on the FIRST reading that shows a worse level. All-clear only after 2 consecutive lower readings.
- Alert log stores school, time and from/to levels only (no raw air values).

## Demo school (the only simulatable school)
- One school flagged `is_demo_school`, labelled "Demo school (simulation only)", never fetched live, baseline level 0.
- `POST /simulate` (severity only) and `POST /simulate/reset`. Open to visitors, so: cooldown, auto-expiry (~10 min), API throttling, hourly email cap, single demo inbox, subject prefix [DEMO].
- Simulation presets are target concentrations in config, converted FORWARD to sub-indices with the active EPA table, then run through the normal pipeline.
- Reset sends no all-clear email. Show an "Alert status" panel with the SNS result ("accepted by SNS", not "delivered").

## Security
- The WAQI token lives only in a Lambda environment variable. Never log, print, hard-code or commit it. Never put it in the frontend.
- Least-privilege IAM. No secrets in the repo.
- The demo inbox address comes from the `DEMO_INBOX` environment variable. Never commit a real email address; the seed file keeps the placeholder.

## Do NOT add
Logins, mobile apps, history charts, WAQI map tiles or widgets, real school contacts, real school names in the UI (use the display names in the seed file).

## Disclosure
Keep a running list of the AI coding tools used, for the submission writeup.

## Working style
One task at a time from tasks.md. Write unit tests for conversion and level logic. Explain what you changed. If unsure, ask instead of guessing.
