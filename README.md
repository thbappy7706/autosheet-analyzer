# AutoSheet Analyzer

Upload any CSV, TSV or Excel file and instantly get an automatic analysis:
dataset summary, per-column profiles, charts, correlations and plain-language
insights. **No manual configuration** — the file is parsed, typed and profiled
on the fly.

The entire UI is available in **English** and **Bangla**, switchable at runtime.

---

## Quick start (local, no Docker)

Requirements: **Go 1.22+**, **Node 20+**.

```bash
# 1. install dependencies
make install          # or: go mod download + npm install in each folder

# 2. run both servers (backend :8080, frontend :5173)
make dev
```

Then open <http://localhost:5173> and drop one of the files from [`samples/`](samples).

Prefer separate terminals?

```bash
# terminal 1
make dev-backend      # cd backend && go run ./cmd/server

# terminal 2
make dev-frontend     # cd frontend && npm run dev
```

Copy [`.env.example`](.env.example) values into your environment to change the
port, upload limit, store TTL, sampling threshold, CORS origin or rate limit.

### Other make targets

| Command             | What it does                                          |
| ------------------- | ----------------------------------------------------- |
| `make test`         | Go tests + frontend Vitest suite                       |
| `make lint`         | `go vet`, ESLint and the i18n key-parity check         |
| `make build`        | Compile the Go server and bundle the frontend          |
| `make dev`          | Run backend and frontend together                      |

---

## Repository layout

```
.
├── backend/                       Go API
│   ├── cmd/server/                entrypoint (env config, graceful shutdown)
│   ├── cmd/gensamples/            writes samples/sample.xlsx
│   └── internal/
│       ├── api/                   router, handlers, middleware, error envelope
│       ├── parser/                csv.go, excel.go, detect.go (delimiter/encoding)
│       ├── analyzer/              typeinfer.go, stats.go, correlation.go,
│       │                          insights.go, profile.go, dateparse.go
│       ├── numutil/               messy number parsing (currency, %, Bangla digits)
│       ├── store/                 storage interface + in-memory TTL implementation
│       └── model/                 shared structs serialized to JSON
├── frontend/                      React 19 + TypeScript + Vite
│   └── src/
│       ├── api/                   typed client + TanStack Query hooks
│       ├── components/            upload/ summary/ table/ columns/ charts/ export/
│       ├── pages/                 UploadPage, DashboardPage
│       ├── hooks/                 useDebounced
│       ├── lib/                   formatting, settings, chart palette, PNG export
│       ├── locales/{en,bn}/       translation namespaces
│       └── types/                 analysis types + generated i18n key types
├── samples/                       sample CSV and XLSX files to try
├── openapi.yaml                   API contract (also documents the JSON schema)
└── Makefile
```

---

## Architecture

```
                    ┌─────────────────────────────┐
   browser  ──────► │  React 19 + Vite (5173)     │
                    │  TanStack Query / Table /   │
                    │  Virtual · Recharts · DaisyUI│
                    └──────────────┬──────────────┘
                                   │  /api/v1/*  (Vite dev proxy)
                                   ▼
                    ┌─────────────────────────────┐
                    │  Go API (chi) :8080         │
                    │  ┌───────────────────────┐  │
   upload ────────► │  │ api/    handlers      │  │
                    │  │  size limit, sniff,   │  │
                    │  │  rate limit, CORS     │  │
                    │  ├───────────────────────┤  │
                    │  │ parser/ csv · excel   │  │
                    │  │  delimiter/encoding   │  │
                    │  ├───────────────────────┤  │
                    │  │ analyzer/ profile     │  │
                    │  │  typeinfer · stats    │  │
                    │  │  correlation·insights │  │
                    │  ├───────────────────────┤  │
                    │  │ store/ TTL temp files │  │
                    │  │  + in-memory cache    │  │
                    │  └───────────────────────┘  │
                    └─────────────────────────────┘
```

**Request flow for an upload**

1. `POST /api/v1/uploads` reads the body through `http.MaxBytesReader`, then
   sniffs the content (ZIP magic for `.xlsx`/`.xlsm`, OLE2 for legacy `.xls`,
   otherwise text) and validates it against the extension.
2. `parser` detects the delimiter and encoding, normalizes the table (ragged
   rows padded/truncated, empty columns and rows dropped, blank/duplicate
   headers renamed) or expands Excel merged cells and lists the sheets.
3. The raw file is written to a temp path and the parsed tables are cached in
   memory behind a `store.Store` interface.
4. `GET /api/v1/uploads/{id}/analysis` profiles the table: type inference,
   descriptive statistics, correlations and rule-based insights. Results are
   cached per sheet. Columns are profiled in parallel with a bounded worker
   pool, and files larger than `SAMPLE_ROWS` are analysed on a sample.

---

## API

Full contract: [`openapi.yaml`](openapi.yaml).

| Method   | Path                                     | Purpose                                   |
| -------- | ---------------------------------------- | ----------------------------------------- |
| `POST`   | `/api/v1/uploads`                        | multipart upload → `{ id, filename, sheets[] }` |
| `GET`    | `/api/v1/uploads/{id}`                   | upload metadata                            |
| `GET`    | `/api/v1/uploads/{id}/analysis?sheet=`   | full analysis result                       |
| `GET`    | `/api/v1/uploads/{id}/rows?sheet=&page=&pageSize=&sort=&order=&filter=` | paginated rows |
| `POST`   | `/api/v1/uploads/{id}/aggregate`         | chart data for `{ x, y, agg, groupBy }`    |
| `DELETE` | `/api/v1/uploads/{id}`                   | drop the upload and its cache              |
| `GET`    | `/healthz`                               | liveness probe                             |

Errors always use one envelope:

```json
{ "error": { "code": "FILE_TOO_LARGE", "message": "file exceeds the maximum size",
             "params": { "maxBytes": 52428800 } } }
```

### Analysis response (abridged)

```jsonc
{
  "overview": { "rows": 5, "columns": 6, "missingPercent": 0, "duplicateRows": 0,
                "qualityScore": 100, "sampled": false, "analyzedRows": 5 },
  "columns": [
    { "name": "age", "type": "integer", "missingPct": 0, "unique": 5,
      "numeric": { "min": 25, "max": 41, "mean": 32, "median": 30,
                   "q1": 29, "q3": 35, "iqr": 6, "stdDev": 6.16,
                   "outlierCount": 0, "histogram": [ /* bins */ ] } },
    { "name": "region", "type": "categorical",
      "categorical": { "top": [ { "value": "North", "count": 3, "pct": 37.5 } ],
                       "cardinality": 4 } },
    { "name": "sold_on", "type": "date",
      "date": { "min": "2024-01-05T00:00:00Z", "frequency": "monthly",
                "byMonth": [ /* buckets */ ] } }
  ],
  "correlation": { "columns": ["units", "revenue"],
                   "matrix": [[1, 0.972], [0.972, 1]],
                   "highPairs": [ { "a": "units", "b": "revenue", "r": 0.972 } ] },
  "insights": [ { "code": "HIGH_CORRELATION", "severity": "info",
                  "params": { "a": "units", "b": "revenue", "r": 0.97 } } ]
}
```

### Language neutrality

The API never returns prose. Insights and errors are **stable machine codes**
plus parameters (`{"code": "HIGH_MISSING", "params": {"column": "age", "percent": 42.5}}`)
that the frontend renders through i18next. Exports that contain text honour the
active language via the `Accept-Language` header.

---

## Internationalization

- `i18next` + `react-i18next` + `i18next-browser-languagedetector`.
- Namespaces: `common`, `upload`, `summary`, `table`, `columns`, `charts`,
  `insights`, `errors` under `src/locales/{en,bn}/`.
- Persisted in `localStorage` (`lang`), defaults to the browser language and
  falls back to `en`. `<html lang>` is updated on change.
- Keys are **type-checked**: `src/types/i18n.d.ts` derives the key union from the
  English JSON, so a missing key is a compile error.
- `pnpm/npm run i18n:check` (also a Vitest test) fails if `bn` and `en` diverge.
- `eslint-plugin-i18next/no-literal-string` guards against hardcoded UI text.
- Number/date formatting uses `Intl` with `bn-BD` / `en-US`. A setting toggles
  **Bangla digits (০-৯)** for UI chrome; raw data values always stay in Latin
  digits so analysis numbers remain unambiguous, while South Asian grouping
  (12,34,567) is used for `bn-BD`.
- Bangla parsing is supported end to end: UTF-8 BOM, Bangla headers/values,
  Bangla digits in numeric columns (normalized for computation) and Bangla
  month names in dates.
- `Hind Siliguri` is loaded with `font-display: swap` and applied under
  `:lang(bn)` with a roomier `line-height`.

---

## Tests

**Backend** (`cd backend && go test ./...`)

- `numutil` — currency, thousands separators, percentages, accounting
  negatives, Bangla digits, rejection of dates/ranges/free text.
- `analyzer` — type inference (incl. Bangla digits, Bangla months, missing
  markers, mixed types), descriptive stats against hand-computed values
  (variance, skewness, kurtosis, quartiles, IQR outliers), histogram totals,
  date parsing and frequency inference.
- `parser` — delimiter and encoding detection (BOM, Windows-1252), ragged rows,
  blank/duplicate headers, header detection, no-header files, TSV, Excel
  (multi-sheet, merged cells, empty sheet, legacy `.xls` error).
- `api` — full upload → analysis → rows → aggregate → delete flow over
  `httptest`, plus rejection of missing files, mismatched content and unknown
  extensions.

Fixtures live in `backend/internal/parser/testdata/` (clean, messy, Bangla,
Excel built in-memory).

**Frontend** (`cd frontend && npm run test`)

- Vitest + React Testing Library: summary rendering with translated insights,
  formatting helpers (Latin vs Bangla digits, Bengali-safe truncation) and
  en/bn key parity.

**End-to-end (Playwright)**

```bash
cd frontend
npx playwright install chromium   # one-time browser download
npm run e2e
```

`e2e/upload.spec.ts` uploads a sample file, waits for the dashboard, switches
to Bangla and asserts no raw `namespace.key` placeholders leak into the UI.

---

## Sample data

| File                     | What it exercises                                             |
| ------------------------ | ------------------------------------------------------------- |
| `samples/clean.csv`      | tidy CSV with numeric, date, boolean and id-like columns      |
| `samples/messy.csv`      | ragged rows, blank/duplicate headers, missing markers, blank row |
| `samples/bangla.csv`     | Bangla headers, values, digits and dates                      |
| `samples/sample.xlsx`    | two sheets (`Sales`, `Bangla`) for the multi-sheet picker     |

Regenerate the workbook with `go run ./cmd/gensamples` from `backend/`.

---

## Security notes

- `http.MaxBytesReader` plus an explicit size check; upload size configurable.
- Extension **and** content are validated (MIME sniff via magic bytes).
- Filenames are sanitized; only safe characters (including Bangla) survive.
- Excel is read through excelize with `UnzipSizeLimit` /
  `UnzipXMLSizeLimit` guards against zip bombs, and **formulas are never
  evaluated** — only cached cell values are read.
- Per-IP fixed-window rate limiting; uploads expire after `STORE_TTL_MINUTES`.
