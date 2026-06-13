"use client";

import { firEvents, offenderById } from "@/lib/mockData";

const TYPE_COLOR: Record<string, string> = {
  "Chain snatching": "#e2524b",
  "Vehicle theft": "#d6a943",
  "Mobile theft": "#a98fd0",
  "Online fraud": "#5fd3f0",
  "House break-in": "#2f7fa0",
};

const STATUS_COLOR: Record<string, string> = {
  Open: "#e2524b",
  "Under investigation": "#d6a943",
  "Charge-sheeted": "#5dca8a",
};

export default function TimelineView({
  onSelectOffender,
}: {
  onSelectOffender: (id: string) => void;
}) {
  const events = [...firEvents].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="h-full overflow-y-auto bg-well p-4">
      <div className="mb-3 font-mono text-[10px] tracking-[1.5px] text-dim">
        CASE TIMELINE · JAN–JUN 2026 · {events.length} FIRs
      </div>
      <div className="relative ml-2 border-l border-line pl-5">
        {events.map((e) => {
          const color = TYPE_COLOR[e.type] ?? "#7d8da0";
          const off = e.offenderId ? offenderById(e.offenderId) : undefined;
          return (
            <div key={e.id} className="relative mb-3.5">
              <span
                className="absolute -left-[26px] top-1.5 h-2.5 w-2.5 rounded-full border-2"
                style={{ borderColor: color, background: "#070b11" }}
              />
              <div className="rounded-md border border-line bg-panel p-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-ink">
                    <span style={{ color }}>{e.type}</span>
                    <span className="text-dim"> · FIR {e.id}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted">
                    {e.date} · {String(e.hour).padStart(2, "0")}:00
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-dim">
                  <span>{e.station}</span>
                  <span
                    style={{ color: STATUS_COLOR[e.status] }}
                  >
                    ● {e.status}
                  </span>
                  {off && (
                    <button
                      onClick={() => onSelectOffender(off.id)}
                      className="text-cyan hover:underline"
                    >
                      {off.name} (risk {off.risk}) ↗
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
