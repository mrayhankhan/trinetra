// Mock crime data with a "planted" organised-crime ring.
// Stands in for the Catalyst Data Store / network-build Function until the
// backend is wired. The frontend renders entirely from these shapes, so the
// real backend only has to return the same contracts.

// ---------- Network graph ----------

export type NodeType = "offender" | "fir" | "victim" | "account" | "phone";

export interface GraphNode {
  id: string;
  label: string;
  type: NodeType;
  risk?: number;
  meta?: Record<string, string | number>;
}

export interface GraphLink {
  source: string;
  target: string;
  kind?: "case" | "money" | "phone";
}

export const NODE_COLOR: Record<NodeType, string> = {
  offender: "#e2524b",
  fir: "#2f7fa0",
  victim: "#445268",
  account: "#d6a943",
  phone: "#a98fd0",
};

export const NODE_LABEL: Record<NodeType, string> = {
  offender: "Offender",
  fir: "FIR",
  victim: "Victim",
  account: "Account",
  phone: "Phone",
};

export const nodes: GraphNode[] = [
  { id: "off-suresh", label: "Suresh M.", type: "offender", risk: 87, meta: { "Linked FIRs": 4, Priors: 3, MO: "2-wheeler snatch", "Shared phone": "2 cases", "Money link": "A/C ··7741", Jurisdictions: "3 stations" } },
  { id: "off-ravi", label: "Ravi K.", type: "offender", risk: 64, meta: { "Linked FIRs": 2, Priors: 1, MO: "2-wheeler snatch" } },
  { id: "fir-2291", label: "FIR 2291", type: "fir", meta: { Type: "Chain snatching", Station: "BLR South", Date: "2026-02-11" } },
  { id: "fir-2310", label: "FIR 2310", type: "fir", meta: { Type: "Chain snatching", Station: "BLR South", Date: "2026-03-04" } },
  { id: "fir-2402", label: "FIR 2402", type: "fir", meta: { Type: "Chain snatching", Station: "Jayanagar", Date: "2026-04-19" } },
  { id: "fir-2455", label: "FIR 2455", type: "fir", meta: { Type: "Chain snatching", Station: "BTM Layout", Date: "2026-05-22" } },
  { id: "vic-1", label: "Victim · R.K.", type: "victim", meta: { FIR: "2291", Age: 54 } },
  { id: "vic-2", label: "Victim · S.D.", type: "victim", meta: { FIR: "2310", Age: 61 } },
  { id: "acc-7741", label: "A/C ··7741", type: "account", meta: { Flags: "Mule (suspected)", "Linked FIRs": 2 } },
  { id: "ph-4021", label: "Phone ··4021", type: "phone", meta: { "Linked FIRs": 2, IMEI: "··8830" } },
  { id: "ph-7765", label: "Phone ··7765", type: "phone", meta: { "Linked FIRs": 1 } },
];

export const links: GraphLink[] = [
  { source: "off-suresh", target: "fir-2291", kind: "case" },
  { source: "off-suresh", target: "fir-2310", kind: "case" },
  { source: "off-suresh", target: "fir-2402", kind: "case" },
  { source: "off-suresh", target: "fir-2455", kind: "case" },
  { source: "off-suresh", target: "acc-7741", kind: "money" },
  { source: "off-ravi", target: "fir-2402", kind: "case" },
  { source: "off-ravi", target: "ph-7765", kind: "phone" },
  { source: "fir-2291", target: "vic-1", kind: "case" },
  { source: "fir-2310", target: "vic-2", kind: "case" },
  { source: "fir-2402", target: "ph-4021", kind: "phone" },
  { source: "fir-2455", target: "ph-4021", kind: "phone" },
  { source: "ph-4021", target: "off-suresh", kind: "phone" },
  { source: "acc-7741", target: "fir-2455", kind: "money" },
];

export const defaultSelectedId = "off-suresh";

// ---------- Offender profiles (explainable risk) ----------

export interface RiskFactor {
  label: string;
  value: number; // 0–100 contribution, for the breakdown bars
}

export interface OffenderProfile {
  id: string;
  name: string;
  alias?: string;
  age: number;
  risk: number;
  mo: string;
  jurisdictions: number;
  priors: number;
  linkedFirs: string[];
  factors: RiskFactor[];
}

export const offenders: OffenderProfile[] = [
  { id: "off-suresh", name: "Suresh M.", alias: "Suri", age: 31, risk: 87, mo: "2-wheeler chain snatch", jurisdictions: 3, priors: 3, linkedFirs: ["2291", "2310", "2402", "2455"], factors: [ { label: "Network centrality", value: 92 }, { label: "Prior convictions", value: 80 }, { label: "Recency of activity", value: 88 }, { label: "MO consistency", value: 90 }, { label: "Cross-jurisdiction", value: 75 } ] },
  { id: "off-ravi", name: "Ravi K.", age: 27, risk: 64, mo: "2-wheeler chain snatch", jurisdictions: 2, priors: 1, linkedFirs: ["2402", "2511"], factors: [ { label: "Network centrality", value: 58 }, { label: "Prior convictions", value: 40 }, { label: "Recency of activity", value: 70 }, { label: "MO consistency", value: 80 }, { label: "Cross-jurisdiction", value: 50 } ] },
  { id: "off-imran", name: "Imran S.", age: 34, risk: 58, mo: "Mobile theft / pickpocket", jurisdictions: 2, priors: 2, linkedFirs: ["2333", "2389"], factors: [ { label: "Network centrality", value: 45 }, { label: "Prior convictions", value: 65 }, { label: "Recency of activity", value: 60 }, { label: "MO consistency", value: 72 }, { label: "Cross-jurisdiction", value: 40 } ] },
  { id: "off-deepa", name: "Deepa N.", age: 29, risk: 41, mo: "Online fraud / OTP scam", jurisdictions: 1, priors: 1, linkedFirs: ["2360"], factors: [ { label: "Network centrality", value: 35 }, { label: "Prior convictions", value: 38 }, { label: "Recency of activity", value: 55 }, { label: "MO consistency", value: 48 }, { label: "Cross-jurisdiction", value: 20 } ] },
  { id: "off-manju", name: "Manjunath G.", age: 42, risk: 73, mo: "Vehicle theft ring", jurisdictions: 4, priors: 4, linkedFirs: ["2204", "2278", "2421"], factors: [ { label: "Network centrality", value: 70 }, { label: "Prior convictions", value: 90 }, { label: "Recency of activity", value: 50 }, { label: "MO consistency", value: 78 }, { label: "Cross-jurisdiction", value: 85 } ] },
  { id: "off-faisal", name: "Faisal A.", age: 25, risk: 36, mo: "House break-in", jurisdictions: 1, priors: 0, linkedFirs: ["2440"], factors: [ { label: "Network centrality", value: 25 }, { label: "Prior convictions", value: 10 }, { label: "Recency of activity", value: 60 }, { label: "MO consistency", value: 55 }, { label: "Cross-jurisdiction", value: 15 } ] },
];

// ---------- FIR events (timeline + map) ----------

export interface FirEvent {
  id: string;
  type: string;
  station: string;
  district: string;
  date: string; // ISO
  hour: number; // 0–23
  status: "Open" | "Under investigation" | "Charge-sheeted";
  offenderId?: string;
}

export const firEvents: FirEvent[] = [
  { id: "2204", type: "Vehicle theft", station: "Whitefield", district: "Whitefield", date: "2026-01-09", hour: 2, status: "Charge-sheeted", offenderId: "off-manju" },
  { id: "2278", type: "Vehicle theft", station: "KR Puram", district: "KR Puram", date: "2026-01-28", hour: 3, status: "Under investigation", offenderId: "off-manju" },
  { id: "2291", type: "Chain snatching", station: "BLR South", district: "BLR South", date: "2026-02-11", hour: 20, status: "Under investigation", offenderId: "off-suresh" },
  { id: "2310", type: "Chain snatching", station: "BLR South", district: "BLR South", date: "2026-03-04", hour: 21, status: "Under investigation", offenderId: "off-suresh" },
  { id: "2333", type: "Mobile theft", station: "Majestic", district: "Rajajinagar", date: "2026-03-12", hour: 18, status: "Open", offenderId: "off-imran" },
  { id: "2360", type: "Online fraud", station: "Cyber CEN", district: "BLR South", date: "2026-03-29", hour: 14, status: "Under investigation", offenderId: "off-deepa" },
  { id: "2389", type: "Mobile theft", station: "Majestic", district: "Rajajinagar", date: "2026-04-08", hour: 19, status: "Open", offenderId: "off-imran" },
  { id: "2402", type: "Chain snatching", station: "Jayanagar", district: "Jayanagar", date: "2026-04-19", hour: 20, status: "Under investigation", offenderId: "off-suresh" },
  { id: "2421", type: "Vehicle theft", station: "Yelahanka", district: "Yelahanka", date: "2026-05-02", hour: 1, status: "Open", offenderId: "off-manju" },
  { id: "2440", type: "House break-in", station: "Electronic City", district: "Electronic City", date: "2026-05-14", hour: 4, status: "Open", offenderId: "off-faisal" },
  { id: "2455", type: "Chain snatching", station: "BTM Layout", district: "BTM", date: "2026-05-22", hour: 21, status: "Open", offenderId: "off-suresh" },
  { id: "2511", type: "Chain snatching", station: "Jayanagar", district: "Jayanagar", date: "2026-06-03", hour: 22, status: "Open", offenderId: "off-ravi" },
];

// District positions on the 360×320 map canvas (stylised Bengaluru layout).
export const districtPos: Record<string, { x: number; y: number }> = {
  "BLR South": { x: 175, y: 175 },
  Jayanagar: { x: 150, y: 215 },
  BTM: { x: 200, y: 225 },
  Rajajinagar: { x: 120, y: 120 },
  Whitefield: { x: 285, y: 110 },
  "KR Puram": { x: 255, y: 150 },
  Yelahanka: { x: 175, y: 55 },
  "Electronic City": { x: 195, y: 285 },
};

// Real Bengaluru-ish district centroids [lng, lat] for the MapLibre map.
export const districtGeo: Record<string, [number, number]> = {
  "BLR South": [77.595, 12.915],
  Jayanagar: [77.583, 12.925],
  BTM: [77.61, 12.916],
  Rajajinagar: [77.552, 12.991],
  Whitefield: [77.749, 12.969],
  "KR Puram": [77.694, 13.007],
  Yelahanka: [77.596, 13.1],
  "Electronic City": [77.66, 12.845],
};

// Deterministic point for a FIR (district centroid + small jitter from id).
export function firPoint(e: FirEvent): [number, number] {
  const base = districtGeo[e.district] || [77.59, 12.97];
  let h = 0;
  for (const c of e.id) h = (h * 31 + c.charCodeAt(0)) % 1000;
  const jx = ((h % 100) / 100 - 0.5) * 0.025;
  const jy = ((Math.floor(h / 100) % 100) / 100 - 0.5) * 0.025;
  return [base[0] + jx, base[1] + jy];
}

// ---------- Crime forecasting (early-warning) ----------

export interface Forecast {
  district: string;
  crime: string;
  projected: number; // next-7-day projected incidents
  trend: "up" | "down" | "flat";
  pct: number; // vs trailing average
}

export const forecasts: Forecast[] = [
  { district: "BLR South", crime: "Chain snatching", projected: 5, trend: "up", pct: 180 },
  { district: "Whitefield", crime: "Vehicle theft", projected: 3, trend: "up", pct: 60 },
  { district: "Jayanagar", crime: "Chain snatching", projected: 3, trend: "up", pct: 45 },
  { district: "KR Puram", crime: "Vehicle theft", projected: 2, trend: "flat", pct: 5 },
  { district: "Rajajinagar", crime: "Mobile theft", projected: 2, trend: "down", pct: -20 },
];

// ---------- Early-warning alerts ----------

export interface Alert {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  time: string;
  kind: "spike" | "network" | "repeat" | "anomaly";
}

export const alerts: Alert[] = [
  { id: "al-1", severity: "high", title: "Chain-snatching spike — BLR South", detail: "+180% vs 6-month average; 4 FIRs cluster to one offender network.", time: "12 min ago", kind: "spike" },
  { id: "al-2", severity: "high", title: "Organised ring forming", detail: "Suresh M. now links 4 FIRs across 3 stations via shared phone ··4021.", time: "1 hr ago", kind: "network" },
  { id: "al-3", severity: "medium", title: "Repeat offender released", detail: "Manjunath G. (risk 73) flagged active again — vehicle-theft MO.", time: "3 hr ago", kind: "repeat" },
  { id: "al-4", severity: "medium", title: "Suspected mule account active", detail: "A/C ··7741 linked to 2 chain-snatching FIRs.", time: "5 hr ago", kind: "anomaly" },
  { id: "al-5", severity: "low", title: "Night-window pattern", detail: "Vehicle thefts cluster 01:00–04:00 in Whitefield / KR Puram.", time: "yesterday", kind: "anomaly" },
];

// ---------- Helpers ----------

const nodeIndex = new Map(nodes.map((n) => [n.id, n]));

export function nodeById(id: string): GraphNode | undefined {
  return nodeIndex.get(id);
}

export function offenderById(id: string): OffenderProfile | undefined {
  return offenders.find((o) => o.id === id);
}

export function neighborsOf(id: string): GraphNode[] {
  const ids = new Set<string>();
  for (const l of links) {
    if (l.source === id) ids.add(l.target);
    else if (l.target === id) ids.add(l.source);
  }
  return [...ids].map((i) => nodeIndex.get(i)).filter(Boolean) as GraphNode[];
}

export function adjacency(id: string): Set<string> {
  const s = new Set<string>([id]);
  for (const l of links) {
    if (l.source === id) s.add(l.target);
    else if (l.target === id) s.add(l.source);
  }
  return s;
}
