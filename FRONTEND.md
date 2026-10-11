
# SafeRecess dashboard and subscriptions (read this before any frontend work)
This file supersedes the older dashboard, demo-school and subscription notes in PRD.md and CLAUDE.md where they conflict.

## Goal and feel
A principal, PE teacher or parent should answer "can the kids go outside today?" in two seconds. It should feel like a calm public-health notice board, not a SaaS admin template. Mobile-first (design at 360px wide), then scale up.

## Page layout (single page)
1. **Header:** name, one-line purpose, and a clear banner: "Demo project: sample schools, not real school data."
2. **Summary strip:** count of schools per level, the newest reading time, and "Readings update about hourly."
3. **School list:** cards sorted worst level first; search box and a filter by area/station.
4. **Demo school card:** shown separately at the bottom, labelled "Demo school (owner only)". No subscribe button.
5. **Legend** explaining Levels 0-3 (colour + text label + icon), and a note: "Estimated India (CPCB) categories, based on PM2.5 and PM10 (worse of the two)."
6. **Footer:** data credits taken from the API's attributions (never hard-coded), the disclaimer ("general guidance, not medical advice; follow official advisories"), and a privacy note ("emails are used only for alerts; every email has an unsubscribe link").

## School card
- School display name, area, nearest station.
- **Level badge** (colour AND text, e.g. "Level 2 - Poor: no outdoor sports").
- **Live values:** estimated PM2.5 and PM10 in µg/m³, the pollutant driving the level, and the source AQI (US scale) in small text, e.g. "Source AQI (US scale): 129".
- Recommendation sentence from the API.
- **Reading time** ("Reading from 14:00 IST, 1 h ago"). If stale or missing: grey "Data unavailable", no colour level.
- **Subscribe** button.

## Subscribe flow (drawer or modal)
- Fields: email; role (Parent / Principal / PE teacher); schools (the clicked one pre-selected, tick any others; the demo school never appears).
- After submit: "Check your inbox and click Confirm in the email from AWS Notifications. You won't get alerts until you confirm."
- Friendly states: sending, success, invalid email, too many requests, server error with a retry.
- Role P0: store it as a filter attribute; role-specific message wording is P1 (parents get a plain-language message, staff get the action list).

## Visual rules
- Level colours with WCAG AA contrast on their backgrounds; never colour alone.
- One typeface (system stack or one web font), large numerals for readings, generous spacing, rounded cards, subtle shadows.
- Skeleton loading, empty state, error state with retry. Keyboard accessible, proper labels and aria attributes.
- No component library needed. Plain CSS or Tailwind. No heavy dependencies. No map, no history charts.
- Poll `GET /schools` every 5 minutes. `VITE_API_URL` comes from the environment. Never put the WAQI token or any secret in the frontend.

## Demo school: owner only (replaces earlier rules)
- One school flagged `is_demo_school`, never fetched live, baseline Level 0, visible but read-only for visitors.
- **Nobody else can subscribe to it or simulate it.** `POST /subscribe` rejects its id. Its alerts use a separate DemoAlerts topic that only has the owner's email.
- `POST /simulate` and `POST /simulate/reset` require a demo key (header `x-demo-key`, value from an environment parameter `DEMO_KEY`, never committed). Any other caller gets 403. The dashboard shows the simulate control only after the owner enters the key.
- Keep the presets, expiry, cooldown and email cap. Reset sends no all-clear. The Alert status panel appears only in the owner's session.
- Judges and visitors cannot test it; they see the demo video.

## Backend work the dashboard needs
1. **Two SNS topics:** `SchoolAlertsTopic` (public subscriptions) and the existing owner topic as `DemoAlertsTopic` (only the AlertEmail subscription). Real-school alerts publish to the public topic with message attributes `school_id` and `audience`; demo alerts publish only to the owner topic.
2. **`POST /subscribe`** (body: email, role, school_ids). Validate the email, role (`parent`, `principal`, `pe_teacher`) and that every school exists and is not the demo school. One subscription per email with a filter policy (`school_id` list and `audience` list). If the email already has a confirmed subscription, merge into its filter policy with `SetSubscriptionAttributes`; if it is still pending, answer "confirm the email first". Otherwise `Subscribe` and return 202. Always give the same response whether or not the email was known. The Lambda needs permissions for `sns:Subscribe`, `sns:ListSubscriptionsByTopic` and `sns:SetSubscriptionAttributes` on the public topic only.
3. **Abuse limits:** API throttling on `/subscribe`, a per-email cooldown, a cap on schools per request, and CORS restricted to the Amplify domain once known.
4. **Alert emails** must carry the data credits and the line "Sample school: demo project."
5. **Tests** for the validation, the demo-school rejection and the 403 on `/simulate` without the key.

## Build order (time is short)
1. Dashboard against the existing `GET /schools` (no subscribe yet).
2. Backend: two topics, `/subscribe`, demo key.
3. Wire the subscribe drawer.
4. P1 only if time remains: role-specific message wording, recent alerts.
