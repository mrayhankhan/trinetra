"use client";

import { useState } from "react";
import { offenders, type OffenderProfile } from "@/lib/mockData";

type SortKey = "risk" | "priors" | "jurisdictions";

function riskColor(v: number) {
  return v >= 70 ? "#e2524b" : v >= 40 ? "#d6a943" : "#5dca8a";
}

export default function ProfilesView({
  onSelectOffender,
  focusId,
}: {
  onSelectOffender: (id: string) => void;
  focusId?: string | null;
}) {
  const [sort, setSort] = useState<SortKey>("risk");
  const rows: OffenderProfile[] = [...offenders].sort(
    (a, b) => b[sort] - a[sort]
  );

  return (
    <div className="h-full overflow-y-auto bg-well p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-[1.5px] text-dim">
          OFFENDER PROFILES · {offenders.length}
        </span>
        <div className="flex gap-1 font-mono text-[10px]">
          {(["risk", "priors", "jurisdictions"] as SortKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className={
                "rounded px-2 py-1 transition " +
                (sort === k
                  ? "bg-cyan/10 text-cyan"
                  : "text-dim hover:text-muted")
              }
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="bg-panel font-mono text-[10px] uppercase tracking-wider text-dim">
              <th className="px-3 py-2 text-left font-normal">Offender</th>
              <th className="px-3 py-2 text-left font-normal">MO</th>
              <th className="px-3 py-2 text-center font-normal">Priors</th>
              <th className="px-3 py-2 text-center font-normal">FIRs</th>
              <th className="px-3 py-2 text-left font-normal">Risk</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                onClick={() => onSelectOffender(o.id)}
                className={
                  "cursor-pointer border-t border-line transition hover:bg-panel " +
                  (focusId === o.id ? "bg-cyan/5" : "")
                }
              >
                <td className="px-3 py-2.5">
                  <div className="text-ink">{o.name}</div>
                  <div className="font-mono text-[10px] text-dim">
                    {o.age}y{o.alias ? ` · “${o.alias}”` : ""} ·{" "}
                    {o.jurisdictions} stns
                  </div>
                </td>
                <td className="px-3 py-2.5 text-muted">{o.mo}</td>
                <td className="px-3 py-2.5 text-center text-ink">{o.priors}</td>
                <td className="px-3 py-2.5 text-center text-ink">
                  {o.linkedFirs.length}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded bg-line">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${o.risk}%`,
                          background: riskColor(o.risk),
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-[11px]"
                      style={{ color: riskColor(o.risk) }}
                    >
                      {o.risk}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
