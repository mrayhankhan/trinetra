# Demo ZCQL queries (hit the planted networks)

ZCQL is Catalyst Data Store's SQL-like query language. These are the queries the
NL→ZCQL agent generates for common investigator questions — each lands on a
planted ring so the demo always finds something. Table/column names match
`schema.md`.

> Generated with `--seed 42`. IDs (e.g. `P05001`, `PH00517`) are stable for that
> seed; re-running with the same seed reproduces them.

---

### 1. "Who connects these chain-snatching cases in BLR South?"
Find FIRs sharing a phone with a single accused — the organised ring.

```sql
SELECT p.full_name, ph.phone_id, COUNT(DISTINCT fp.fir_id) AS cases
FROM case_persons cp
JOIN persons p ON cp.person_id = p.person_id
JOIN person_phones pp ON pp.person_id = p.person_id
JOIN fir_phones fp ON fp.phone_id = pp.phone_id
JOIN ph phones ON ph.phone_id = pp.phone_id
WHERE cp.role = 'accused'
GROUP BY p.full_name, ph.phone_id
ORDER BY cases DESC
LIMIT 5;
```
→ Suresh M. via phone `PH00517` across 6 FIRs.

### 2. "Show repeat offenders by risk"
```sql
SELECT p.full_name, op.risk_score, op.linked_fir_count,
       op.jurisdictions_count, op.mo_primary
FROM offender_profiles op
JOIN persons p ON op.person_id = p.person_id
ORDER BY op.risk_score DESC
LIMIT 10;
```
→ Suresh M. (82), Manjunath G. (77), Deepa N. (71) …

### 3. "Where are the chain-snatching hotspots, and at what time?"
```sql
SELECT district, hour_of_day, COUNT(*) AS incidents
FROM firs
WHERE crime_type = 'Chain snatching'
GROUP BY district, hour_of_day
ORDER BY incidents DESC;
```
→ BLR South / Jayanagar / BTM cluster in the 18:00–22:00 window.

### 4. "Trace the money trail for FIR F4206"
```sql
SELECT t.txn_id, t.from_account, t.to_account, t.amount, a.suspected_mule
FROM transactions t
JOIN accounts a ON a.account_id = t.to_account
WHERE t.linked_fir_id = 'F4206';
```
→ funds into a suspected mule account shared across the ring's FIRs.

### 5. "Show the case timeline for offender Suresh M."
```sql
SELECT f.fir_number, f.crime_type, f.district, f.occurred_at, f.status
FROM case_persons cp
JOIN firs f ON cp.fir_id = f.fir_id
WHERE cp.person_id = 'P05001' AND cp.role = 'accused'
ORDER BY f.occurred_at ASC;
```

### 6. "Vehicle thefts across districts at night (the cross-district ring)"
```sql
SELECT district, COUNT(*) AS thefts
FROM firs
WHERE crime_type = 'Vehicle theft' AND hour_of_day < 5
GROUP BY district
ORDER BY thefts DESC;
```
→ Whitefield / KR Puram / Yelahanka — Manjunath G.'s ring.

### 7. Sociological — crime by socioeconomic band
```sql
SELECT p.socioeconomic_band, f.crime_type, COUNT(*) AS n
FROM case_persons cp
JOIN persons p ON cp.person_id = p.person_id
JOIN firs f ON cp.fir_id = f.fir_id
WHERE cp.role = 'accused'
GROUP BY p.socioeconomic_band, f.crime_type
ORDER BY n DESC;
```

---

**Note on ZCQL joins:** Catalyst ZCQL supports `JOIN`, `GROUP BY`, aggregates,
and up to a bounded number of joined tables per query. For deep multi-hop network
traversal (3+ hops), the network-build Function runs iterative ZCQL queries and
assembles the graph in code rather than one giant join.
