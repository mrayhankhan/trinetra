"use strict";

// Agent core: natural language -> intent -> ZCQL (generated + validated) ->
// grounded, cited answer. Execution goes through the DataStore analysis layer
// so mock and Catalyst modes return identical answers.

const { DataStore } = require("./datastore");
const { buildZcql, validateZcql } = require("./zcql");

// Schema context handed to Qwen (QuickML LLM-Serving) when generating ZCQL.
const SCHEMA_PROMPT = `You translate a police investigator's question into a single read-only ZCQL SELECT over this KSP crime schema. Tables: stations, officers, persons(person_id, full_name, age, gender, district, socioeconomic_band, education, occupation), firs(fir_id, fir_number, crime_type, ipc_sections, station_id, district, occurred_at, hour_of_day, status, modus_operandi), case_persons(fir_id, person_id, role), phones, accounts(account_id, suspected_mule), person_phones(person_id, phone_id), fir_phones(fir_id, phone_id), transactions(from_account, to_account, amount, linked_fir_id), offender_profiles(person_id, risk_score, linked_fir_count, jurisdictions_count, mo_primary). Return ONLY the ZCQL, no prose. Never write to the database.`;

function detectCrimeType(q) {
  if (/snatch|chain/i.test(q)) return "Chain snatching";
  if (/vehicle|bike|car|two.?wheeler|theft of vehicle/i.test(q)) return "Vehicle theft";
  if (/fraud|otp|cyber|online|upi|scam/i.test(q)) return "Online fraud";
  if (/mobile|phone theft/i.test(q)) return "Mobile theft";
  return null;
}

function detectIntent(q) {
  if (/(similar|look.?alike|comparable|related cases|leads|same mo|like this)/i.test(q)) return "similar";
  if (/(money|account|financ|transaction|mule|trail|fund)/i.test(q)) return "money_trail";
  if (/(connect|link|network|ring|associat|gang|organis|organiz|who.*behind)/i.test(q)) return "ring_by_phone";
  if (/(socio|demograph|economic|education|background|social)/i.test(q)) return "crime_by_socio";
  if (/(timeline|history|when|sequence|chronolog|over time|escalat)/i.test(q)) return "timeline";
  if (/(forecast|predict|early warning|emerg|future|next week|risk area)/i.test(q)) return "forecast";
  if (/(hotspot|where|map|cluster|location|district|area|geograph)/i.test(q)) return "hotspots";
  if (/(repeat|habitual|offender|risk|profil|score|suspect|top)/i.test(q)) return "top_offenders";
  return "fallback";
}

// Optional: ask Qwen via QuickML LLM-Serving to produce the ZCQL string shown
// to the user. Execution still goes through the validated analysis layer.
async function llmGenerateZcql(question) {
  const url = process.env.QUICKML_LLM_URL;
  const token = process.env.QUICKML_OAUTH_TOKEN;
  if (!url || typeof fetch !== "function") return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Zoho-oauthtoken ${token}` } : {}),
      },
      body: JSON.stringify({
        instructions: SCHEMA_PROMPT,
        prompt: question,
        temperature: 0.1,
        max_tokens: 300,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.output || data.text || data.response || "";
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}

function fmtList(a) {
  return a.join(", ");
}

async function answerQuery(question, opts = {}) {
  const q = (question || "").trim();
  const ds = new DataStore(opts);
  if (!q) {
    return { answer: "Ask about offenders, networks, hotspots, money trails, timelines, or socio-demographics.", mode: ds.mode };
  }

  const intent = detectIntent(q);
  const crimeType = detectCrimeType(q);
  let zcql = null;
  let view, focusNodeId, answer, sources, rows;

  switch (intent) {
    case "ring_by_phone": {
      zcql = buildZcql("ring_by_phone", { crimeType });
      const r = await ds.ringByPhone(crimeType);
      view = "network";
      if (r) {
        focusNodeId = /suresh/i.test(r.name) ? "off-suresh" : undefined;
        answer = `${r.name} connects ${r.cases} ${crimeType ? crimeType.toLowerCase() + " " : ""}FIRs across ${r.districts.length} district(s) via shared phone ${r.phone} — consistent with an organised ring.`;
        sources = r.firNumbers.map((n) => `FIR ${n}`);
        rows = [r];
      } else {
        answer = "No shared-phone network found for that query.";
      }
      break;
    }
    case "similar": {
      const m = q.match(/\b(\d{3,5})\b/);
      const refNo = m ? m[1] : null;
      const r = await ds.similarCases(refNo);
      view = "timeline";
      focusNodeId = "off-suresh";
      zcql = `SELECT f2.fir_number, f2.district, f2.occurred_at\nFROM firs f1 JOIN firs f2 ON f2.crime_type = f1.crime_type\nWHERE f1.fir_number = '${refNo || (r.ref && r.ref.fir_number) || "2291"}' AND f2.fir_id <> f1.fir_id\nORDER BY f2.occurred_at DESC LIMIT 10`;
      if (r.ref) {
        answer = `${r.rows.length} cases match FIR ${r.ref.fir_number}'s profile (${r.ref.crime_type}): ${r.rows.slice(0, 4).map((x) => "FIR " + x.fir_number).join(", ")} — shared MO, strong investigative leads.`;
        sources = r.rows.slice(0, 4).map((x) => "FIR " + x.fir_number);
        rows = r.rows;
      } else {
        answer = "No similar cases found.";
      }
      break;
    }
    case "money_trail": {
      zcql = buildZcql("money_trail");
      const r = await ds.moneyTrail();
      view = "network";
      focusNodeId = "acc-7741";
      if (r) {
        answer = `Suspected mule account ${r.account} received ${r.count} transaction(s) totalling ₹${r.amount.toLocaleString("en-IN")}, linked to FIRs ${fmtList(r.firNumbers)} — a money trail across the cluster.`;
        sources = [`A/C ${r.account}`, ...r.firNumbers.map((n) => `FIR ${n}`)];
        rows = [r];
      } else {
        answer = "No suspicious money trail detected.";
      }
      break;
    }
    case "top_offenders": {
      zcql = buildZcql("top_offenders");
      const t = await ds.topOffenders(5);
      view = "profiles";
      focusNodeId = /suresh/i.test(t[0]?.name || "") ? "off-suresh" : undefined;
      answer = `Top repeat offenders by risk: ${t.map((o) => `${o.name} (${o.risk})`).join(", ")}. ${t[0].name} scores highest, tied to ${t[0].firs} FIRs across ${t[0].districts} districts (MO: ${t[0].mo}).`;
      sources = t.map((o) => o.name);
      rows = t;
      break;
    }
    case "hotspots":
    case "forecast": {
      const ct = crimeType || "Chain snatching";
      zcql = buildZcql("hotspots", { crimeType: ct });
      const h = await ds.hotspots(ct);
      view = intent === "forecast" ? "alerts" : "map";
      const top = h.districts.map((d) => `${d.district} (${d.count})`).join(", ");
      const window = `${String(h.hourLo).padStart(2, "0")}:00–${String(h.hourHi).padStart(2, "0")}:00`;
      answer = intent === "forecast"
        ? `Early-warning: ${ct.toLowerCase()} concentrated in ${top}, peaking ${window}. Recommend patrol in the top district during that window this week.`
        : `${ct} clusters in ${top}, peaking ${window} across ${h.total} FIRs.`;
      sources = h.districts.map((d) => d.district);
      rows = h.districts;
      break;
    }
    case "timeline": {
      const nameMatch = q.match(/(?:offender|for|of)\s+([A-Z][a-z]+(?:\s+[A-Z]\.?)?)/);
      zcql = buildZcql("timeline", { name: nameMatch ? nameMatch[1] : null });
      const t = await ds.timelineByOffender(nameMatch ? nameMatch[1] : null);
      view = "timeline";
      focusNodeId = /suresh/i.test(t.name) ? "off-suresh" : undefined;
      answer = `${t.name}: ${t.rows.length} linked FIRs from ${t.rows[0]?.occurred_at?.slice(0, 10)} to ${t.rows[t.rows.length - 1]?.occurred_at?.slice(0, 10)}, same MO recurring — a clear repeat pattern.`;
      sources = t.rows.map((r) => `FIR ${r.fir_number}`);
      rows = t.rows;
      break;
    }
    case "crime_by_socio": {
      zcql = buildZcql("crime_by_socio");
      const s = await ds.crimeBySocio();
      view = "profiles";
      answer = `Strongest socio-economic correlations: ${s.slice(0, 3).map((x) => `${x.crime} ↔ ${x.band} (${x.n})`).join(", ")}.`;
      sources = s.slice(0, 3).map((x) => x.band);
      rows = s;
      break;
    }
    default:
      answer = "I can answer over the crime database — try “who connects these chain-snatching cases?”, “show repeat offenders”, “where are the hotspots?”, or “trace the money trail”.";
  }

  // In Catalyst mode, prefer the LLM-generated ZCQL for display if available
  // and it passes the safety gate.
  if (ds.mode === "catalyst" && zcql) {
    const llm = await llmGenerateZcql(q);
    if (llm && validateZcql(llm).ok) zcql = llm;
  }

  const guard = zcql ? validateZcql(zcql) : { ok: true };
  return {
    answer,
    zcql: guard.ok ? zcql : null,
    zcqlBlocked: guard.ok ? undefined : guard.reason,
    sources,
    rows,
    view,
    focusNodeId,
    mode: ds.mode,
  };
}

module.exports = { answerQuery, SCHEMA_PROMPT };
