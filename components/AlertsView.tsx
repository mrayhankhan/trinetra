"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Share2,
  Repeat,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { alerts, forecasts, type Alert } from "@/lib/mockData";

const KIND_ICON: Record<Alert["kind"], LucideIcon> = {
  spike: TrendingUp,
  network: Share2,
  repeat: Repeat,
  anomaly: AlertTriangle,
};

const SEV_COLOR: Record<Alert["severity"], string> = {
  high: "#e2524b",
  medium: "#d6a943",
  low: "#5fd3f0",
};

export default function AlertsView() {
  return (
    <div className="h-full overflow-y-auto bg-well p-4">
      <div className="mb-2 font-mono text-[10px] tracking-[1.5px] text-dim">
        7-DAY FORECAST · PROJECTED HOTSPOTS
      </div>
      <div className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-3">
        {forecasts.map((f) => {
          const up = f.trend === "up";
          const Icon = up ? TrendingUp : f.trend === "down" ? TrendingDown : Minus;
          const col = up ? "#e2524b" : f.trend === "down" ? "#5dca8a" : "#7d8da0";
          return (
            <div
              key={f.district + f.crime}
              className="rounded-md border border-line bg-panel p-2.5"
              style={{ borderLeft: `2px solid ${col}` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-ink">{f.district}</span>
                <span className="flex items-center gap-1 font-mono text-[11px]" style={{ color: col }}>
                  <Icon size={12} />
                  {f.pct > 0 ? "+" : ""}{f.pct}%
                </span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-muted">
                {f.crime} · ~{f.projected} projected
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-3 font-mono text-[10px] tracking-[1.5px] text-dim">
        EARLY-WARNING FEED · {alerts.length} SIGNALS
      </div>
      <div className="flex flex-col gap-2">
        {alerts.map((a) => {
          const Icon = KIND_ICON[a.kind];
          const color = SEV_COLOR[a.severity];
          return (
            <div
              key={a.id}
              className="flex gap-3 rounded-md border border-line bg-panel p-3"
              style={{ borderLeft: `2px solid ${color}` }}
            >
              <Icon size={16} className="mt-0.5 shrink-0" style={{ color }} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] text-ink">{a.title}</span>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide"
                    style={{ color, background: `${color}1a` }}
                  >
                    {a.severity}
                  </span>
                </div>
                <div className="mt-0.5 text-[12px] leading-snug text-muted">
                  {a.detail}
                </div>
                <div className="mt-1 font-mono text-[10px] text-dim">
                  {a.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
