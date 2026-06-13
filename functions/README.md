# TRINETRA — Catalyst Functions

Two Advanced I/O functions that power the console. Both run in **two modes** and
auto-fall back, so the same code works locally and in the cloud:

- **mock** — reads the generated CSVs in `../data/out` (no Catalyst creds needed)
- **catalyst** — fetches tables via ZCQL through the Catalyst SDK (set `CATALYST_MODE=true`)

| Function | Route | Returns |
|----------|-------|---------|
| `agent` | `POST /server/agent { "q": "..." }` | grounded answer + generated ZCQL + sources + target view + graph focus |
| `network` | `GET /server/network?offender=<name>` | `{ nodes, links }` ego-network |

## Agent pipeline

```
question
  → detectIntent + detectCrimeType        (handler.js)
  → buildZcql(intent)                      (zcql.js — the query shown to the user)
  → validateZcql                           (security gate: SELECT-only, whitelisted tables)
  → [catalyst] Qwen via QuickML LLM-Serving refines the ZCQL  (handler.llmGenerateZcql)
  → DataStore analysis over the data       (datastore.js — joins/aggregations)
  → grounded answer + citations
```

### Security gate (`zcql.js`)
Every query — template- or LLM-generated — must pass `validateZcql` before it
touches the Data Store: single statement, must start with `SELECT`, no
`INSERT/UPDATE/DELETE/DROP/...`, and every `FROM`/`JOIN` target must be a known
table. This is the law-enforcement-grade guard against prompt-injection writing
to the database.

## Run locally (mock mode)

```bash
# generate the data first
python3 ../data/generate_synthetic.py

# smoke-test both functions
node test-local.js
```

Expected: 7 grounded agent answers, the safety gate blocking 4 malicious
queries, and a ~16-node network around the top offender.

## Deploy to Catalyst

```bash
# from the project root
catalyst functions:deploy
# or full project
catalyst deploy
```

Set these environment variables in the Catalyst console for catalyst mode:

| Var | Purpose |
|-----|---------|
| `CATALYST_MODE` | `true` to query the Data Store instead of CSVs |
| `QUICKML_LLM_URL` | QuickML LLM-Serving (Qwen) endpoint for NL→ZCQL |
| `QUICKML_OAUTH_TOKEN` | OAuth token for the endpoint |

> `zcatalyst-sdk-node` is provided by the Catalyst runtime; it's `require`d lazily
> so local mock runs don't need it installed.

## Connect the frontend

Set `NEXT_PUBLIC_AGENT_URL` to the deployed agent URL. When unset, the frontend
uses its built-in local engine (`lib/agent.ts`) — so the UI demos with or without
the backend.

## Notes / production hardening
- Mock + catalyst modes share one analysis layer (`datastore.js`) so answers are
  identical; only the data source differs.
- ZCQL row limits apply per query — deep multi-hop traversal is done by fetching
  edge tables and joining in `network/graph.js` rather than one giant join.
- `csv.js` + `datastore.js` are duplicated into `network/` so each function
  bundles standalone for deploy.
