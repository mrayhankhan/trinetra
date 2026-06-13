# TRINETRA — Catalyst Data Store schema

Relational schema for the KSP crime database, designed for the queries TRINETRA
runs: NL→ZCQL retrieval, criminal-network/link analysis, offender profiling,
spatiotemporal hotspots, and money-trail analysis.

Catalyst Data Store has no graph DB, so **relationships are modelled as link
(edge) tables** (`case_persons`, `person_phones`, `fir_phones`, `transactions`).
The network-build Function joins these into the `{ nodes, links }` graph the
frontend consumes.

Column types use Catalyst Data Store data types: `Text`, `BigInt`, `Int`,
`Double`, `Boolean`, `DateTime`. Every table also gets the automatic
`ROWID`, `CREATEDTIME`, `MODIFIEDTIME` columns from Catalyst.

> Sensitive fields (phone numbers, account numbers) are stored **masked** in the
> synthetic data and would use Catalyst **Encrypted Text** + PII handling in
> production.

---

## Core entities

### `stations` — police station hierarchy
| Column | Type | Notes |
|--------|------|-------|
| station_id | Text (PK) | e.g. `ST0007` |
| station_name | Text | |
| district | Text | indexed (drill-down) |
| subdivision | Text | |
| range_office | Text | |
| latitude | Double | |
| longitude | Double | |

### `officers` — role hierarchy (RBAC context)
| Column | Type | Notes |
|--------|------|-------|
| officer_id | Text (PK) | |
| full_name | Text | |
| rank | Text | DGP / IGP / DIG / SP / DySP / Inspector / SI |
| station_id | Text (FK → stations) | |

### `persons` — accused, victims, complainants, witnesses
| Column | Type | Notes |
|--------|------|-------|
| person_id | Text (PK) | |
| full_name | Text | |
| age | Int | |
| gender | Text | |
| district | Text | residence — sociological analysis |
| socioeconomic_band | Text | Low / Lower-mid / Mid / Upper-mid / High |
| education | Text | |
| occupation | Text | |

### `firs` — First Information Reports
| Column | Type | Notes |
|--------|------|-------|
| fir_id | Text (PK) | |
| fir_number | Text | display number |
| crime_type | Text | indexed |
| ipc_sections | Text | comma-separated |
| station_id | Text (FK → stations) | |
| district | Text | indexed |
| occurred_at | DateTime | |
| reported_at | DateTime | |
| hour_of_day | Int | spatiotemporal clustering |
| status | Text | Open / Under investigation / Charge-sheeted |
| modus_operandi | Text | MO tag |
| latitude | Double | |
| longitude | Double | |

---

## Link (edge) tables — power the network analysis

### `case_persons` — who is involved in which FIR, and how
| Column | Type | Notes |
|--------|------|-------|
| link_id | Text (PK) | |
| fir_id | Text (FK → firs) | |
| person_id | Text (FK → persons) | |
| role | Text | accused / victim / complainant / witness |

### `phones`
| Column | Type | Notes |
|--------|------|-------|
| phone_id | Text (PK) | |
| number_masked | Text | `··4021` |
| imei_masked | Text | |

### `accounts`
| Column | Type | Notes |
|--------|------|-------|
| account_id | Text (PK) | |
| number_masked | Text | `··7741` |
| bank | Text | |
| suspected_mule | Boolean | |

### `person_phones` — person ↔ phone
| Column | Type |
|--------|------|
| id | Text (PK) |
| person_id | Text (FK → persons) |
| phone_id | Text (FK → phones) |

### `fir_phones` — phone seen in a case
| Column | Type |
|--------|------|
| id | Text (PK) |
| fir_id | Text (FK → firs) |
| phone_id | Text (FK → phones) |

### `transactions` — money trail
| Column | Type | Notes |
|--------|------|-------|
| txn_id | Text (PK) | |
| from_account | Text (FK → accounts) | |
| to_account | Text (FK → accounts) | |
| amount | Double | |
| txn_ts | DateTime | |
| linked_fir_id | Text (FK → firs) | nullable |

---

## Derived / maintained

### `offender_profiles` — explainable risk scoring
| Column | Type | Notes |
|--------|------|-------|
| person_id | Text (PK, FK → persons) | |
| priors | Int | prior convictions |
| linked_fir_count | Int | |
| jurisdictions_count | Int | distinct stations |
| mo_primary | Text | dominant MO |
| network_centrality | Int | 0–100, degree-based |
| recency_days | Int | days since last activity |
| risk_score | Int | 0–100, weighted of the above |

`risk_score` weighting (transparent, shown in the inspector):
`0.30·centrality + 0.20·priors_norm + 0.20·recency + 0.20·mo_consistency + 0.10·jurisdictions_norm`.

---

## Indexing / search
- Full-text search (Catalyst Data Store Search) on `firs.modus_operandi`,
  `firs.crime_type`, `persons.full_name`.
- Frequent filters indexed: `firs.district`, `firs.crime_type`,
  `firs.occurred_at`, `case_persons.role`.

## Import
Each table maps to one CSV in `out/`. Import via the Catalyst console
(Data Store → table → Import) or the Catalyst CLI bulk-import, in FK order:
`stations → officers → persons → firs → phones → accounts → case_persons →
person_phones → fir_phones → transactions → offender_profiles`.
