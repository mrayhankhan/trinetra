"use client";

import {
  NODE_COLOR,
  NODE_LABEL,
  offenderById,
  type GraphNode,
} from "@/lib/mockData";

function riskColor(v: number) {
  return v >= 70 ? "#e2524b" : v >= 40 ? "#d6a943" : "#5dca8a";
}

function RiskDial({ value }: { value: number }) {
  const color = riskColor(value);
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ border: `3px solid ${color}` }}
      >
        <span className="text-[16px] leading-none" style={{ color }}>
          {Math.round(value)}
        </span>
      </div>
      <div className="text-[11px] text-muted">
        <span style={{ color }}>
          {value >= 70 ? "High risk" : value >= 40 ? "Medium risk" : "Low risk"}
        </span>
        <br />
        weighted, explainable
      </div>
    </div>
  );
}

export default function Inspector({
  node,
  neighbors,
  onSelectNode,
}: {
  node: GraphNode | null;
  neighbors: GraphNode[];
  onSelectNode: (n: GraphNode) => void;
}) {
  if (!node) {
    return (
      <aside className="w-[230px] shrink-0 border-l border-line bg-panel p-3 text-[12px] text-dim">
        Select a node to inspect.
      </aside>
    );
  }

  const profile =
    node.type === "offender" ? offenderById(node.id) : undefined;

  return (
    <aside className="w-[230px] shrink-0 overflow-y-auto border-l border-line bg-panel p-3 text-[12px]">
      <div className="mb-2 font-mono text-[10px] tracking-[1.5px] text-dim">
        SELECTED · {NODE_LABEL[node.type].toUpperCase()}
      </div>
      <div className="mb-0.5 text-[14px] text-ink">{node.label}</div>
      {profile && (
        <div className="mb-3 text-[11px] text-muted">
          {profile.age}y · {profile.linkedFirs.length} linked FIRs · MO:{" "}
          {profile.mo}
        </div>
      )}

      {profile && (
        <>
          <div className="mb-3">
            <RiskDial value={profile.risk} />
          </div>
          <div className="mb-1 font-mono text-[10px] tracking-wide text-dim">
            RISK FACTORS
          </div>
          <div className="mb-3 flex flex-col gap-1.5">
            {profile.factors.map((f) => (
              <div key={f.label}>
                <div className="flex justify-between font-mono text-[10px] text-muted">
                  <span>{f.label}</span>
                  <span className="text-ink">{f.value}</span>
                </div>
                <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-line">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${f.value}%`,
                      background: riskColor(f.value),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!profile && node.meta && (
        <div className="mb-3 flex flex-col gap-1.5 font-mono text-[11px] text-muted">
          {Object.entries(node.meta).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <span className="text-dim">{k}</span>
              <span className="text-right text-ink">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-1 font-mono text-[10px] tracking-wide text-dim">
        CONNECTED · {neighbors.length}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {neighbors.map((n) => (
          <button
            key={n.id}
            onClick={() => onSelectNode(n)}
            className="flex items-center gap-1.5 rounded border border-line px-2 py-1 font-mono text-[10px] text-muted transition hover:border-line2 hover:text-ink"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ background: NODE_COLOR[n.type] }}
            />
            {n.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
