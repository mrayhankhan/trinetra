"use strict";

// Builds the { nodes, links } ego-network around an offender from the Data Store
// edge tables — the exact shape the frontend NetworkGraph consumes. This is the
// "no graph DB" workaround: relational edge tables joined into a graph in code.

const num = (v) => (v === undefined || v === "" ? 0 : Number(v));

async function buildGraph(ds, centerName) {
  const [persons, firs, casePersons, personPhones, firPhones, accounts, txns, profiles] =
    await Promise.all([
      ds.getTable("persons"), ds.getTable("firs"), ds.getTable("case_persons"),
      ds.getTable("person_phones"), ds.getTable("fir_phones"),
      ds.getTable("accounts"), ds.getTable("transactions"),
      ds.getTable("offender_profiles"),
    ]);

  const personById = new Map(persons.map((p) => [p.person_id, p]));
  const firById = new Map(firs.map((f) => [f.fir_id, f]));
  const profileById = new Map(profiles.map((o) => [o.person_id, o]));

  // pick the center offender
  let centerId;
  if (centerName) {
    const p = persons.find((x) => x.full_name.toLowerCase() === centerName.toLowerCase());
    centerId = p && p.person_id;
  }
  if (!centerId) {
    const top = [...profiles].sort((a, b) => num(b.risk_score) - num(a.risk_score))[0];
    centerId = top && top.person_id;
  }
  if (!centerId) return { nodes: [], links: [], centerId: null };

  const nodes = new Map();
  const links = [];
  const addNode = (id, n) => { if (!nodes.has(id)) nodes.set(id, { id, ...n }); };
  const addLink = (s, t, kind) => links.push({ source: s, target: t, kind });

  const centerPerson = personById.get(centerId) || { full_name: centerId };
  const centerProfile = profileById.get(centerId);
  const centerNodeId = "off-" + centerId;
  addNode(centerNodeId, {
    label: centerPerson.full_name,
    type: "offender",
    risk: centerProfile ? num(centerProfile.risk_score) : undefined,
    meta: centerProfile ? {
      "Linked FIRs": num(centerProfile.linked_fir_count),
      Jurisdictions: num(centerProfile.jurisdictions_count),
      MO: centerProfile.mo_primary,
    } : {},
  });

  // FIRs the center is accused in
  const centerFirIds = casePersons
    .filter((c) => c.person_id === centerId && c.role === "accused")
    .map((c) => c.fir_id);
  const firSet = new Set(centerFirIds);

  for (const fid of firSet) {
    const f = firById.get(fid);
    if (!f) continue;
    const fnode = "fir-" + fid;
    addNode(fnode, { label: "FIR " + f.fir_number, type: "fir", meta: { Type: f.crime_type, Station: f.district, Date: (f.occurred_at || "").slice(0, 10) } });
    addLink(centerNodeId, fnode, "case");
  }

  // victims + co-accused on those FIRs
  for (const c of casePersons) {
    if (!firSet.has(c.fir_id)) continue;
    const fnode = "fir-" + c.fir_id;
    const p = personById.get(c.person_id);
    if (!p) continue;
    if (c.role === "victim") {
      const vnode = "vic-" + c.person_id;
      addNode(vnode, { label: "Victim · " + p.full_name.split(" ")[0], type: "victim", meta: { FIR: firById.get(c.fir_id)?.fir_number } });
      addLink(fnode, vnode, "case");
    } else if (c.role === "accused" && c.person_id !== centerId) {
      const onode = "off-" + c.person_id;
      const prof = profileById.get(c.person_id);
      addNode(onode, { label: p.full_name, type: "offender", risk: prof ? num(prof.risk_score) : undefined, meta: {} });
      addLink(onode, fnode, "case");
    }
  }

  // phones seen across the FIRs (the hidden links) + custody link to center
  const centerPhones = new Set(personPhones.filter((pp) => pp.person_id === centerId).map((pp) => pp.phone_id));
  for (const fp of firPhones) {
    if (!firSet.has(fp.fir_id)) continue;
    const pnode = "ph-" + fp.phone_id;
    addNode(pnode, { label: "Phone " + fp.phone_id.slice(-4), type: "phone", meta: {} });
    addLink("fir-" + fp.fir_id, pnode, "phone");
    if (centerPhones.has(fp.phone_id)) addLink(pnode, centerNodeId, "phone");
  }

  // money trail: accounts receiving funds linked to the FIRs
  for (const t of txns) {
    if (!firSet.has(t.linked_fir_id)) continue;
    const acc = accounts.find((a) => a.account_id === t.to_account);
    if (!acc) continue;
    const anode = "acc-" + acc.account_id;
    addNode(anode, { label: "A/C " + acc.number_masked, type: "account", meta: { Flags: String(acc.suspected_mule).toLowerCase() === "true" ? "Mule (suspected)" : "—" } });
    addLink(centerNodeId, anode, "money");
    addLink(anode, "fir-" + t.linked_fir_id, "money");
  }

  return { nodes: [...nodes.values()], links, centerId: centerNodeId };
}

module.exports = { buildGraph };
