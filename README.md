# River Watch CA2

Live site: https://hgvantrang.github.io/riverwatch_ca2/

River Watch reads a Google Sheet, daily Open-Meteo/GloFAS river forecasts and official Met Eireann warnings for eight Irish towns. Code calculates thresholds and crew assignments. An optional Groq assistant explains the results. The Duty Officer makes the final decision.

## Use the site

1. Open the live site. The supplied Google Sheet is configured by default.
2. The Groq assistant uses a server-side Cloudflare Worker. Visitors do not enter an API key.
3. Ask for tonight's plan, an explanation for Fermoy, the Clonmel 150 m3/s scenario, or the flood-defence study priority.
4. Expand the evidence section to inspect source URLs, dates, numbers and allocations.

Each in-scope question fetches the Sheet, warnings and forecasts again. Keep rehearsal override cells empty for normal operation. The initial Sheet values are in towns.csv. Lecturer edit access is managed separately in Google Sheets.

## Run locally

Python 3.10+ and Node.js 18+ are sufficient for the core app and calculation tests. No JavaScript package installation is required.

```sh
python -m http.server 8000
node test_engine.mjs
python test_plan.py
```

Open http://localhost:8000. The same files run on GitHub Pages with main as the source branch and the repository root as the publishing folder.

## Reproduce the data

```sh
python prepare_data.py
python inspect_cells.py
python verify_live.py
node test_live.mjs
```

prepare_data.py reads river_points.json, reuses selected-point history files when present, validates 3,653 daily values and recomputes percentiles and winter event counts. inspect_cells.py retrieves a neighbouring-cell screening sample. verify_live.py fetches current sources and writes local live_verification.json, including an explicitly in-memory rehearsal. test_live.mjs compares JavaScript and Python results using that evidence. These commands make public network requests. Install tzdata on systems without an IANA time-zone database.

The stored history covers 2016-01-01 to 2025-12-31. Percentiles use inclusive linear interpolation. Winter events are consecutive-day runs at or above P99 within October-March, 2016/17 through 2024/25. The first-four versus last-four comparison omits the middle winter.

## Verification status

Automated boundary, capacity, Mallow travel restriction, Bandon barrier availability, Roscommon warning and override checks passed. JavaScript and Python agreed on the captured live baseline and local rehearsal. Ennis has the highest provisional event count, 17, with 7 in the first four winters and 9 in the last four.

Exact GloFAS river-cell identity still requires independent mapped verification. OPW stations anchor town locations and nearby flows support candidate selection, but model cells are not observed gauges. The five required questions were exercised through the application handler with live sources: four real Groq responses and one local scope referral. Browser screenshots and an actual Sheet-edit rehearsal remain outstanding. Free-text operational notes beyond the implemented restrictions need human interpretation. The project is an assessment prototype with these explicit limits.

## Files and attribution

- index.html, styles.css, dashboard.mjs, app.mjs, engine.mjs, answers.mjs and settings.mjs implement the static site.
- history_summary.json stores thresholds, counts, coordinates and provenance.
- river_points.json and candidate_cells.json document station anchors and screening.
- data/ retains downloaded public model histories, including the original candidate files for comparison.
- build_report.py generates the local assessment report. Install reportlab and pymupdf to run it. It contains student information and is kept locally.

Flow data and source terms: https://open-meteo.com/en/docs/flood-api (Open-Meteo / Copernicus CEMS GloFAS).

OPW station locations: https://waterlevel.ie/geojson/

Official warnings: https://www.met.ie/Open_Data/json/warning_IRELAND.json

Warning schema, FIPS mapping and attribution terms: https://www.met.ie/Open_Data/Warnings/Met_Eireann_Warning_description_June2020.pdf

Groq model and pricing: https://console.groq.com/docs/models

No API key is included. Task 5 must be written independently by the student under the assessment instructions.

## Map interface

The dashboard serves Leaflet 1.9.4 from vendor/leaflet and uses OpenStreetMap tiles, with attribution on the map. Markers use OPW station locations and show the calculated town recommendation. Town details remain available through the list when the map library is unavailable. Counts and map colours reset while a new question reads sources. No inundation extent is calculated.

Run `node test_dashboard.mjs` for the DOM contract and stale-data reset checks. This is not a real-browser visual test.

The page automatically retrieves its initial plan without an LLM request. Each manual question reads live sources again and shows the AI answer directly. Official warning/forecast endpoints are tried first; Worker routes `/api/warnings` and `/api/flood` provide CORS-enabled fallbacks. Full source evidence stays in the page; only compact calculated evidence goes to the model. HTTP 429 is shown as a rate-limit message with a retry delay.

The Cloudflare Worker uses `openai/gpt-oss-120b` on Groq. Deploy with `npx wrangler login`, `npx wrangler deploy`, then `npx wrangler secret put GROQ_API_KEY` (enter the key at the hidden prompt). Never put a key in files or Git. The deployed URL is `https://riverwatch-groq.hgvantrang.workers.dev`. Production browser calls are allowed only from `https://hgvantrang.github.io`; local previews can test calculations, but AI calls require a separately configured development Worker origin. The account tier, billing cap and remaining quota must be checked by the account owner.

The page automatically retrieves its initial plan without sending an LLM request. Startup errors appear above the overview. Run `node test_startup.mjs` for a complete application startup test against live sources with a lightweight DOM harness; real-browser verification remains separate.
