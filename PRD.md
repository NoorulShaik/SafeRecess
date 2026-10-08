# SafeRecess: Product Requirements Document (v1.10)

| | |
|---|---|
| **Product** | SafeRecess (working title): AQI-based school safety alerts |
| **Owner** | Noorul Hussain Shaik (solo builder) |
| **Event** | WeMakeDevs x AWS, Environmental Hacks (Bharat Builds Tour), Oct 8-11, 2026, online |
| **Track** | Air, starting point: "School safety on bad days" |
| **Version / Date** | v1.10 / Oct 7, 2026 |
| **Status** | Draft, pre-build |

### What changed in v1.10
1. **Submission rules added** from the tour rules: a public repository, a demo video under 3 minutes uploaded to YouTube (public or unlisted, link tested signed out), and a short writeup covering the problem, the build and where AWS fits. The AI coding tools used must be listed.
2. **The demo video must show AWS in use**, not only name it.
3. **No project commits before the kickoff**, because a repository history that does not match the event dates can disqualify the team.
4. **The blog post is optional** (top-5-blogs prize), not a submission requirement.
5. **Eligibility:** student status verified on AWS Builder Center before the event, with registration and profile details correct and consistent.
6. **Schedule:** kickoff Thu Oct 8; last day to submit is Sun Oct 11; exact hours and deadline not yet posted.

### What changed in v1.9
1. **Final stations and sample schools** added (section 25). The feed is fetched by station ID, with no coordinate lookup.
2. **Worst-pollutant rule:** PM2.5 and PM10 are both converted and the worse level wins. At Mundka, PM10 drove the AQI while PM2.5 alone would have looked fine.
3. **Breakpoints verified:** CPCB PM2.5 and PM10 bands, and EPA's 2024 PM2.5 table. EPA's PM10 table still needs a check.
4. **Level 0 wording** now asks schools to keep an eye on sensitive students, since CPCB says the Satisfactory range can cause them minor breathing discomfort.
5. **Timestamps:** use `time.iso`, never `time.v`. Credits come from each response's attributions list.
6. **Demo presets** are target concentrations converted forward, so they survive the EPA-table switch.

### What changed in v1.8
1. **Two sample schools per station:** 4-5 stations that report PM2.5, spread across Delhi, with two schools each (8-10 schools plus the demo school).
2. **One fetch per station per cycle**, applied to both of its schools; the station ID is stored on each school after a one-time, checked lookup.
3. **Generic sample school names** (for example "Sample School, Dwarka A") so the demo does not imply real schools are monitored; each card shows its nearest station.
4. **Version date corrected** to Oct 6.

### What changed in v1.7
1. **Judges can now see that an alert was sent**, even though the email goes to the owner's inbox: an on-screen "Alert status" panel (message, time, SNS result) and a recent-alerts list for the demo school (FR-32, FR-33).
2. **Optional extra:** a judge can subscribe their own email to the demo school and receive the demo alert (FR-22, P2).

### What changed in v1.6
1. **Demo school stays live until judging ends**, so judges can try the simulation themselves (section 9.5).
2. **Demo key removed**, because judges would not have it. Abuse is limited instead by a cooldown, auto-expiry, API throttling, an hourly email cap and a single demo inbox.
3. **On-screen alert preview added**, so judges without access to the demo inbox can still see the alert message.

### What changed in v1.5
1. **Simulation limited to one dedicated demo school** (section 9.5). All other schools show live data only, and the demo school is removed after the demo.
2. API table, data model, dashboard, plan, checklist and open questions updated to match.

### What changed in v1.4
1. **Demo simulation fully specified** (section 9.5): endpoints, behaviour, reset, expiry and protection.
2. API table and data model updated to match.

### What changed in v1.3
1. **Tech stack added** (section 24): tools, libraries and services in one place.
2. **Update frequency stated as hourly** (per the owner). The fetch still runs every 30 minutes and skips unchanged timestamps.

### What changed in v1.2
1. **Hourly source data:** fetch every 30 minutes and process a reading only when its source timestamp is new. The source updates hourly.
2. **Faster alerts:** alert on the first reading that shows a worse level. The 2-reading confirmation now applies only to all-clear messages.
3. **Demo simulation control:** a clearly labelled "simulate spike" control for testing and the demo video.
4. **Honest timestamps:** each card shows the reading's own time, not the fetch time.

### What changed in v1.1
1. **India-based levels:** the data source reports on the US EPA scale, so we convert its PM2.5 value into an estimated Indian (CPCB) category.
2. **No data archiving:** the source's terms forbid redistributing cached or archived data, so we keep only the latest reading per school. The 24-hour history feature is removed.
3. **Attribution is mandatory:** the World Air Quality Index project and the originating agency must be credited on the dashboard and in alerts.
4. **Geo lookup:** the API finds the nearest station for each school, so we don't build our own station matching.

---

## 1. Overview

SafeRecess turns live air quality readings into a clear daily decision for each school: what is safe to do outdoors today, and what is not. It watches the air near each school, classifies it into an action level using India's AQI categories, shows it on a dashboard, and sends an alert when conditions get worse.

## 2. Problem Statement

On days when AQI reaches Poor or Severe, children are often still exposed through outdoor assembly, sports and recess. The data exists, but a number like "AQI 347" does not tell a principal or PE teacher what to do, and parents often learn about it afterwards.

**Pitch:** *SafeRecess watches the air near each school and tells staff and parents what to change today.*

## 3. Goals and Non-Goals

### Goals
1. Show a live, colour-coded safety status and recommendation per school.
2. Alert automatically when a school's level gets worse.
3. Deploy on AWS with a public URL; work end to end.
4. Be understandable to a first-time user without instructions.
5. Meet the data provider's terms (attribution, no archiving).
6. Deliver every hackathon submission item on time.

### Non-Goals
User accounts, native mobile apps, real school or student data, medical advice, indoor sensing or hardware, historical data storage or trend charts.

## 4. Target Users

| Persona | Needs | How SafeRecess helps |
|---|---|---|
| School administrator / principal | A fast yes/no on outdoor activity | Status and alert when the level changes |
| PE teacher | Know when to move sports indoors | Level-specific guidance |
| Parent | Know today's conditions at the school | Public status page (stretch: alert subscription) |
| Hackathon judge | See a real problem solved by working software | Clear demo with an alert moment |

## 5. User Stories

| ID | As a... | I want to... | So that... | Priority |
|---|---|---|---|---|
| US-1 | Principal | see today's status for my school | I can decide on outdoor activities | P0 |
| US-2 | Principal | get an email when the level worsens | I can act before students are outside | P0 |
| US-3 | PE teacher | read a plain-language recommendation | I know what to change | P0 |
| US-4 | Parent | view my child's school status | I know today's conditions | P0 |
| US-5 | Principal | get an "all clear" message | I can resume normal activities | P1 |
| US-6 | Parent | subscribe to alerts for one school | I'm told automatically | P2 |
| US-7 | Visitor | see schools on a map | I can compare areas | P2 |

## 6. Scope

**MVP (P0):** scheduled live fetch, PM2.5 and PM10 conversion and level classification, alert on worsening level, dashboard with 8-10 sample Delhi schools (two per station) plus the demo school, attribution, deployment on AWS.

**Stretch (P1/P2):** all-clear alerts, map view, parent subscription, AI-generated plain-language advisory.

**Out of scope:** everything under Non-Goals.

## 7. Product Flow (Input, Processing, Output)

**Input:** live air readings near each school; a list of sample schools with coordinates.

**Processing:** fetch each station's reading; estimate PM2.5 and PM10 concentrations; map each to an Indian category and take the worse; compare with the previous level.

**Output:** dashboard with status, estimated category, recommendation and credits; email alert when a level worsens.

## 8. Levels, Conversion and Recommendations

### 8.1 Data scale and conversion
The source reports AQI on the US EPA scale, and its per-pollutant values (`iaqi`) are AQI sub-indices, not raw concentrations. India's AQI uses concentrations against CPCB breakpoints and takes the **worst pollutant**. SafeRecess therefore:

1. Reads the PM2.5 and PM10 sub-indices from each station's feed. Either can drive the overall AQI; at Mundka, PM10 did.
2. Converts each back to µg/m³ using the US EPA breakpoints (piecewise linear): PM2.5 with the 2024 or the previous (2012) table, chosen by a config switch; PM10 with the standard table.
3. Maps each concentration to an Indian band using CPCB's 24-hour breakpoints.
4. Uses the worse of the two levels. If one pollutant is missing the other is used; if both are missing the school shows "Data unavailable".

**Verified:** CPCB PM2.5 and PM10 breakpoints, and EPA's 2024 PM2.5 table (effective May 6, 2024). **Still to verify:** EPA's PM10 table, and which PM2.5 table the source applies (test at Anand Vihar against an official raw reading).

### 8.2 Action levels
Thresholds are stored in configuration (`data/config.json`), not hard-coded. Concentrations are rounded to the nearest integer before banding, and the worse of the PM2.5 and PM10 levels wins.

| Level | India category | AQI | PM2.5 (µg/m³) | PM10 (µg/m³) | Colour | Recommendation to school |
|---|---|---|---|---|---|---|
| 0 | Good / Satisfactory | 0-100 | 0-60 | 0-100 | Green | Normal activities; keep an eye on students with asthma or breathing problems. |
| 1 | Moderate | 101-200 | 61-90 | 101-250 | Yellow | Reduce intense outdoor exertion; shorten outdoor sessions; watch students with asthma or heart/lung conditions. |
| 2 | Poor | 201-300 | 91-120 | 251-350 | Orange | No outdoor sports or assembly; keep recess indoors; limit outdoor time to essential movement. |
| 3 | Very Poor / Severe | 301+ | 121+ | 351+ | Red | Indoor-only day; windows and doors closed; cancel outdoor events; extra care for students with breathing difficulties. |

### 8.3 Honest labelling
- The dashboard shows "Estimated, India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)".
- Official figures use 24-hour averages and up to eight pollutants; ours uses current readings and two, so it will not always match them.
- A disclaimer states that the recommendations are general guidance, not medical advice, and that schools should follow official advisories.
- **Fallback:** if validation shows the estimate often disagrees with official categories, show the source's own scale (US EPA style) with clear labels instead.

## 9. Functional Requirements

### 9.1 Data ingestion
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Fetch every 30 minutes. The source updates hourly, so process a reading only when its `time.iso` timestamp is newer than the stored one (never use `time.v`, which is local time treated as UTC). Fetch each station once per cycle and apply the reading to every school that uses it. | P0 |
| FR-2 | Use the five final stations (section 25), each with two sample schools. Each school stores its station ID and the feed is fetched by station ID; there is no coordinate lookup. | P0 |
| FR-3 | Store only the latest reading per school, overwritten on each fetch. No reading history is kept. | P0 |
| FR-4 | If the API fails or the reading is older than 3 hours, show "Data unavailable" (grey) and send no alert. | P0 |
| FR-5 | Retry a failed fetch once and log it. | P1 |

### 9.2 Conversion and classification
| ID | Requirement | Priority |
|---|---|---|
| FR-6 | Convert the PM2.5 and PM10 sub-indices to estimated µg/m³ concentrations (EPA PM2.5 table chosen by config). | P0 |
| FR-7 | Map each estimate to the Indian category and Level 0-3 using configured thresholds, and use the worse level (a missing pollutant is ignored). | P0 |
| FR-8 | Map each level to a stored recommendation text. | P0 |
| FR-9 | Update each school's current level and recommendation after every successful fetch. | P0 |

### 9.3 Alerts
| ID | Requirement | Priority |
|---|---|---|
| FR-10 | Email the school contact on the first reading that shows a worse level (no waiting for confirmation). | P0 |
| FR-11 | Alert only on a level change, never repeatedly for the same level. | P0 |
| FR-12 | Alert content: school, new level, estimated category, time, recommendation, and attribution line. | P0 |
| FR-13 | Send an "all clear" message when the level has decreased and stays lower for 2 consecutive readings. | P1 |
| FR-14 | Demo simulation: a clearly labelled control that injects a fake reading for the single designated demo school, to test alerts and record the demo. Simulated values are marked on screen, never mixed with live data, and alert emails from it are prefixed [DEMO]. Full behaviour is in section 9.5. | P0 |
| FR-15 | Keep an alert log with school, time and from/to levels only (no raw air quality values). | P1 |

### 9.4 Dashboard
| ID | Requirement | Priority |
|---|---|---|
| FR-16 | Show all schools with name, estimated category, colour status, recommendation and the reading's own source timestamp (not the fetch time). | P0 |
| FR-17 | Responsive layout, usable on a phone; colour is always paired with a text label. | P0 |
| FR-18 | Legend explaining levels, plus the "Estimated" scale note and disclaimer. | P0 |
| FR-19 | "Sample data" label on the school list. Sample schools use generic names (for example "Sample School, Dwarka A") and each card shows its nearest station. | P0 |
| FR-20 | **Visible attribution** to the World Air Quality Index project and the originating agency returned by the API, on the dashboard footer and in alert emails. Names and links come from each response's attributions list. | P0 |
| FR-21 | Map of schools coloured by level. | P2 |
| FR-22 | Parent email subscription for one school. If built, a judge can also subscribe their own email to the demo school and receive the demo alert after confirming SNS's confirmation email (rate-limited). | P2 |

### 9.5 Demo simulation
Air quality rarely crosses a threshold while the demo is being recorded, so the app includes **one dedicated demo school** that exists only to show the alert pipeline. Only this school can be simulated; every other school shows live data only. The video states that the demo school is for demonstration, that visitors and judges are welcome to try it, and that it will be removed after judging ends.

| ID | Requirement | Priority |
|---|---|---|
| FR-23 | The school list includes exactly one designated demo school, flagged `is_demo_school` and labelled "Demo school (simulation only)" on its card at all times. It is excluded from live fetching and starts at Level 0 (green) as its baseline. | P0 |
| FR-24 | `POST /simulate` takes a severity (Moderate, Poor or Very Poor) and applies it to the demo school only; requests for any other school are rejected. Each severity maps to a preset target concentration in configuration (PM2.5 in the middle of the target band, PM10 held low), converted forward to sub-indices with the active EPA table so the normal pipeline runs end to end. | P0 |
| FR-25 | The simulated reading goes through the same conversion, level check, recommendation and alert code as live data. | P0 |
| FR-26 | While a simulation is active, the demo school's card also shows a "SIMULATED" badge. | P0 |
| FR-27 | The simulated alert goes only to a configured demo email address, is prefixed [DEMO], and is logged with `is_demo` set to true. Real school contacts are never used. Because the control is open to visitors, only a small number of demo emails are sent (for example 5 per hour); beyond that the card still changes but no email is sent and the page says so. | P0 |
| FR-28 | `POST /simulate/reset` and a "Reset demo school" button return the demo school to its baseline (Level 0). A reset sends no "all clear" email. | P0 |
| FR-29 | A simulation expires automatically after about 10 minutes, and a cooldown of a few minutes limits repeat triggers. | P0 |
| FR-30 | The simulation control is open to visitors so judges can try it. The endpoints are protected by API throttling limits, the cooldown (FR-29) and the email cap (FR-27), and can only ever affect the demo school. | P0 |
| FR-31 | After judging ends, the demo school record and the simulation endpoints are removed or disabled. | P1 |
| FR-32 | After a simulation, an "Alert status" panel beside the demo school shows the alert message, the time, and the result reported by Amazon SNS (accepted with a message ID, or not sent because the email cap was reached, or failed). It says "accepted by SNS", not "delivered", since SNS cannot confirm inbox delivery. This lets judges see that an alert was triggered even though the email goes to the owner's inbox. | P0 |
| FR-33 | A "Recent alerts" list for the demo school shows the last few alerts (time, from level to level, status; no raw air quality values), so any visitor sees evidence of past alerts. | P1 |

**How it works (step by step):**
1. The presenter (or a judge) opens the "Demo: simulate spike" control in the footer.
2. They choose a severity; the dashboard calls `POST /simulate`.
3. The backend converts the preset concentrations to sub-indices, stores them in the demo school's simulation fields, sets an expiry time, and runs the normal conversion and classification.
4. The level moves up from the green baseline, so SNS sends a [DEMO] email to the demo address.
5. The card shows the new colour, the "SIMULATED" badge and the recommendation, and the Alert status panel shows the message, the time and the SNS result.
6. "Reset demo school" (or expiry) returns it to green, so the next simulation can fire again.

**Testing before the control exists:** invoke the alert Lambda from the AWS console with a test event containing a fake reading.

## 10. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Dashboard loads in under 3 seconds. |
| Freshness | Data is never older than one source update plus one fetch cycle (about 90 minutes at worst) when the source is healthy. |
| Alert latency | Alert sent within 2 minutes of the fetch that detected the change. |
| Reliability | A failed fetch never breaks the dashboard; it shows the last known value with its timestamp. |
| Compliance | Follow the provider's terms: free, non-commercial use, attribution shown, no cached or archived data redistribution. Re-check the terms before submission, since they can change. |
| Cost | Runs within AWS Free Tier and credits; budget alert set. |
| Security | The API token lives in an environment variable or secrets store, never in code or the repository; least-privilege IAM roles. |
| Privacy | No student data; emails only if the subscription stretch feature is built. |
| Accessibility | Status never relies on colour alone. |

## 11. System Architecture (AWS)

```
EventBridge (schedule)
      |
      v
Lambda: Fetch + convert + classify ---> AQI API (geo lookup)
      |
      v
DynamoDB (Schools: latest reading + current level)
      |
      +-- level worsened? --> SNS --> Email alert (with attribution)
      |                          \-> DynamoDB (Alert log: levels only)
      v
API Gateway + Lambda (read API)
      ^
      |
React dashboard (Amplify Hosting)
```

| Component | Purpose |
|---|---|
| EventBridge | Triggers the fetch on a schedule |
| Lambda | Fetches, converts, classifies, decides whether to alert |
| DynamoDB | Stores schools with their latest status, and the alert log |
| SNS | Delivers email alerts |
| API Gateway + Lambda | Serves current status to the dashboard |
| Amplify Hosting | Hosts the React frontend |
| CloudWatch | Logs and basic monitoring |

## 12. Data Model

**Schools**
| Field | Notes |
|---|---|
| school_id (key), name, lat, lng, contact_email | sample data |
| station_id, station_name, attribution | station chosen once per school; name and attribution returned by the API on each fetch |
| pm25_subindex, pm10_subindex, est_pm25, est_pm10 | latest values only, overwritten each fetch |
| driving_pollutant | which pollutant gave the worse level (pm25 or pm10) |
| current_level, category_label | 0-3 and the Indian category name |
| source_timestamp | the reading's own time from the API; used to skip unchanged readings |
| last_updated | when we last fetched |
| prev_level | used to detect a change |
| is_demo_school | true for the single demo school; excluded from live fetching; baseline Level 0 |
| is_simulated | true while a demo spike is active |
| sim_subindex, sim_level | simulated values (demo school only) |
| sim_expires_at | when the simulation ends automatically |
| last_sim_at | used for the per-school cooldown |

**Alerts**
| Field | Notes |
|---|---|
| school_id (key), timestamp (sort key) | |
| from_level, to_level | |
| status | sent / failed |
| is_demo | true for simulated spikes |

## 13. API Endpoints

| Method | Endpoint | Returns | Priority |
|---|---|---|---|
| GET | /schools | All schools with current level, category, recommendation, attribution | P0 |
| GET | /schools/{id} | One school's status | P1 |
| POST | /simulate | Starts a simulation on the demo school only (severity); throttled and cooldown-limited | P0 |
| POST | /simulate/reset | Returns the demo school to its baseline; throttled | P0 |
| POST | /subscribe | Adds an email for a school | P2 |

## 14. Screens and UX

1. **Dashboard:** title and one-line purpose; "sample data" and "estimated" notices; legend; school cards sorted worst-first. Each card shows school name, category label, level badge (colour plus text), recommendation and the reading's own time ("reading from 14:00"). A small "Demo: simulate spike" control sits in the footer and can change only the labelled demo school card. An "Alert status" panel beside it shows the alert message, time and SNS result. Footer carries the data credits.
2. **Map (P2):** markers coloured by level.
3. **Alert email:** subject like "Alert: [School] air quality now Poor (estimated)"; recommendation in the first two lines; attribution line at the bottom.

## 15. Data Source

- **Provider:** World Air Quality Index project (aqicn.org / api.waqi.info), free personal token. Registration is complete.
- **Terms to respect:** free use, not for paid applications or sold packages, no redistribution as cached or archived data, attribution to the project and originating agency, and the provider may change terms without notice.
- **Scale:** US EPA style AQI; conversion described in section 8.
- **Update frequency:** hourly. Note the minute past the hour at which Delhi stations publish, since it may vary by station.
- **Fallback:** a native Indian source with raw concentrations (CPCB or OpenAQ) if conversion validation fails. Availability, keys and terms not yet verified.
- Schools are sample entries with generic names, two per station; Delhi is the demo city.

## 16. Success Metrics

### Hackathon
| Metric | Target |
|---|---|
| End-to-end flow works | Demonstrated |
| Public deployed URL | Yes |
| Demo video | Under 3 minutes, on YouTube, shows AWS in use |
| Writeup and optional blog post | Writeup submitted with AI tools listed; blog is optional |
| Deployed on AWS | Yes |
| Attribution visible | Dashboard and emails |

### Product quality
| Metric | Target |
|---|---|
| Schools with a station assigned | 100% |
| Alert delivery in tests | 95% or higher |
| Duplicate alerts for an unchanged level | 0 |
| Dashboard load time | Under 3 seconds |
| Estimated category vs official category (validation, 3 Delhi stations) | Matches most of the time, else fallback |

## 17. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Estimated categories disagree with official ones | Medium | High | Validate before building; clear "Estimated" label; fall back to the source scale |
| Breaching provider terms (archiving, missing credit) | Medium | High | Latest-only storage; attribution requirement (FR-20); re-read terms before submission |
| Provider gaps or stale data in Delhi | Medium | High | Stale-data handling (FR-4); test several locations early; native-source fallback |
| Lack of AWS experience | High | High | Practice Lambda, SNS, EventBridge and DynamoDB with throwaway code before Oct 8 |
| Scope creep as a solo builder | High | High | Hold to P0 until the full flow works |
| Token leaked | Low | Medium | Keep it in a secrets store; request a new one if exposed |
| Hourly data delays an alert, or nothing changes naturally during the demo | High | Medium | Alert on the first worsening reading; labelled simulation control for testing and the video |
| Public simulation control is abused (email spam, extra cost) | Medium | Medium | Single demo inbox, hourly email cap, cooldown, API throttling and auto-expiry; the control can only affect the demo school |
| A station goes stale mid-demo (Mundka lagged about 5 hours on Oct 6) | Medium | Medium | Stale-data rule (FR-4) shows "Data unavailable" and sends no alert; check all stations before recording |
| SNS emails in spam or unconfirmed | Medium | Medium | Confirm subscriptions early; test with more than one email provider |
| Unexpected AWS charges | Low | Medium | Budget alert; free-tier services only |
| Run out of time for video and blog | Medium | High | Reserve Sunday morning; outline the blog on Saturday |

## 18. Build Plan

**Before Oct 8 (learning and manual testing only):** project work starts when the clock does. Until then: AWS practice with throwaway code, manual API tests (done; the stations are final), and the conversion check done by hand in a calculator or spreadsheet. The real conversion code is written on Thursday. Keep the planning files out of any git repository until the kickoff and make the first commit after the event opens, because a repository history that does not match the event dates can disqualify the team.

| Day | Focus | Done when |
|---|---|---|
| Thu Oct 8 | Setup, token in secrets, 30-minute per-station fetch (skipping unchanged timestamps), conversion function, seed data from section 25 (5 stations, 10 sample schools, demo school) | Each sample school shows a station and an estimated category in DynamoDB |
| Fri Oct 9 | Level logic, level-change detection, SNS alerts with attribution, demo simulation control | A simulated spike produces exactly one email, marked [DEMO], and reset returns the demo school to green |
| Sat Oct 10 | Read API, React dashboard, mobile layout, attribution footer, Amplify deploy | Public URL shows live status for all sample schools |
| Sun Oct 11 | Bug fixes, demo video (YouTube upload), writeup, optional blog post, submission | Everything submitted before the deadline |

*The last day is Sunday Oct 11. The exact hours and deadline will be posted on the schedule page.*

## 19. Demo Video Plan (3 minutes)

| Time | Content |
|---|---|
| 0:00-0:30 | Problem: a school on a Severe-AQI day and why a raw number is not enough |
| 0:30-1:30 | Dashboard walkthrough: live data, categories, recommendations |
| 1:30-2:15 | The demo school moving to a worse level (via the labelled simulation control; say it stays for judges to try and will be removed after judging) and the alert email arriving |
| 2:15-2:45 | AWS in use: the console showing the Lambda, EventBridge schedule, DynamoDB table and SNS topic, then the architecture slide with data credits visible |
| 2:45-3:00 | Impact and next steps |

## 20. Judging Criteria Mapping

| Criterion | How SafeRecess addresses it |
|---|---|
| Idea and impact | A narrow, real problem; the change is a clear daily decision that cuts children's exposure |
| Built on AWS | Lambda, EventBridge, DynamoDB, SNS, API Gateway, Amplify |
| Design and usability | Two-second readable status, plain language, phone-friendly, text plus colour |
| Execution | Small P0 scope that works end to end, with responsible data handling |
| Demo video | Storyboarded in advance around the alert moment |

## 21. Submission Checklist

- [ ] Student status verified on AWS Builder Center before the event (the fast-track interview and rewards wait on it)
- [ ] Project deployed on AWS with a working URL
- [ ] Public repository linked (token and personal email not committed; commit history starts after the kickoff)
- [ ] Attribution visible on dashboard and in emails
- [ ] Demo video under 3 minutes, uploaded to YouTube (public or unlisted), link tested in a signed-out browser, showing AWS in use
- [ ] Short writeup (problem, build, where AWS fits) with the AI coding tools used listed
- [ ] Optional: blog post on AWS Builder Center (top-5-blogs prize)
- [ ] Track selected: Air
- [ ] Submitted on the hackathon's submission form before the deadline (last day Sun Oct 11; exact time to be posted on the schedule page)
- [ ] Demo school and simulation endpoints removed or disabled after judging ends

## 22. Open Questions

1. Does the conversion estimate match official categories at 3 Delhi stations?
2. Which EPA breakpoint version does the source use for PM2.5?
3. At what minute past the hour do the Delhi stations publish, and does it vary by station? (check the reading timestamps)
4. Which stretch item is worth adding if time remains?
5. What is the exact submission deadline time? (last day is Sun Oct 11; hours not yet posted)
6. Which inbox receives simulated alerts?
7. When does judging end, so we know when to remove the demo school? (check the event pages)
8. When a station's level worsens, send one alert per school, or one combined email per station?

## 23. Future Scope

Real school onboarding, SMS and WhatsApp alerts, forecast-based planning, district-level reports, other cities, and a native Indian data source with a licensed history feed.

## 24. Tech Stack and Tools

### 24.1 Application stack
| Layer | Choice | Notes |
|---|---|---|
| Frontend | React, built with Vite | Responsive dashboard; plain CSS or Tailwind |
| Hosting | AWS Amplify Hosting | Public URL |
| Backend language | Node.js on AWS Lambda | Same language as the frontend; use a currently supported Node runtime |
| Scheduling | Amazon EventBridge | Rate rule, every 30 minutes |
| API | API Gateway (HTTP API) | Read endpoints for the dashboard |
| Database | DynamoDB | Schools (latest status) and alert log |
| Alerts | Amazon SNS (email) | Level-change alerts, with attribution line |
| Secrets | Lambda environment variable or Secrets Manager | WAQI token never in code or the repository |
| Monitoring | CloudWatch | Logs for debugging failed fetches |
| Data source | WAQI API | Coordinate lookup; updates hourly |
| Conversion | Plain JavaScript function | PM2.5 and PM10 sub-indices to µg/m³ to Indian categories (worse level wins), with unit tests |

### 24.2 Libraries
| Library | Use | Priority |
|---|---|---|
| Node built-in `fetch` | Call the WAQI API from Lambda | P0 |
| `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb` (SDK v3) | Read and write DynamoDB | P0 |
| `@aws-sdk/client-sns` | Publish alerts | P0 |
| Vitest or Jest | Unit tests for the conversion and level logic | P1 |
| Leaflet with OpenStreetMap | Map of schools coloured by our levels (FR-21) | P2 |
| `@aws-sdk/client-bedrock-runtime` | AI advisory (stretch) | P2 |

### 24.3 Development tools
| Tool | Use |
|---|---|
| VS Code | Editor |
| Git and GitHub | Version control and the submission repository (no secrets committed) |
| Postman or curl | Manual API checks |
| AWS CLI and CloudShell | Credentials and quick commands |
| AWS SAM CLI (optional) | Define and deploy the backend from one template; local testing needs Docker |
| AI coding assistant (optional): Kiro, Claude Code or GitHub Copilot | Speeds up building; check the event rules first, and review all generated code |
| OBS Studio | Recording the 3-minute demo video |

### 24.4 Stretch tools
- **Amazon Bedrock (AI advisory):** called only when a level changes, with the standard recommendation text as fallback. Anthropic models need a one-time use-case form in the console; Amazon Nova models do not.
- **Leaflet map:** built from our own school data, not WAQI map tiles or widgets, to avoid mixing scales and exposing the token.

### 24.5 Working rules
- Practise in the AWS console first; move to SAM only if time allows.
- Learning and practice are allowed before Oct 8; project code starts Thursday.
- Never paste the WAQI token into an AI tool, a chat, or the repository.
- Understand every piece of generated code, since it will be demoed and written up in the blog post.

## 25. Final Stations and Sample Schools

These five stations are final. Each has two sample schools, shown under generic display names. Real school names stay out of the product. Sample schools use the owner's demo inbox as their contact, never real school contacts. The same data is in `data/stations_and_schools.json`.

| # | Station | Station ID | Sample schools (display names) |
|---|---|---|---|
| 1 | Bramprakash Ayurvedic Hospital, Najafgarh | 10120 | Sample School, Najafgarh A / B |
| 2 | Mundka | 10708 | Sample School, Mundka A / B |
| 3 | Anand Vihar | 2553 | Sample School, Anand Vihar A / B |
| 4 | DITE Okhla | 10116 | Sample School, Okhla A / B |
| 5 | R.K. Puram | 2556 | Sample School, R.K. Puram A / B |
| - | (none: simulation only) | - | Demo School (simulation only) |

**Findings from the first API checks (Oct 6):**
- Readings are stamped on the hour (IST) and can appear within minutes. The feed's `time.iso` has the correct offset; list-style timestamps used a +09:00 offset.
- Mundka's early-morning reading was about 5 hours old, then fresh by 20:00 IST. This is why the 3-hour stale rule (FR-4) matters.
- Mundka's overall AQI was driven by PM10 (198) while PM2.5 was 149, which is why the worst-pollutant rule exists.
- Each response lists its credits. For these stations: the Delhi Pollution Control Committee and the World Air Quality Index Project.
- Hand-calculated checks for the unit tests are in `tasks.md`.
