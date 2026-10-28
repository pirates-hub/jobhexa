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

Optional: `npm install --include=optional` for Playwright (JS-rendered pages) and tesseract.js (OCR fallback). Env knobs: `AGG_CRON`, `AGG_PARALLEL`, `AGG_DELAY_MS`, `AGG_TIMEOUT_MS`, `AGG_RETRIES`, `AGG_DB`, `AGG_UA`, `AGG_LOG_LEVEL`, `AGG_SYNC_URL`, `AGG_SYNC_SECRET`. Env can live in `aggregator/.env` (gitignored, see `.env.example`) — plain `KEY=value` lines, real environment variables always win.

CLI filters: `--source <id>` (see `sources.json`), `--state "Tamil Nadu"`.

## Auto-import into the admin Aggregator Inbox (auto-publish)

The aggregator stores jobs in its own SQLite DB; the website keeps them in Mongo. After every run (`--once` and each scheduled run) the aggregator POSTs `data/jobs.json` to the server, so Admin → **Aggregator Inbox** fills up automatically — no manual "Upload jobs.json" needed.

Titles are quality-gated on both sides (`src/quality.js` in the aggregator, mirrored in the server mapper): navigation junk ("Click Here", "View"), non-recruitment notices (results, corrigenda, admit cards, exam logistics, workshops, manuals) and semantically empty titles are rejected; everything else — real government recruitment notices in English **or** any official language — is **published immediately** (`verified`), so current Central + state notifications appear on the public site with no approval step. The run summary reports `filteredByQuality`, and `node scripts/purge-junk.mjs` sweeps junk out of an existing SQLite store.

1. **Server** (`server/.env`): `AGG_SYNC_SECRET=<random hex>` — without it the endpoint answers 503 (sync disabled).
2. **Aggregator** (`aggregator/.env`): `AGG_SYNC_URL=<server>/api/aggregator/sync` + the same `AGG_SYNC_SECRET`.
3. Run `node index.js --once` — the log line `aggregator sync: inbox imported` with `received/created/updated` counts confirms it.

Notes: sync is best-effort (a failed sync warns but never fails the run), idempotent (server upserts on `aggregatorMeta.id`), and unconfigured sync is skipped with an info log. For GitHub Actions, add repo secrets `AGG_SYNC_URL` (public server URL) and `AGG_SYNC_SECRET`; the workflow passes them through. The manual upload button still works and behaves identically.

## How to add a new state (config only)

Append to `sources.json`:

```json
{ "id": "newpsc", "name": "New State PSC", "state": "New State", "type": "state",
  "url": "https://verified-official-url.gov.in", "method": "html", "enabled": true }
```

Optional per-source keys: `rssUrl` (checked before HTML), `keywordFilter` (string array), `selectors` (reserved), `ignoreCert: true` (expired/broken-SSL sites only), `legacyTls: true` (sites that need unsafe TLS legacy renegotiation), `insecureParser: true` (sites sending malformed header tokens), `headers` (per-source request headers, e.g. a browser `User-Agent`), `fallback: true` (aggregator sites).

## How to fix a broken layout (one file, one source)

1. Check `data/health.json` → `failures` / `empty` lists name the broken source.
2. Save the changed page as `test/fixtures/<id>.html`, add a case in `test/adapters.test.js`.
3. Copy `src/adapters/overrides/_template.js` to `src/adapters/overrides/<id>.js` and export `discover(source)` returning `{ ok, docs: [{url, label}] }`. It auto-loads; nothing else changes.
4. `npm test`, then `node index.js --once --source <id>`.

## Debugging a source

- `data/health.json` — per-run summary (tried/succeeded/failed/new/updated) + per-source errors and timings.
- 0-result warnings mean the layout changed (see above).
- `HTTP 403` = bot-blocked (the fetcher already retries once with a browser User-Agent; if it still fails, mark `method: playwright` or `enabled: false` + rely on fallback).
- `node scripts/test-overrides.mjs` — re-runs the custom overrides (ssc, uppsc, opsc) and prints their docs without a full run.
- A source that hangs is failed by a 7-minute watchdog instead of stalling the whole run.
- Run with `AGG_LOG_LEVEL=debug` for per-request detail.

## Data model

`id` = sha256(org + title + lastDate). SQLite unique index on `id`; `job_history` records `lastDate`/`vacancies` changes; `category` is `new`/`active`/`closing_soon`/`expired`.
