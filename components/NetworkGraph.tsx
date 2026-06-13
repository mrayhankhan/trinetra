"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Maximize2 } from "lucide-react";
import {
  nodes,
  links,
  adjacency,
  NODE_COLOR,
  NODE_LABEL,
  type GraphNode,
  type NodeType,
} from "@/lib/mockData";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
});

const TYPE_RADIUS: Record<NodeType, number> = {
  offender: 9,
  fir: 6,
  account: 6,
  phone: 5,
  victim: 5,
};

const ALL_TYPES = Object.keys(NODE_COLOR) as NodeType[];

export default function NetworkGraph({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (n: GraphNode) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  const [size, setSize] = useState({ w: 600, h: 400 });
  const [active, setActive] = useState<Set<NodeType>>(new Set(ALL_TYPES));

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setSize({ w: el.clientWidth, h: el.clientHeight })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () => ({
      nodes: nodes.map((n) => ({ ...n })),
      links: links.map((l) => ({ ...l })),
    }),
    []
  );

  const adj = useMemo(
    () => (selectedId ? adjacency(selectedId) : null),
    [selectedId]
  );

  const counts = useMemo(() => {
    const m = {} as Record<NodeType, number>;
    for (const n of nodes) m[n.type] = (m[n.type] ?? 0) + 1;
    return m;
  }, []);

  function toggle(t: NodeType) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function fit() {
    fgRef.current?.zoomToFit?.(400, 40);
  }

  return (
    <div ref={wrapRef} className="relative h-full w-full bg-well">
      <div className="pointer-events-none absolute left-3 top-2 z-10 font-mono text-[10px] tracking-[1.5px] text-dim">
        NETWORK · {nodes.length} NODES · {links.length} LINKS
      </div>

      <button
        onClick={fit}
        aria-label="Zoom to fit"
        title="Zoom to fit"
        className="absolute right-3 top-2 z-10 rounded border border-line bg-panel/80 p-1.5 text-dim transition hover:text-cyan"
      >
        <Maximize2 size={13} />
      </button>

      <div className="absolute bottom-3 left-3 z-10 flex flex-wrap gap-1.5">
        {ALL_TYPES.map((t) => {
          const on = active.has(t);
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              className="flex items-center gap-1.5 rounded border border-line bg-panel/80 px-2 py-1 font-mono text-[10px] transition"
              style={{ opacity: on ? 1 : 0.4 }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: NODE_COLOR[t] }}
              />
              <span className="text-muted">
                {NODE_LABEL[t]} {counts[t]}
              </span>
            </button>
          );
        })}
      </div>

      <ForceGraph2D
        ref={fgRef}
        width={size.w}
        height={size.h}
        graphData={data}
        backgroundColor="#070b11"
        cooldownTicks={120}
        onEngineStop={fit}
        linkColor={(l: any) => {
          const hidden =
            !active.has(typeFromEndpoint(l.source)) ||
            !active.has(typeFromEndpoint(l.target));
          if (hidden) return "rgba(0,0,0,0)";
          const dim = adj && !(adj.has(idOf(l.source)) && adj.has(idOf(l.target)));
          if (l.kind === "money" || l.kind === "phone")
            return dim ? "rgba(216,69,63,0.25)" : "#d8453f";
          return dim ? "rgba(39,56,74,0.4)" : "#27384a";
        }}
        linkLineDash={(l: any) =>
          l.kind === "money" || l.kind === "phone" ? [3, 3] : null
        }
        linkWidth={(l: any) =>
          l.kind === "money" || l.kind === "phone" ? 1.2 : 1
        }
        nodeRelSize={1}
        onNodeClick={(n: any) => onSelect(n as GraphNode)}
        nodeCanvasObject={(node: any, ctx, scale) => {
          if (!active.has(node.type)) return;
          const r = TYPE_RADIUS[node.type as NodeType] ?? 5;
          const color = NODE_COLOR[node.type as NodeType];
          const selected = node.id === selectedId;
          const dim = adj ? !adj.has(node.id) : false;
          ctx.globalAlpha = dim ? 0.3 : 1;

          if (node.type === "offender") {
            ctx.beginPath();
            ctx.arc(node.x, node.y, r + 6, 0, 2 * Math.PI);
            ctx.strokeStyle = "rgba(226,82,75,0.35)";
            ctx.lineWidth = 1;
            ctx.stroke();
          }

          ctx.beginPath();
          ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
          ctx.fillStyle = color + "33";
          ctx.fill();
          ctx.strokeStyle = selected ? "#5fd3f0" : color;
          ctx.lineWidth = selected ? 2 : 1.4;
          ctx.stroke();

          const fontSize = Math.max(9 / scale, 2.5);
          ctx.font = `${fontSize}px ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = node.type === "offender" ? "#ff8a83" : "#8a98ac";
          ctx.fillText(node.label, node.x, node.y - r - fontSize);
          ctx.globalAlpha = 1;
        }}
      />
    </div>
  );
}

// react-force-graph replaces source/target with node objects after layout;
// before that they're string ids. These helpers handle both.
function idOf(end: any): string {
  return typeof end === "object" ? end.id : end;
}
function typeFromEndpoint(end: any): NodeType {
  if (typeof end === "object" && end.type) return end.type;
  return nodes.find((n) => n.id === end)?.type ?? "fir";
}
