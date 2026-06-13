"use strict";

// ZCQL generation + safety. The agent surfaces the generated query to the user
// (explainable AI / evidence trail). validateZcql is the security gate: only
// read-only SELECTs against whitelisted tables ever reach the Data Store.

const TABLES = new Set([
  "stations", "officers", "persons", "firs", "case_persons", "phones",
  "accounts", "person_phones", "fir_phones", "transactions", "offender_profiles",
]);

const FORBIDDEN = /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE|EXEC)\b/i;

// Canonical ZCQL for each intent (mirrors data/demo_queries.md).
const TEMPLATES = {
  ring_by_phone: (p) => `SELECT p.full_name, ph.phone_id, COUNT(DISTINCT fp.fir_id) AS cases
FROM case_persons cp
JOIN persons p ON cp.person_id = p.person_id
JOIN person_phones pp ON pp.person_id = p.person_id
JOIN fir_phones fp ON fp.phone_id = pp.phone_id
WHERE cp.role = 'accused'${p.crimeType ? ` AND fp.fir_id IN (SELECT fir_id FROM firs WHERE crime_type = '${p.crimeType}')` : ""}
GROUP BY p.full_name, ph.phone_id
ORDER BY cases DESC LIMIT 5`,

  top_offenders: () => `SELECT p.full_name, op.risk_score, op.linked_fir_count,
       op.jurisdictions_count, op.mo_primary
FROM offender_profiles op
JOIN persons p ON op.person_id = p.person_id
ORDER BY op.risk_score DESC LIMIT 10`,

  hotspots: (p) => `SELECT district, hour_of_day, COUNT(*) AS incidents
FROM firs${p.crimeType ? `\nWHERE crime_type = '${p.crimeType}'` : ""}
GROUP BY district, hour_of_day
ORDER BY incidents DESC`,

  money_trail: () => `SELECT t.to_account, COUNT(*) AS txns, SUM(t.amount) AS total
FROM transactions t
JOIN accounts a ON a.account_id = t.to_account
WHERE a.suspected_mule = true
GROUP BY t.to_account
ORDER BY txns DESC LIMIT 5`,

  timeline: (p) => `SELECT f.fir_number, f.crime_type, f.district, f.occurred_at, f.status
FROM case_persons cp
JOIN firs f ON cp.fir_id = f.fir_id
JOIN persons p ON cp.person_id = p.person_id
WHERE cp.role = 'accused'${p.name ? ` AND p.full_name = '${p.name}'` : ""}
ORDER BY f.occurred_at ASC`,

  crime_by_socio: () => `SELECT p.socioeconomic_band, f.crime_type, COUNT(*) AS n
FROM case_persons cp
JOIN persons p ON cp.person_id = p.person_id
JOIN firs f ON cp.fir_id = f.fir_id
WHERE cp.role = 'accused'
GROUP BY p.socioeconomic_band, f.crime_type
ORDER BY n DESC`,
};

function buildZcql(intent, params = {}) {
  const t = TEMPLATES[intent];
  return t ? t(params) : null;
}

// Security gate: single read-only statement over known tables.
function validateZcql(sql) {
  if (!sql || typeof sql !== "string") return { ok: false, reason: "empty" };
  const trimmed = sql.trim().replace(/;+\s*$/, "");
  if (/;/.test(trimmed)) return { ok: false, reason: "multiple statements" };
  if (!/^select\b/i.test(trimmed)) return { ok: false, reason: "not a SELECT" };
  if (FORBIDDEN.test(trimmed)) return { ok: false, reason: "forbidden keyword" };
  // every FROM/JOIN target must be a known table
  const refs = [...trimmed.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase());
  for (const r of refs) {
    if (!TABLES.has(r)) return { ok: false, reason: `unknown table: ${r}` };
  }
  return { ok: true };
}

module.exports = { buildZcql, validateZcql, TABLES };
