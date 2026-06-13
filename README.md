# TRINETRA — Crime Intelligence Console (frontend shell)

> *The third eye that sees the hidden links between crimes, criminals, and money.*

Agentic crime-intelligence platform for **KSP Datathon 2026 — Problem Statement 1**
(Intelligent Conversational AI for the KSP Crime Database). This package is the
**Palantir Gotham–style frontend shell**: a dark, dense, command-bar-driven
console with a force-directed criminal-network graph, hotspot map, an inspector
with offender risk scoring, and a cited agent log.

It runs **standalone on mock data** — no backend required yet. The real Catalyst
backend just has to return the same `{ nodes, links }` and agent-turn shapes.

## Features (all live, no backend)

- **Live agent** — the command bar answers via local intent matching (`lib/agent.ts`), switches views, and focuses the graph. Click the sample-query chips to demo.
- **Voice** — real browser STT + TTS (`lib/voice.ts`) with an EN / ಕನ್ನಡ toggle. Maps to Catalyst Zia in production.
- **PDF export** — client-side conversation export (`lib/exportPdf.ts`); satisfies PS1's "save conversation history in PDF locally".
- **Network graph** — force-directed, with neighbor highlighting, type-filter legend, and zoom-to-fit.
- **Hotspot map** — interactive spatiotemporal view with a time-of-day slider (night / evening presets).
- **Profiles** — sortable offender table (risk / priors / jurisdictions).
- **Timeline** — chronological FIR view showing the chain-snatching escalation.
- **Alerts** — early-warning feed (spikes, forming networks, repeat offenders).
- **Explainable risk** — inspector shows the risk-factor breakdown bars + clickable connected entities.

## Run it

```bash
cd trinetra
npm install
npm run dev      # http://localhost:3000
```

## What's here

| Area | File |
|------|------|
| Console layout / state | `app/page.tsx` |
| Command bar (NL + voice + lang + role) | `components/CommandBar.tsx` |
| Left nav rail | `components/IconRail.tsx` |
| Network graph (highlight/legend/fit) | `components/NetworkGraph.tsx` |
| Spatiotemporal hotspot map | `components/MapPanel.tsx` |
| Offender profiles table | `components/ProfilesView.tsx` |
| Case timeline | `components/TimelineView.tsx` |
| Early-warning feed | `components/AlertsView.tsx` |
| Inspector (risk bars + connections) | `components/Inspector.tsx` |
| Agent log (chips, speak, export) | `components/AgentLog.tsx` |
| Local agent engine | `lib/agent.ts` |
| Voice (STT/TTS) | `lib/voice.ts` |
| PDF export | `lib/exportPdf.ts` |
| View ids / rail config | `lib/views.ts` |
| Mock dataset (planted ring) | `lib/mockData.ts` |
| Palantir palette | `tailwind.config.ts` |

## Aesthetic

Dark slate (`#0a0e14`), monospace data labels, and accent colors that **encode
meaning**: FIRs cyan-blue, money amber, offenders red with a pulse ring; hidden
links (shared phone / money) are dashed red. Color is information, not decoration.

## Backend (built — see `data/` and `functions/`)

- **`data/`** — Catalyst Data Store schema + synthetic-data generator (planted
  crime rings). `python3 data/generate_synthetic.py`.
- **`functions/agent/`** — NL→ZCQL agent function: intent → generated+validated
  ZCQL → grounded, cited answer. Runs mock (CSV) or catalyst (Qwen + Data Store).
- **`functions/network/`** — builds the `{ nodes, links }` ego-network from the
  edge tables (the "no graph DB" workaround).
- Smoke-test both: `node functions/test-local.js`.

### Wiring it together
1. Set `NEXT_PUBLIC_AGENT_URL` → the deployed agent function; the command bar
   then answers from the live backend (falls back to local when unset).
2. Point `lib/mockData.ts` at the `network` function for live graphs.
3. **Command bar mic → Zia STT/TTS** for Kannada/English voice (browser Web
   Speech is the local stand-in, already working).
4. **`MapPanel` → MapLibre GL** (dark style) + Karnataka district GeoJSON.
5. **Deploy** front-end to Catalyst Slate, functions via `catalyst deploy`.

## Stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
`react-force-graph-2d` · `lucide-react`.
