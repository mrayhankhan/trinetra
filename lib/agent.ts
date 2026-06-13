// Local agent engine — intent matching over the mock dataset so the command
// bar answers live with zero backend. When the Catalyst NL→ZCQL Function is
// wired, replace `runQuery` with a fetch to that endpoint; the return shape
// (answer + sources + view + focus + zcql + reasoning) is the contract the UI
// already consumes.

import { offenders, firEvents } from "./mockData";
import type { ViewId } from "./views";

export interface AgentResult {
  answer: string;
  sources?: string[];
  view?: ViewId;
  focusNodeId?: string;
  zcql?: string; // the generated query (explainability)
  reasoning?: string[]; // step-by-step trace
}

type Intent = {
  test: RegExp;
  run: () => AgentResult;
};

const topOffenders = () =>
  [...offenders].sort((a, b) => b.risk - a.risk).slice(0, 3);

const intents: Intent[] = [
  {
    // money trail / financial — checked before network so "account" routes here
    test: /(money|account|financ|transaction|mule|trail|fund)/i,
    run: () => ({
      answer:
        "Account ··7741 (suspected mule) connects FIR 2455 to offender Suresh M., who is already tied to FIR 2291/2310/2402 — a money trail spanning the chain-snatching cluster.",
      sources: ["A/C ··7741", "FIR 2455", "FIR 2291"],
      view: "network",
      focusNodeId: "acc-7741",
      zcql:
        "SELECT t.to_account, COUNT(*) AS txns, SUM(t.amount) AS total\nFROM transactions t JOIN accounts a ON a.account_id = t.to_account\nWHERE a.suspected_mule = true\nGROUP BY t.to_account ORDER BY txns DESC LIMIT 5",
      reasoning: [
        "Detected intent: money-trail analysis",
        "Filtered transactions to suspected-mule accounts",
        "Joined accounts → FIRs → accused to find the owner",
        "Account ··7741 links FIR 2455 to Suresh M.'s existing cluster",
      ],
    }),
  },
  {
    // similar past cases / investigative leads
    test: /(similar|look.?alike|comparable|related cases|leads|same mo|like this)/i,
    run: () => {
      const ref = firEvents.find((e) => e.id === "2291")!;
      const similar = firEvents.filter(
        (e) => e.type === ref.type && e.id !== ref.id
      );
      return {
        answer:
          `4 cases match FIR 2291's profile (${ref.type}, evening, south Bengaluru): ${similar
            .slice(0, 4)
            .map((e) => "FIR " + e.id)
            .join(", ")}. Shared MO and overlapping offender — strong investigative leads.`,
        sources: similar.slice(0, 4).map((e) => "FIR " + e.id),
        view: "timeline",
        focusNodeId: "off-suresh",
        zcql:
          "SELECT f2.fir_number, f2.district, f2.occurred_at\nFROM firs f1 JOIN firs f2 ON f2.crime_type = f1.crime_type\nWHERE f1.fir_id = 'F2291' AND f2.fir_id <> f1.fir_id\nORDER BY f2.occurred_at DESC LIMIT 10",
        reasoning: [
          "Detected intent: similar-case retrieval",
          "Reference case FIR 2291 — MO: 2-wheeler chain snatch",
          "Matched by crime type, time-window and locality",
          "Ranked candidates; surfaced top look-alikes as leads",
        ],
      };
    },
  },
  {
    // organised ring / who connects these cases
    test: /(connect|link|network|ring|associat|gang|organis|organiz)/i,
    run: () => ({
      answer:
        "4 of 6 chain-snatching FIRs in Bengaluru South link to one offender (Suresh M.) via a shared phone (··4021) and account ··7741 — consistent with an organised ring across 3 stations.",
      sources: ["FIR 2291", "2310", "2402", "2455"],
      view: "network",
      focusNodeId: "off-suresh",
      zcql:
        "SELECT p.full_name, ph.phone_id, COUNT(DISTINCT fp.fir_id) AS cases\nFROM case_persons cp JOIN persons p ON cp.person_id = p.person_id\nJOIN person_phones pp ON pp.person_id = p.person_id\nJOIN fir_phones fp ON fp.phone_id = pp.phone_id\nWHERE cp.role = 'accused'\nGROUP BY p.full_name, ph.phone_id ORDER BY cases DESC LIMIT 5",
      reasoning: [
        "Detected intent: criminal-network / link analysis",
        "Traversed accused → phone → FIR edges in the Data Store",
        "Found one phone shared across 4 chain-snatching FIRs",
        "Resolved owner Suresh M.; flagged organised ring",
      ],
    }),
  },
  {
    // forecasting / predict / early warning — before hotspots ("risk area")
    test: /(forecast|predict|early warning|emerg|future|next week|risk area)/i,
    run: () => ({
      answer:
        "Forecast: chain-snatching in BLR South projected to rise ~180% next 7 days (5 incidents), peaking 20:00–22:00. Recommend evening patrol in BLR South & Jayanagar.",
      sources: ["BLR South", "Jayanagar", "Whitefield"],
      view: "alerts",
      zcql:
        "SELECT district, crime_type, COUNT(*) AS recent\nFROM firs WHERE occurred_at > '2026-05-01'\nGROUP BY district, crime_type ORDER BY recent DESC",
      reasoning: [
        "Detected intent: crime forecasting / early warning",
        "Computed trailing-window incidence per district & crime type",
        "Projected next-period counts; compared to baseline average",
        "Surfaced rising hotspots as proactive patrol recommendations",
      ],
    }),
  },
  {
    // repeat / habitual offenders, risk scores
    test: /(repeat|habitual|offender|risk|profil|score|suspect|top)/i,
    run: () => {
      const t = topOffenders();
      return {
        answer:
          `Top repeat offenders by risk: ` +
          t.map((o) => `${o.name} (${o.risk})`).join(", ") +
          `. ${t[0].name} scores highest on network centrality and MO consistency.`,
        sources: t.map((o) => o.name),
        view: "profiles",
        focusNodeId: t[0].id,
        zcql:
          "SELECT p.full_name, op.risk_score, op.linked_fir_count, op.mo_primary\nFROM offender_profiles op JOIN persons p ON op.person_id = p.person_id\nORDER BY op.risk_score DESC LIMIT 10",
        reasoning: [
          "Detected intent: offender risk profiling",
          "Read offender_profiles (weighted, explainable scores)",
          "Sorted by composite risk score",
          "Top: Suresh M. — high centrality + MO consistency",
        ],
      };
    },
  },
  {
    // timeline / case history / when
    test: /(timeline|history|when|sequence|chronolog|over time|trend|escalat)/i,
    run: () => ({
      answer:
        `Across ${firEvents.length} FIRs (Jan–Jun 2026), chain-snatching escalates Feb→May with the same MO and offender — a clear repeat pattern rather than isolated incidents.`,
      sources: ["FIR 2291", "2310", "2402", "2455"],
      view: "timeline",
      zcql:
        "SELECT f.fir_number, f.crime_type, f.district, f.occurred_at, f.status\nFROM case_persons cp JOIN firs f ON cp.fir_id = f.fir_id\nWHERE cp.role = 'accused' ORDER BY f.occurred_at ASC",
      reasoning: [
        "Detected intent: case timeline",
        "Ordered an offender's FIRs chronologically",
        "Compared MO across incidents — same signature",
        "Concluded escalating repeat pattern",
      ],
    }),
  },
  {
    // hotspots / where / clusters / map
    test: /(hotspot|where|map|cluster|location|district|area|geograph)/i,
    run: () => ({
      answer:
        "Chain-snatching clusters in BLR South (evening, 20:00–22:00); vehicle theft clusters in Whitefield / KR Puram (late night, 01:00–04:00). BLR South is +180% vs its 6-month average.",
      sources: ["BLR South", "Whitefield", "KR Puram"],
      view: "map",
      zcql:
        "SELECT district, hour_of_day, COUNT(*) AS incidents\nFROM firs WHERE crime_type = 'Chain snatching'\nGROUP BY district, hour_of_day ORDER BY incidents DESC",
      reasoning: [
        "Detected intent: spatiotemporal hotspots",
        "Grouped FIRs by district × hour-of-day",
        "Identified evening cluster in BLR South",
        "Compared to historical average (+180%)",
      ],
    }),
  },
];

export function runQuery(text: string): AgentResult {
  const q = text.trim();
  if (!q) {
    return { answer: "Ask about offenders, networks, hotspots, money trails, timelines, or alerts." };
  }
  for (const i of intents) {
    if (i.test.test(q)) return i.run();
  }
  return {
    answer:
      "I can answer over the crime database — try “who connects these chain-snatching cases?”, “show repeat offenders”, “where are the hotspots?”, “find similar cases”, or “forecast next week’s hotspots”. (Live demo runs on synthetic data; the Catalyst NL→ZCQL agent grounds answers in the real Data Store.)",
  };
}

export const SAMPLE_QUERIES = [
  "Who connects these chain-snatching cases?",
  "Show repeat offenders by risk",
  "Where are the crime hotspots?",
  "Find similar cases to FIR 2291",
  "Forecast next week's hotspots",
  "Trace the money trail",
];

// Calls the deployed Catalyst agent function when NEXT_PUBLIC_AGENT_URL is set;
// otherwise resolves with the local engine. Same return shape either way, so
// the UI doesn't care which backend answered.
export async function askAgent(text: string): Promise<AgentResult> {
  const url = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!url) return runQuery(text);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
    });
    if (!res.ok) return runQuery(text);
    const data = await res.json();
    return {
      answer: data.answer,
      sources: data.sources,
      view: data.view,
      focusNodeId: data.focusNodeId,
      zcql: data.zcql,
      reasoning: data.reasoning,
    };
  } catch {
    return runQuery(text);
  }
}
