#!/usr/bin/env python3
"""
TRINETRA synthetic crime-data generator (KSP Datathon 2026).

Generates a realistic-but-fake KSP crime database for the Catalyst Data Store:
baseline random FIRs plus deliberately *planted* organised-crime networks so the
agent and graph always surface dramatic, true findings during a demo.

Stdlib only — no pip install required. Writes one CSV per Data Store table into
the output dir, plus a manifest.json.

Usage:
    python3 generate_synthetic.py --firs 2000 --seed 42 --out ./out
    python3 generate_synthetic.py --firs 150000        # stress-test scale

The schema is documented in schema.md. All sensitive values are masked.
"""

import argparse
import csv
import json
import os
import random
from datetime import datetime, timedelta

# --------------------------------------------------------------------------- #
# Reference data
# --------------------------------------------------------------------------- #

FIRST_NAMES = [
    "Suresh", "Ravi", "Imran", "Deepa", "Manjunath", "Faisal", "Anita", "Kiran",
    "Lakshmi", "Vijay", "Naveen", "Priya", "Rahul", "Shilpa", "Arun", "Geetha",
    "Mohan", "Reshma", "Santosh", "Divya", "Ganesh", "Pooja", "Harish", "Nandini",
    "Vinay", "Asha", "Prakash", "Sneha", "Rajesh", "Meena", "Karthik", "Sahana",
    "Yusuf", "Bhavani", "Ramesh", "Jyothi", "Sandeep", "Kavya", "Mahesh", "Roopa",
]
LAST_NAMES = [
    "Kumar", "Reddy", "Gowda", "Shetty", "Nayak", "Rao", "Hegde", "Patil",
    "Murthy", "Bhat", "Pai", "Naidu", "Iyer", "Khan", "Sharma", "Das",
    "Prasad", "Gupta", "Joshi", "Kulkarni", "Desai", "Achar", "Setty", "Raju",
]

# (district, lat, lng) — Bengaluru-centric + a few state districts
DISTRICTS = [
    ("BLR South", 12.91, 77.59), ("Jayanagar", 12.93, 77.58),
    ("BTM", 12.92, 77.61), ("Rajajinagar", 12.99, 77.55),
    ("Whitefield", 12.97, 77.75), ("KR Puram", 13.00, 77.69),
    ("Yelahanka", 13.10, 77.59), ("Electronic City", 12.84, 77.66),
    ("Mysuru", 12.30, 76.65), ("Mangaluru", 12.91, 74.86),
    ("Hubballi", 15.36, 75.12), ("Belagavi", 15.85, 74.50),
]
SUBDIVISIONS = ["North", "South", "East", "West", "Central"]
RANGES = ["Bengaluru City", "Bengaluru Rural", "Western Range", "Northern Range"]
RANKS = ["DGP", "IGP", "DIG", "SP", "DySP", "Inspector", "SI"]

# crime_type -> (ipc_sections, [typical hours], modus_operandi options)
CRIME_TYPES = {
    "Chain snatching": ("IPC 379, 356", list(range(18, 23)),
                        ["2-wheeler snatch", "pillion-rider grab", "evening market snatch"]),
    "Vehicle theft": ("IPC 379", list(range(0, 5)) + [23],
                      ["lock-break theft", "duplicate-key theft", "parking-lot lift"]),
    "Mobile theft": ("IPC 379", list(range(11, 21)),
                    ["crowd pickpocket", "bus snatch", "shop-counter lift"]),
    "House break-in": ("IPC 457, 380", list(range(0, 6)),
                      ["rear-window entry", "lock tampering", "daytime recce break"]),
    "Online fraud": ("IT Act 66C, 66D; IPC 420", list(range(9, 19)),
                    ["OTP scam", "fake KYC call", "UPI request fraud"]),
    "Cheating": ("IPC 420", list(range(9, 19)),
                ["fake job offer", "investment scam", "advance-fee fraud"]),
    "Assault": ("IPC 323, 324", list(range(16, 24)),
               ["street altercation", "bar brawl", "domestic dispute"]),
    "Burglary": ("IPC 454, 457", list(range(0, 6)),
                ["shutter-break", "godown break-in", "ATM tamper"]),
}
CRIME_WEIGHTS = [22, 14, 16, 8, 14, 8, 10, 8]  # baseline mix

SOCIO = ["Low", "Lower-mid", "Mid", "Upper-mid", "High"]
EDU = ["None", "Primary", "Secondary", "Diploma", "Graduate", "Postgraduate"]
OCC = ["Unemployed", "Daily wage", "Driver", "Vendor", "Clerk", "Student",
       "Mechanic", "IT worker", "Shop owner", "Unknown"]
BANKS = ["SBI", "Canara", "Union", "HDFC", "ICICI", "Axis", "Kotak"]
STATUSES = ["Open", "Under investigation", "Charge-sheeted"]

START = datetime(2026, 1, 1)
END = datetime(2026, 6, 30)


def name(rng):
    return f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}"


def rand_dt(rng):
    delta = (END - START).days
    return START + timedelta(
        days=rng.randint(0, delta), hours=rng.randint(0, 23),
        minutes=rng.randint(0, 59),
    )


def iso(dt):
    return dt.strftime("%Y-%m-%dT%H:%M:%S")


# --------------------------------------------------------------------------- #
# Generation
# --------------------------------------------------------------------------- #

class DB:
    def __init__(self):
        self.stations = []
        self.officers = []
        self.persons = []
        self.firs = []
        self.case_persons = []
        self.phones = []
        self.accounts = []
        self.person_phones = []
        self.fir_phones = []
        self.transactions = []
        self.offender_profiles = []
        # bookkeeping
        self._fir_no = 2200
        self._ids = {k: 0 for k in
                     ["P", "ST", "OF", "PH", "AC", "CP", "PP", "FP", "TX"]}

    def nid(self, p):
        self._ids[p] += 1
        return f"{p}{self._ids[p]:05d}"

    def next_fir(self):
        self._fir_no += 1
        return self._fir_no


def build_stations(db, rng):
    for d, lat, lng in DISTRICTS:
        for _ in range(rng.randint(3, 5)):
            sid = db.nid("ST")
            db.stations.append({
                "station_id": sid,
                "station_name": f"{d} PS {sid[-2:]}",
                "district": d,
                "subdivision": rng.choice(SUBDIVISIONS),
                "range_office": rng.choice(RANGES),
                "latitude": round(lat + rng.uniform(-0.03, 0.03), 5),
                "longitude": round(lng + rng.uniform(-0.03, 0.03), 5),
            })
    # officers — a small hierarchy per station
    for st in db.stations:
        for rank in (["Inspector"] + rng.sample(RANKS, 2)):
            db.officers.append({
                "officer_id": db.nid("OF"),
                "full_name": name(rng),
                "rank": rank,
                "station_id": st["station_id"],
            })


def build_persons(db, rng, n):
    for _ in range(n):
        db.persons.append({
            "person_id": db.nid("P"),
            "full_name": name(rng),
            "age": rng.randint(16, 70),
            "gender": rng.choices(["M", "F"], weights=[78, 22])[0],
            "district": rng.choice(DISTRICTS)[0],
            "socioeconomic_band": rng.choices(SOCIO, weights=[30, 28, 22, 13, 7])[0],
            "education": rng.choice(EDU),
            "occupation": rng.choice(OCC),
        })


def add_fir(db, rng, crime_type, district=None, dt=None, mo=None,
            station=None, status=None):
    secs, hours, mos = CRIME_TYPES[crime_type]
    if district is None:
        district = rng.choice(DISTRICTS)[0]
    if station is None:
        cand = [s for s in db.stations if s["district"] == district]
        station = rng.choice(cand) if cand else rng.choice(db.stations)
    if dt is None:
        dt = rand_dt(rng).replace(hour=rng.choice(hours))
    fid = db.nid("P").replace("P", "FIR")  # not used; real id below
    fir_no = db.next_fir()
    fid = f"F{fir_no}"
    rec = {
        "fir_id": fid,
        "fir_number": str(fir_no),
        "crime_type": crime_type,
        "ipc_sections": secs,
        "station_id": station["station_id"],
        "district": district,
        "occurred_at": iso(dt),
        "reported_at": iso(dt + timedelta(hours=rng.randint(1, 36))),
        "hour_of_day": dt.hour,
        "status": status or rng.choices(STATUSES, weights=[45, 40, 15])[0],
        "modus_operandi": mo or rng.choice(mos),
        "latitude": round(station["latitude"] + rng.uniform(-0.01, 0.01), 5),
        "longitude": round(station["longitude"] + rng.uniform(-0.01, 0.01), 5),
    }
    db.firs.append(rec)
    return rec


def link_person(db, fir, person_id, role):
    db.case_persons.append({
        "link_id": db.nid("CP"),
        "fir_id": fir["fir_id"],
        "person_id": person_id,
        "role": role,
    })


def new_phone(db, rng):
    pid = db.nid("PH")
    db.phones.append({
        "phone_id": pid,
        "number_masked": "··" + str(rng.randint(1000, 9999)),
        "imei_masked": "··" + str(rng.randint(1000, 9999)),
    })
    return pid


def new_account(db, rng, mule=False):
    aid = db.nid("AC")
    db.accounts.append({
        "account_id": aid,
        "number_masked": "··" + str(rng.randint(1000, 9999)),
        "bank": rng.choice(BANKS),
        "suspected_mule": mule,
    })
    return aid


def build_baseline(db, rng, n):
    pids = [p["person_id"] for p in db.persons]
    for _ in range(n):
        ct = rng.choices(list(CRIME_TYPES), weights=CRIME_WEIGHTS)[0]
        fir = add_fir(db, rng, ct)
        # complainant + victim
        link_person(db, fir, rng.choice(pids), "complainant")
        if rng.random() < 0.8:
            link_person(db, fir, rng.choice(pids), "victim")
        # 0–2 accused (many cases have unknown accused)
        for _ in range(rng.choices([0, 1, 2], weights=[40, 45, 15])[0]):
            link_person(db, fir, rng.choice(pids), "accused")
        # phone occasionally seen in case
        if rng.random() < 0.25:
            db.fir_phones.append({
                "id": db.nid("FP"), "fir_id": fir["fir_id"],
                "phone_id": new_phone(db, rng),
            })


# --------------------------------------------------------------------------- #
# Planted organised-crime networks (the demo gold)
# --------------------------------------------------------------------------- #

def plant_ring(db, rng, kingpin_name, crime_type, districts, n_firs,
               accomplices, with_money, label):
    """Create a coherent ring: one kingpin tied to several FIRs via a shared
    phone (and optionally a money trail), plus accomplices."""
    kingpin = {
        "person_id": db.nid("P"), "full_name": kingpin_name,
        "age": rng.randint(25, 45), "gender": "M",
        "district": districts[0], "socioeconomic_band": rng.choice(["Low", "Lower-mid"]),
        "education": rng.choice(["None", "Primary", "Secondary"]),
        "occupation": rng.choice(["Unemployed", "Daily wage", "Driver"]),
    }
    db.persons.append(kingpin)
    shared_phone = new_phone(db, rng)
    db.person_phones.append({
        "id": db.nid("PP"), "person_id": kingpin["person_id"],
        "phone_id": shared_phone,
    })

    acc_ids = []
    for an in accomplices:
        a = {
            "person_id": db.nid("P"), "full_name": an,
            "age": rng.randint(20, 40), "gender": "M",
            "district": rng.choice(districts), "socioeconomic_band": "Low",
            "education": rng.choice(EDU[:3]), "occupation": "Daily wage",
        }
        db.persons.append(a)
        acc_ids.append(a["person_id"])

    mule_acc = new_account(db, rng, mule=True) if with_money else None
    if mule_acc:
        db.person_phones.append({  # tie account custody loosely via a 2nd mule
            "id": db.nid("PP"), "person_id": kingpin["person_id"],
            "phone_id": shared_phone,
        })

    ring_firs = []
    for i in range(n_firs):
        d = districts[i % len(districts)]
        dt = rand_dt(rng)
        fir = add_fir(db, rng, crime_type, district=d, dt=dt,
                      status=rng.choices(STATUSES, weights=[55, 35, 10])[0])
        link_person(db, fir, kingpin["person_id"], "accused")
        if acc_ids and rng.random() < 0.5:
            link_person(db, fir, rng.choice(acc_ids), "accused")
        link_person(db, fir, rng.choice(
            [p["person_id"] for p in db.persons]), "victim")
        # shared phone seen across the ring's cases (the hidden link)
        db.fir_phones.append({
            "id": db.nid("FP"), "fir_id": fir["fir_id"],
            "phone_id": shared_phone,
        })
        if mule_acc and rng.random() < 0.7:
            db.transactions.append({
                "txn_id": db.nid("TX"),
                "from_account": new_account(db, rng),
                "to_account": mule_acc,
                "amount": round(rng.uniform(2000, 60000), 2),
                "txn_ts": iso(dt + timedelta(hours=rng.randint(1, 12))),
                "linked_fir_id": fir["fir_id"],
            })
        ring_firs.append(fir)
    return kingpin, ring_firs


def plant_all(db, rng):
    plant_ring(db, rng, "Suresh M.", "Chain snatching",
               ["BLR South", "Jayanagar", "BTM"], 6,
               ["Ravi K.", "Anbu T."], with_money=True,
               label="BLR South chain-snatching ring")
    plant_ring(db, rng, "Manjunath G.", "Vehicle theft",
               ["Whitefield", "KR Puram", "Yelahanka"], 5,
               ["Nagaraj P."], with_money=False,
               label="Cross-district vehicle-theft ring")
    plant_ring(db, rng, "Deepa N.", "Online fraud",
               ["BLR South", "Electronic City"], 4,
               ["Imran S."], with_money=True,
               label="OTP-fraud money-mule cluster")


# --------------------------------------------------------------------------- #
# Derived: offender profiles + explainable risk
# --------------------------------------------------------------------------- #

def build_profiles(db):
    # accused -> list of firs
    accused = {}
    for cp in db.case_persons:
        if cp["role"] == "accused":
            accused.setdefault(cp["person_id"], []).append(cp["fir_id"])
    fir_by_id = {f["fir_id"]: f for f in db.firs}

    # degree (network centrality proxy): cases + co-accused + shared phones
    phone_firs = {}
    for fp in db.fir_phones:
        phone_firs.setdefault(fp["phone_id"], set()).add(fp["fir_id"])

    max_links = 1
    raw = {}
    for pid, firs in accused.items():
        firs = list(set(firs))
        districts = {fir_by_id[f]["district"] for f in firs if f in fir_by_id}
        mos = [fir_by_id[f]["modus_operandi"] for f in firs if f in fir_by_id]
        mo_primary = max(set(mos), key=mos.count) if mos else "—"
        last = max((fir_by_id[f]["occurred_at"] for f in firs if f in fir_by_id),
                   default=iso(START))
        recency_days = (END - datetime.fromisoformat(last)).days
        links = len(firs) + len(districts)
        max_links = max(max_links, links)
        raw[pid] = {
            "firs": firs, "districts": districts, "mo": mo_primary,
            "recency_days": recency_days, "links": links,
            "mo_consistency": (mos.count(mo_primary) / len(mos)) if mos else 0,
        }

    for pid, r in raw.items():
        priors = min(len(r["firs"]) - 1, 5)
        centrality = round(100 * r["links"] / max_links)
        recency = round(100 * max(0, 180 - r["recency_days"]) / 180)
        mo_consistency = round(100 * r["mo_consistency"])
        juris = round(100 * min(len(r["districts"]), 5) / 5)
        priors_norm = round(100 * priors / 5)
        risk = round(0.30 * centrality + 0.20 * priors_norm + 0.20 * recency
                     + 0.20 * mo_consistency + 0.10 * juris)
        db.offender_profiles.append({
            "person_id": pid,
            "priors": priors,
            "linked_fir_count": len(r["firs"]),
            "jurisdictions_count": len(r["districts"]),
            "mo_primary": r["mo"],
            "network_centrality": centrality,
            "recency_days": r["recency_days"],
            "risk_score": min(risk, 99),
        })


# --------------------------------------------------------------------------- #
# Output
# --------------------------------------------------------------------------- #

TABLES = ["stations", "officers", "persons", "firs", "case_persons", "phones",
          "accounts", "person_phones", "fir_phones", "transactions",
          "offender_profiles"]


def write_csv(path, rows):
    if not rows:
        open(path, "w").close()
        return
    with open(path, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser(description="TRINETRA synthetic crime data")
    ap.add_argument("--firs", type=int, default=2000, help="baseline FIR count")
    ap.add_argument("--persons", type=int, default=0,
                    help="person pool (default: firs * 1.5)")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "out"))
    args = ap.parse_args()

    rng = random.Random(args.seed)
    db = DB()

    n_persons = args.persons or int(args.firs * 1.5)
    build_stations(db, rng)
    build_persons(db, rng, n_persons)
    build_baseline(db, rng, args.firs)
    plant_all(db, rng)
    build_profiles(db)

    os.makedirs(args.out, exist_ok=True)
    counts = {}
    for t in TABLES:
        rows = getattr(db, t)
        write_csv(os.path.join(args.out, f"{t}.csv"), rows)
        counts[t] = len(rows)

    manifest = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "seed": args.seed,
        "counts": counts,
        "planted_rings": [
            "Suresh M. — BLR South chain-snatching ring (6 FIRs, shared phone, mule account)",
            "Manjunath G. — cross-district vehicle-theft ring (5 FIRs)",
            "Deepa N. — OTP-fraud money-mule cluster (4 FIRs, money trail)",
        ],
    }
    with open(os.path.join(args.out, "manifest.json"), "w") as fh:
        json.dump(manifest, fh, indent=2)

    top = sorted(db.offender_profiles, key=lambda o: o["risk_score"],
                 reverse=True)[:5]
    name_by_id = {p["person_id"]: p["full_name"] for p in db.persons}
    print(f"Wrote {sum(counts.values()):,} rows across {len(TABLES)} tables -> {args.out}")
    for t in TABLES:
        print(f"  {t:<20} {counts[t]:>8,}")
    print("\nTop offenders by risk:")
    for o in top:
        print(f"  {name_by_id[o['person_id']]:<14} risk {o['risk_score']:>3}"
              f"  ({o['linked_fir_count']} FIRs, {o['jurisdictions_count']} districts,"
              f" MO: {o['mo_primary']})")


if __name__ == "__main__":
    main()
