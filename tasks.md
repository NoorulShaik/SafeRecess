# SafeRecess build tasks (Thu Oct 8 - Sun Oct 11)
Do one task at a time. Run the tests, read the diff, commit.
**Do not run `git init` or commit anything before the kickoff on Thursday.** Repo history must match the event dates.

## Thursday: data and logic
1. **Repo and tooling:** Vite React app plus a `backend/` folder for Lambdas; `.gitignore` covers env files. Done when: repo builds and no token is in it.
2. **Conversion module (with tests):** `convert.js` reads `data/config.json`. Tests (tolerance 0.5 µg/m3):
   - PM2.5 sub-index 129 -> ~46.9 (both EPA tables) -> level 0
   - PM2.5 149 -> ~55.0 -> level 0; PM10 198 -> ~350 -> level 2; worse wins -> level 2
   - PM2.5 170 -> ~82.6 (2024 table, level 1) or ~92.3 (2012 table, level 2)
   - Boundaries at 60/61, 90/91, 120/121 and PM10 100/101, 250/251, 350/351
3. **Parse and stale rules (with tests):** parse a saved feed JSON, read `time.iso`, `iaqi.pm25`, `iaqi.pm10`, attributions; skip unchanged timestamps; older than 3 hours = unavailable.
4. **Seed and fetch Lambda:** load `data/stations_and_schools.json` into DynamoDB; seed script reads the demo inbox from `DEMO_INBOX`; Lambda fetches each station by ID (token from an env var), updates each school's latest reading and level. Done when: all 10 sample schools show a level in DynamoDB.

## Friday: alerts and demo school
5. **Level-change detection and SNS alert:** first worsening reading alerts; email includes recommendation and credits.
6. **Demo school and simulation:** `/simulate`, `/simulate/reset`, cooldown, expiry, throttling, hourly email cap, [DEMO] prefix, Alert status data.
7. **Test end to end:** a simulated spike sends exactly one [DEMO] email; reset returns the demo school to green; spamming the button does not flood the inbox.

## Saturday: dashboard and deploy
8. **Read API:** `GET /schools` returns status, category, recommendation, driving pollutant, reading time, credits.
9. **React dashboard:** cards sorted worst-first, colour plus text, legend, "sample data" and "estimated" notices, credits footer, demo control, Alert status panel, recent alerts (P1).
10. **Deploy on Amplify:** public URL, phone layout check. Stretch only if all above works: Leaflet map from our own data; Bedrock advisory.

## Sunday: finish
11. **Full test on the live URL**; re-read the provider terms; confirm no secrets in the repo.
12. **Record the demo video** (under 3 minutes; show AWS in use, e.g. the console; rehearse the simulation first), upload to YouTube as public or unlisted, and test the link signed out.
13. **Write the submission writeup** (problem, build, where AWS fits) and list the AI coding tools used. The blog post on AWS Builder Center is optional.
14. **Submit** before the deadline.
