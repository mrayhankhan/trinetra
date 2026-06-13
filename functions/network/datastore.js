"use strict";

// Data access for the agent. Two modes, one analysis layer:
//   - mock:     reads the generated CSVs (works with no Catalyst creds)
//   - catalyst: fetches tables via ZCQL through the Catalyst SDK
// All joins/aggregations run in JS on top of getTable(), so both modes produce
// identical answers. The human-readable ZCQL the agent *generates* lives in
// zcql.js and is returned for explainability.

const { loadTable } = require("./csv");

const num = (v) => (v === undefined || v === "" ? 0 : Number(v));

class DataStore {
  constructor(opts = {}) {
    this.mode = opts.mode === "catalyst" ? "catalyst" : "mock";
    this.app = opts.app || null; // zcatalyst-sdk-node app instance
    this.dir = opts.dir || null;
  }

  async getTable(name) {
    if (this.mode === "catalyst") {
      const sql = `SELECT * FROM ${name} LIMIT 2000`;
      const res = await this.app.zcql().executeZCQLQuery(sql);
      return res.map((r) => r[name]);
    }
    return loadTable(name, this.dir);
  }

  // --- shared loads (cached per instance) ---
  async _load() {
    if (this._cache) return this._cache;
    const [persons, firs, casePersons, personPhones, firPhones, profiles, txns, accounts] =
      await Promise.all([
        this.getTable("persons"),
        this.getTable("firs"),
        this.getTable("case_persons"),
        this.getTable("person_phones"),
        this.getTable("fir_phones"),
        this.getTable("offender_profiles"),
        this.getTable("transactions"),
        this.getTable("accounts"),
      ]);
    const firById = new Map(firs.map((f) => [f.fir_id, f]));
    const personById = new Map(persons.map((p) => [p.person_id, p]));
    this._cache = {
      persons, firs, casePersons, personPhones, firPhones, profiles, txns,
      accounts, firById, personById,
    };
    return this._cache;
  }

  // "Who connects these <crime> cases?" — offenders sharing a phone across FIRs.
  async ringByPhone(crimeType) {
    const d = await this._load();
    const byPhonePerson = new Map(); // person_id -> Set(phone_id)
    for (const pp of d.personPhones) {
      if (!byPhonePerson.has(pp.person_id)) byPhonePerson.set(pp.person_id, new Set());
      byPhonePerson.get(pp.person_id).add(pp.phone_id);
    }
    const firsByPhone = new Map(); // phone_id -> Set(fir_id)
    for (const fp of d.firPhones) {
      if (!firsByPhone.has(fp.phone_id)) firsByPhone.set(fp.phone_id, new Set());
      firsByPhone.get(fp.phone_id).add(fp.fir_id);
    }
    let best = null;
    for (const [pid, phones] of byPhonePerson) {
      for (const ph of phones) {
        const firIds = [...(firsByPhone.get(ph) || [])];
        const matched = firIds
          .map((id) => d.firById.get(id))
          .filter((f) => f && (!crimeType || f.crime_type === crimeType));
        if (matched.length === 0) continue;
        const districts = new Set(matched.map((f) => f.district));
        if (!best || matched.length > best.cases) {
          best = {
            person_id: pid,
            name: (d.personById.get(pid) || {}).full_name || pid,
            phone: ph,
            cases: matched.length,
            districts: [...districts],
            firNumbers: matched.map((f) => f.fir_number).sort(),
          };
        }
      }
    }
    return best;
  }

  async topOffenders(n = 5) {
    const d = await this._load();
    return d.profiles
      .map((o) => ({
        person_id: o.person_id,
        name: (d.personById.get(o.person_id) || {}).full_name || o.person_id,
        risk: num(o.risk_score),
        firs: num(o.linked_fir_count),
        districts: num(o.jurisdictions_count),
        mo: o.mo_primary,
      }))
      .sort((a, b) => b.risk - a.risk)
      .slice(0, n);
  }

  async hotspots(crimeType) {
    const d = await this._load();
    const matched = d.firs.filter((f) => !crimeType || f.crime_type === crimeType);
    const byDistrict = new Map();
    const byHour = new Map();
    for (const f of matched) {
      byDistrict.set(f.district, (byDistrict.get(f.district) || 0) + 1);
      const h = num(f.hour_of_day);
      byHour.set(h, (byHour.get(h) || 0) + 1);
    }
    const districts = [...byDistrict.entries()]
      .map(([district, count]) => ({ district, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    const hours = [...byHour.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([h]) => h).sort((a, b) => a - b);
    return { total: matched.length, districts, hourLo: hours[0], hourHi: hours[hours.length - 1] };
  }

  async moneyTrail() {
    const d = await this._load();
    const mule = new Set(
      d.accounts.filter((a) => String(a.suspected_mule).toLowerCase() === "true")
        .map((a) => a.account_id)
    );
    const byAcc = new Map();
    for (const t of d.txns) {
      if (!mule.has(t.to_account)) continue;
      if (!byAcc.has(t.to_account)) byAcc.set(t.to_account, { count: 0, amount: 0, firs: new Set() });
      const e = byAcc.get(t.to_account);
      e.count++;
      e.amount += num(t.amount);
      if (t.linked_fir_id) e.firs.add(t.linked_fir_id);
    }
    let best = null;
    for (const [acc, e] of byAcc) {
      if (!best || e.count > best.count) {
        const accRow = d.accounts.find((a) => a.account_id === acc) || {};
        best = {
          account: accRow.number_masked || acc,
          count: e.count,
          amount: Math.round(e.amount),
          firNumbers: [...e.firs].map((id) => (d.firById.get(id) || {}).fir_number).filter(Boolean),
        };
      }
    }
    return best;
  }

  async timelineByOffender(name) {
    const d = await this._load();
    let pid;
    if (name) {
      const p = d.persons.find((x) => x.full_name.toLowerCase() === name.toLowerCase());
      pid = p && p.person_id;
    }
    if (!pid) {
      const top = await this.topOffenders(1);
      pid = top[0] && top[0].person_id;
    }
    const firIds = d.casePersons
      .filter((c) => c.person_id === pid && c.role === "accused")
      .map((c) => c.fir_id);
    const rows = firIds
      .map((id) => d.firById.get(id))
      .filter(Boolean)
      .map((f) => ({
        fir_number: f.fir_number, crime_type: f.crime_type,
        district: f.district, occurred_at: f.occurred_at, status: f.status,
      }))
      .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
    return { name: (d.personById.get(pid) || {}).full_name || pid, rows };
  }

  async similarCases(refFirNumber) {
    const d = await this._load();
    const ref =
      d.firs.find((f) => f.fir_number === String(refFirNumber || "")) ||
      d.firs.find((f) => f.crime_type === "Chain snatching") ||
      d.firs[0];
    if (!ref) return { ref: null, rows: [] };
    const rows = d.firs
      .filter((f) => f.crime_type === ref.crime_type && f.fir_number !== ref.fir_number)
      .slice(0, 8)
      .map((f) => ({ fir_number: f.fir_number, district: f.district, date: (f.occurred_at || "").slice(0, 10) }));
    return { ref: { fir_number: ref.fir_number, crime_type: ref.crime_type, district: ref.district }, rows };
  }

  async crimeBySocio() {
    const d = await this._load();
    const accusedFirs = d.casePersons.filter((c) => c.role === "accused");
    const tally = new Map();
    for (const c of accusedFirs) {
      const p = d.personById.get(c.person_id);
      const f = d.firById.get(c.fir_id);
      if (!p || !f) continue;
      const key = `${p.socioeconomic_band}|${f.crime_type}`;
      tally.set(key, (tally.get(key) || 0) + 1);
    }
    return [...tally.entries()]
      .map(([k, n]) => {
        const [band, crime] = k.split("|");
        return { band, crime, n };
      })
      .sort((a, b) => b.n - a.n)
      .slice(0, 6);
  }
}

module.exports = { DataStore };
