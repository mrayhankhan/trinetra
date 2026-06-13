"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { firEvents, firPoint, districtGeo, type FirEvent } from "@/lib/mockData";

const CRIME_COLOR: Record<string, string> = {
  "Chain snatching": "#e2524b",
  "Vehicle theft": "#d6a943",
  "Mobile theft": "#a98fd0",
  "Online fraud": "#5fd3f0",
  "House break-in": "#2f7fa0",
};

function featureCollection(events: FirEvent[]) {
  return {
    type: "FeatureCollection" as const,
    features: events.map((e) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: firPoint(e) },
      properties: { id: e.id, type: e.type, district: e.district, status: e.status },
    })),
  };
}

export default function MapPanel() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [range, setRange] = useState<[number, number]>([0, 23]);
  const [ready, setReady] = useState(false);

  const filtered = useMemo(
    () => firEvents.filter((e) => e.hour >= range[0] && e.hour <= range[1]),
    [range]
  );

  useEffect(() => {
    let map: any;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !wrapRef.current) return;
      map = new maplibregl.Map({
        container: wrapRef.current,
        style: {
          version: 8,
          sources: {
            carto: {
              type: "raster",
              tiles: [
                "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
                "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png",
              ],
              tileSize: 256,
              attribution: "© OpenStreetMap © CARTO",
            },
          },
          layers: [{ id: "carto", type: "raster", source: "carto" }],
        },
        center: [77.62, 12.97],
        zoom: 10.4,
        attributionControl: false,
      });
      mapRef.current = map;
      map.on("load", () => {
        map.addSource("fir", { type: "geojson", data: featureCollection(firEvents) });
        map.addLayer({
          id: "fir-heat",
          type: "heatmap",
          source: "fir",
          paint: {
            "heatmap-radius": 34,
            "heatmap-opacity": 0.55,
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)", 0.3, "#3a1c2b", 0.6, "#a3322d", 1, "#ff8a83",
            ],
          },
        });
        map.addLayer({
          id: "fir-pts",
          type: "circle",
          source: "fir",
          paint: {
            "circle-radius": 6,
            "circle-color": [
              "match", ["get", "type"],
              "Chain snatching", "#e2524b",
              "Vehicle theft", "#d6a943",
              "Mobile theft", "#a98fd0",
              "Online fraud", "#5fd3f0",
              "House break-in", "#2f7fa0",
              "#7d8da0",
            ],
            "circle-stroke-color": "#0a0e14",
            "circle-stroke-width": 1.5,
            "circle-opacity": 0.95,
          },
        });
        setReady(true);
        setTimeout(() => map.resize(), 150);
      });
    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  // update points + district badges when the time filter changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    const src = map.getSource("fir");
    if (src) src.setData(featureCollection(filtered));

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    const counts = new Map<string, number>();
    for (const e of filtered) counts.set(e.district, (counts.get(e.district) || 0) + 1);
    import("maplibre-gl").then(({ default: maplibregl }) => {
      for (const [district, n] of counts) {
        const lngLat = districtGeo[district];
        if (!lngLat) continue;
        const el = document.createElement("div");
        el.textContent = `${district} · ${n}`;
        el.style.cssText =
          "font:600 10px ui-monospace,monospace;color:#cdd9e6;background:rgba(10,14,20,.78);" +
          "border:1px solid #27384a;border-radius:4px;padding:2px 6px;white-space:nowrap;transform:translateY(-22px)";
        const mk = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map);
        markersRef.current.push(mk);
      }
    });
  }, [filtered, ready]);

  return (
    <div className="relative h-full w-full bg-well">
      <div className="pointer-events-none absolute left-3 top-2 z-10 font-mono text-[10px] tracking-[1.5px] text-dim">
        HOTSPOTS · {filtered.length} FIRs · {String(range[0]).padStart(2, "0")}:00–
        {String(range[1]).padStart(2, "0")}:00
      </div>

      <div className="absolute right-3 top-2 z-10 flex flex-col gap-1 rounded border border-line bg-panel/80 p-2">
        {Object.entries(CRIME_COLOR).map(([t, c]) => (
          <div key={t} className="flex items-center gap-1.5 font-mono text-[9px] text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: c }} />
            {t}
          </div>
        ))}
      </div>

      <div ref={wrapRef} className="h-[calc(100%-44px)] w-full" />

      <div className="flex items-center gap-3 border-t border-line bg-panel px-4 py-2.5">
        <span className="font-mono text-[10px] text-dim">TIME OF DAY</span>
        <input type="range" min={0} max={23} value={range[0]}
          onChange={(e) => setRange([Math.min(+e.target.value, range[1]), range[1]])}
          className="flex-1 accent-cyan" aria-label="Start hour" />
        <input type="range" min={0} max={23} value={range[1]}
          onChange={(e) => setRange([range[0], Math.max(+e.target.value, range[0])])}
          className="flex-1 accent-cyan" aria-label="End hour" />
        <div className="flex gap-1">
          {([["Night", [0, 5]], ["Evening", [18, 23]], ["All", [0, 23]]] as [string, [number, number]][]).map(
            ([label, r]) => (
              <button key={label} onClick={() => setRange(r)}
                className="rounded px-2 py-1 font-mono text-[10px] text-dim transition hover:bg-line hover:text-cyan">
                {label}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
