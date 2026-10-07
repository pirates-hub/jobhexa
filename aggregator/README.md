# JobHexa Aggregator — fetch + store only

Config-driven fetcher for Indian government job notifications (Central + 28 states + 8 UTs). No frontend, no notifications. It normalizes jobs into SQLite (Node.js built-in `node:sqlite`, no native addons) and exports `jobs.json` / `jobs.csv`.

## Setup

```bash
cd aggregator
npm install
node index.js --once --source tnpsc   # single-source smoke test
node index.js --once                  # full run
node index.js                         # scheduler, default every 3 hours
```

Optional: `npm install --include=optional` for Playwright (JS-rendered pages) and tesseract.js (OCR fallback). Env knobs: `AGG_CRON`, `AGG_PARALLEL`, `AGG_DELAY_MS`, `AGG_TIMEOUT_MS`, `AGG_RETRIES`, `AGG_DB`, `AGG_UA`, `AGG_LOG_LEVEL`.

CLI filters: `--source <id>` (see `sources.json`), `--state "Tamil Nadu"`.

## How to add a new state (config only)

Append to `sources.json`:

```json
{ "id": "newpsc", "name": "New State PSC", "state": "New State", "type": "state",
  "url": "https://verified-official-url.gov.in", "method": "html", "enabled": true }
```

Optional per-source keys: `rssUrl` (checked before HTML), `keywordFilter` (string array), `selectors` (reserved), `ignoreCert: true` (expired-SSL sites only), `fallback: true` (aggregator sites).

## How to fix a broken layout (one file, one source)

1. Check `data/health.json` → `failures` / `empty` lists name the broken source.
2. Save the changed page as `test/fixtures/<id>.html`, add a case in `test/adapters.test.js`.
3. Copy `src/adapters/overrides/_template.js` to `src/adapters/overrides/<id>.js` and export `discover(source)` returning `{ ok, docs: [{url, label}] }`. It auto-loads; nothing else changes.
4. `npm test`, then `node index.js --once --source <id>`.

## Debugging a source

- `data/health.json` — per-run summary (tried/succeeded/failed/new/updated) + per-source errors and timings.
- 0-result warnings mean the layout changed (see above).
- `HTTP 403` = bot-blocked (mark `method: playwright` or `enabled: false` + rely on fallback).
- Run with `AGG_LOG_LEVEL=debug` for per-request detail.

## Data model

`id` = sha256(org + title + lastDate). SQLite unique index on `id`; `job_history` records `lastDate`/`vacancies` changes; `category` is `new`/`active`/`closing_soon`/`expired`.
