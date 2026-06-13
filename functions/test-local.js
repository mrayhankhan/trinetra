"use strict";

// Local smoke test — runs the agent + network functions in mock mode against
// the generated CSVs (data/out). No Catalyst creds needed.
//   node functions/test-local.js

const { answerQuery } = require("./agent/handler");
const { validateZcql } = require("./agent/zcql");
const { DataStore } = require("./agent/datastore");
const { buildGraph } = require("./network/graph");

const QUERIES = [
  "Who connects these chain-snatching cases in Bengaluru South?",
  "Show repeat offenders by risk",
  "Where are the chain-snatching hotspots and at what time?",
  "Trace the money trail",
  "Show the case timeline for the top offender",
  "Find similar cases to FIR 2291",
  "How does crime correlate with socio-economic background?",
  "Forecast next week's high-risk areas",
];

const SECURITY = [
  "SELECT * FROM firs WHERE crime_type = 'Chain snatching'",
  "DROP TABLE firs",
  "SELECT * FROM firs; DELETE FROM persons",
  "SELECT * FROM secret_table",
  "UPDATE persons SET age = 0",
];

async function main() {
  console.log("=== AGENT (mock mode) ===\n");
  for (const q of QUERIES) {
    const r = await answerQuery(q, { mode: "mock" });
    console.log("Q:", q);
    console.log("A:", r.answer);
    console.log("   view:", r.view, "| sources:", (r.sources || []).slice(0, 4).join(", "));
    if (r.zcql) console.log("   ZCQL:", r.zcql.replace(/\s+/g, " ").slice(0, 90) + "…");
    console.log();
  }

  console.log("=== ZCQL SAFETY GATE ===\n");
  for (const sql of SECURITY) {
    const v = validateZcql(sql);
    console.log((v.ok ? "ALLOW " : "BLOCK ") + (v.reason ? `(${v.reason}) ` : "") + sql);
  }

  console.log("\n=== NETWORK BUILD (mock mode) ===\n");
  const ds = new DataStore({ mode: "mock" });
  const g = await buildGraph(ds);
  const types = g.nodes.reduce((m, n) => ((m[n.type] = (m[n.type] || 0) + 1), m), {});
  console.log("center:", g.centerId);
  console.log("nodes:", g.nodes.length, JSON.stringify(types));
  console.log("links:", g.links.length);
  const offender = g.nodes.find((n) => n.type === "offender");
  console.log("sample offender node:", JSON.stringify(offender));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
