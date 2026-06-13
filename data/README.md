# TRINETRA — synthetic data

KSP supplies the **schema and master tables only** (synthetic data, no real PII).
This generator produces a realistic-but-fake crime database matching that schema,
with deliberately **planted organised-crime networks** so the agent and graph
always surface dramatic, true findings during a demo.

## Files

| File | What |
|------|------|
| `schema.md` | Catalyst Data Store schema — tables, columns, types, relationships |
| `generate_synthetic.py` | Generator (stdlib only — no pip install) |
| `demo_queries.md` | ZCQL queries that hit the planted rings |
| `out/*.csv` | Generated tables, one CSV per Data Store table (git-ignored) |
| `out/manifest.json` | Row counts + planted-ring summary |

## Run

```bash
cd data
python3 generate_synthetic.py                 # 2,000 baseline FIRs, seed 42
python3 generate_synthetic.py --firs 150000    # scale test (1.5 lakh)
python3 generate_synthetic.py --seed 7 --out ./out7
```

A fixed `--seed` makes the data (and the planted-ring IDs) reproducible.

## Planted networks

1. **Suresh M.** — BLR South chain-snatching ring: 6 FIRs tied by a shared phone + a mule account (money trail).
2. **Manjunath G.** — cross-district vehicle-theft ring: 5 FIRs, Whitefield / KR Puram / Yelahanka, late-night.
3. **Deepa N.** — OTP-fraud money-mule cluster: 4 FIRs with a transaction trail.

These guarantee that "who connects these cases?", "show repeat offenders",
"trace the money trail", and "hotspots" all return compelling results.

## Load into Catalyst Data Store

Create the tables per `schema.md`, then import each CSV (Data Store → table →
Import, or the Catalyst CLI bulk import) in **FK order**:

```
stations → officers → persons → firs → phones → accounts →
case_persons → person_phones → fir_phones → transactions → offender_profiles
```

## How the frontend connects

The shell's `lib/mockData.ts` mirrors a small slice of this (the Suresh ring) so
the UI runs standalone. In production, the network-build Function queries these
tables (see `demo_queries.md`) and returns the same `{ nodes, links }` shape the
graph already consumes — a drop-in swap.
