"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CommandBar from "@/components/CommandBar";
import IconRail from "@/components/IconRail";
import NetworkGraph from "@/components/NetworkGraph";
import MapPanel from "@/components/MapPanel";
import Inspector from "@/components/Inspector";
import AgentLog, { type AgentTurn } from "@/components/AgentLog";
import ProfilesView from "@/components/ProfilesView";
import AlertsView from "@/components/AlertsView";
import TimelineView from "@/components/TimelineView";
import { askAgent } from "@/lib/agent";
import { type ViewId } from "@/lib/views";
import {
  nodeById,
  neighborsOf,
  defaultSelectedId,
  type GraphNode,
} from "@/lib/mockData";
import {
  listen,
  speak,
  stopSpeaking,
  speechSupported,
  type Lang,
} from "@/lib/voice";

const INITIAL_TURNS: AgentTurn[] = [
  {
    role: "user",
    text: "ಬೆಂಗಳೂರು ದಕ್ಷಿಣ — chain-snatching, last 6 months — who connects them?",
  },
  {
    role: "agent",
    text: "4 of 6 chain-snatching FIRs in Bengaluru South link to one offender (Suresh M.) via a shared phone and account ··7741. Likely an organised ring.",
    sources: ["FIR 2291", "2310", "2402", "2455"],
    zcql:
      "SELECT p.full_name, ph.phone_id, COUNT(DISTINCT fp.fir_id) AS cases\nFROM case_persons cp JOIN persons p ON cp.person_id = p.person_id\nJOIN person_phones pp ON pp.person_id = p.person_id\nJOIN fir_phones fp ON fp.phone_id = pp.phone_id\nWHERE cp.role = 'accused'\nGROUP BY p.full_name, ph.phone_id ORDER BY cases DESC LIMIT 5",
    reasoning: [
      "Detected intent: criminal-network / link analysis",
      "Traversed accused → phone → FIR edges in the Data Store",
      "Found one phone shared across 4 chain-snatching FIRs",
      "Resolved owner Suresh M.; flagged organised ring",
    ],
  },
];

export default function Console() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewId>("network");
  const [turns, setTurns] = useState<AgentTurn[]>(INITIAL_TURNS);
  const [selected, setSelected] = useState<GraphNode>(
    nodeById(defaultSelectedId)!
  );
  const [lang, setLang] = useState<Lang>("en-IN");
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  const stopListenRef = useRef<(() => void) | null>(null);

  useEffect(() => setMicSupported(speechSupported()), []);

  // Deep-link a starting view via ?view=map|profiles|timeline|alerts|network
  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get("view");
    if (v && ["network", "map", "profiles", "timeline", "alerts"].includes(v)) {
      setView(v as ViewId);
    }
  }, []);

  const ask = useCallback(async (text: string) => {
    const q = text.trim();
    if (!q) return;
    setTurns((t) => [...t, { role: "user", text: q }]);
    setQuery("");
    const res = await askAgent(q);
    setTurns((t) => [
      ...t,
      {
        role: "agent",
        text: res.answer,
        sources: res.sources,
        zcql: res.zcql,
        reasoning: res.reasoning,
      },
    ]);
    if (res.view) setView(res.view);
    if (res.focusNodeId) {
      const n = nodeById(res.focusNodeId);
      if (n) setSelected(n);
    }
  }, []);

  function handleMic() {
    if (listening) {
      stopListenRef.current?.();
      setListening(false);
      return;
    }
    stopListenRef.current = listen(
      lang,
      (text) => {
        setQuery(text);
        ask(text);
      },
      setListening
    );
  }

  function handleSpeak(text: string) {
    stopSpeaking();
    speak(text, lang);
  }

  const neighbors = selected ? neighborsOf(selected.id) : [];

  function renderCenter() {
    switch (view) {
      case "map":
        return <MapPanel />;
      case "profiles":
        return (
          <ProfilesView
            focusId={selected?.id}
            onSelectOffender={(id) => {
              const n = nodeById(id);
              if (n) setSelected(n);
              setView("network");
            }}
          />
        );
      case "alerts":
        return <AlertsView />;
      case "timeline":
        return (
          <TimelineView
            onSelectOffender={(id) => {
              const n = nodeById(id);
              if (n) setSelected(n);
              setView("network");
            }}
          />
        );
      case "network":
      default:
        return (
          <NetworkGraph
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        );
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <CommandBar
        query={query}
        onQuery={setQuery}
        onSubmit={() => ask(query)}
        lang={lang}
        onToggleLang={() =>
          setLang((l) => (l === "en-IN" ? "kn-IN" : "en-IN"))
        }
        listening={listening}
        onMic={handleMic}
        micSupported={micSupported}
      />

      <div className="flex min-h-0 flex-1">
        <IconRail active={view} onSelect={setView} />
        <main className="min-w-0 flex-1">{renderCenter()}</main>
        <Inspector
          node={selected}
          neighbors={neighbors}
          onSelectNode={setSelected}
        />
      </div>

      <AgentLog turns={turns} onSample={ask} onSpeak={handleSpeak} />
    </div>
  );
}
