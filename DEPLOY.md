# TRINETRA — Catalyst deployment runbook

Deployment on **Zoho Catalyst is mandatory** for the KSP Datathon. This is the
end-to-end path. Where exact CLI flags differ by version, confirm against
https://docs.catalyst.zoho.com and the in-console **Help**.

Repo layout:
```
trinetra/
├── app/ components/ lib/      # Next.js frontend  → Catalyst Slate
├── functions/agent            # NL→ZCQL agent     → Catalyst Functions
├── functions/network          # network-build     → Catalyst Functions
├── data/                      # schema + CSV generator → Catalyst Data Store
└── catalyst.json
```

---

## 0. Prerequisites (10 min)

1. **Claim credits.** In the HackerEarth dashboard → Resources → open the Catalyst
   sign-up link (`https://catalyst.zoho.com/promotions.html?cn=KSPH26`). Sign in,
   redeem, then in the Catalyst console → Settings → Manage Billing → Basic plan →
   tick **"use my wallet credit"** → proceed. You get ₹1,500 + $250 in credits.
2. **Install the CLI and log in:**
   ```bash
   npm install -g zcatalyst-cli
   catalyst login        # opens browser SSO
   ```
3. **Create the project** in the Catalyst console (e.g. `trinetra`). Note the
   **project name** and **zaid** (project id) shown in the URL.

---

## 1. Data Store — tables + data (30–40 min)

1. Generate the synthetic data:
   ```bash
   cd trinetra/data
   python3 generate_synthetic.py        # writes out/*.csv
   ```
2. In the console → **Data Store** → create the 11 tables exactly as in
   [`data/schema.md`](data/schema.md) (column names + types). Tip: create columns
   first, then import.
3. **Import each CSV** (table → Import → upload `out/<table>.csv`) in **FK order**:
   ```
   stations → officers → persons → firs → phones → accounts →
   case_persons → person_phones → fir_phones → transactions → offender_profiles
   ```
4. (Optional) enable **Data Store Search** indexing on `firs.modus_operandi`,
   `firs.crime_type`, `persons.full_name`.

---

## 2. QuickML — Qwen LLM endpoint (15 min)

1. Console → **QuickML → Generative AI → LLM Serving** → pick a Qwen model
   (14B-instruct). Open the chat, set temperature ≈ 0.1.
2. Copy the **endpoint URL** and generate an **OAuth token** (Catalyst
   Connections / the endpoint's auth panel).
3. (Optional, recommended) **RAG**: create a Knowledge Base, upload IPC / SOP
   PDFs, point RAG at it, copy that endpoint too.

These map to the `QUICKML_LLM_URL` / `QUICKML_OAUTH_TOKEN` env vars below.

---

## 3. Functions — deploy agent + network (15 min)

The functions auto-fall back to mock mode, so they deploy and run even before
env vars are set; setting `CATALYST_MODE=true` switches them to the Data Store.

```bash
cd trinetra
# (no third-party deps; zcatalyst-sdk-node is provided by the runtime)
catalyst deploy            # deploys functions in ./functions
```

Set environment variables for each function (console → Functions → <fn> →
Settings → Environment Variables, or in catalyst-config.json):

| Var | Value |
|-----|-------|
| `CATALYST_MODE` | `true` |
| `QUICKML_LLM_URL` | the Qwen endpoint from step 2 |
| `QUICKML_OAUTH_TOKEN` | the OAuth token from step 2 |
| `AGENT_DATA_DIR` | *(leave unset in catalyst mode)* |

After deploy, your function URLs look like:
```
https://<project>-<zaid>.development.catalystserverless.com/server/agent
https://<project>-<zaid>.development.catalystserverless.com/server/network
```
Smoke-test:
```bash
curl -X POST https://<...>/server/agent -H 'Content-Type: application/json' \
  -d '{"q":"who connects these chain-snatching cases?"}'
```

---

## 4. Frontend — Catalyst Slate (15 min)

Slate natively detects Next.js and runs the build + deploy.

1. Point the app at the deployed agent. Create `trinetra/.env.production`:
   ```
   NEXT_PUBLIC_AGENT_URL=https://<project>-<zaid>.development.catalystserverless.com/server/agent
   ```
   (When unset, the UI uses its built-in local engine — so it still demos.)
2. Deploy via Slate:
   ```bash
   cd trinetra
   catalyst slate:init        # one-time; detects Next.js
   npm run build
   catalyst slate:deploy      # builds + deploys, returns a public URL
   ```
   *Alternative (static, if you prefer Web Client Hosting):* add
   `output: 'export'` + `images: { unoptimized: true }` to `next.config.mjs`,
   `npm run build` → serve the generated `out/` via Web Client Hosting.
3. Map a **custom domain + SSL** (optional) via Domain Mappings.

---

## 5. Auth + API Gateway (optional, raises the score)

- **Authentication**: enable Catalyst Auth; gate the console behind login and
  scope views by role (investigator / analyst / supervisor).
- **API Gateway**: put throttling + auth in front of `/server/agent`.

---

## 6. Verify + submit

1. Open the deployed Slate URL. Run: *"who connects these chain-snatching cases?"*,
   *"where are the hotspots?"*, *"trace the money trail"*, *"find similar cases"*.
   Confirm the network graph, **city map**, and **"view query & reasoning"** work.
2. Fill **deck slide 13** with the three public links:
   - GitHub repo (public)
   - Demo video (unlisted YouTube or public Google Drive) — see `deck/demo_script.md`
   - Deployed Slate URL
3. Fill **deck slide 1** (team name, leader, size).
4. Export the deck to PDF (`deck/TRINETRA_Submission.pdf`, < 5 MB ✓).
5. Submit on HackerEarth: paste the brief (`deck/prototype_brief.txt`), the three
   links, and upload the PDF deck.

---

## Troubleshooting
- **Function 500 / Data Store empty** → confirm CSVs imported in FK order and
  `CATALYST_MODE=true` is set; until then it serves mock answers.
- **ZCQL row limits** → ZCQL caps rows per query; the analysis layer fetches
  tables with `LIMIT 2000`. For larger data, paginate or push aggregation into
  ZCQL `GROUP BY`.
- **Map blank** → MapLibre needs WebGL (fine in real browsers; only headless
  screenshotting needs SwiftShader flags).
- **Agent skills** → Zoho ships Catalyst agent-skills (GitHub) for Claude
  Code / Cursor that speed up CLI setup — worth using.
