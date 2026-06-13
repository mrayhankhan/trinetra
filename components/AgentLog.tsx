"use client";

import { useEffect, useRef } from "react";
import { Eye, FileDown, Volume2, ChevronRight } from "lucide-react";
import { exportConversationPdf } from "@/lib/exportPdf";
import { SAMPLE_QUERIES } from "@/lib/agent";

export interface AgentTurn {
  role: "user" | "agent";
  text: string;
  sources?: string[];
  zcql?: string;
  reasoning?: string[];
}

export default function AgentLog({
  turns,
  onSample,
  onSpeak,
}: {
  turns: AgentTurn[];
  onSample: (q: string) => void;
  onSpeak: (text: string) => void;
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  const lastAgent = [...turns].reverse().find((t) => t.role === "agent");

  return (
    <div className="flex flex-col border-t border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line/60 px-4 py-1.5">
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_QUERIES.map((q) => (
            <button
              key={q}
              onClick={() => onSample(q)}
              className="rounded border border-line px-2 py-0.5 font-mono text-[10px] text-dim transition hover:border-line2 hover:text-cyan"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {lastAgent && (
            <button
              onClick={() => onSpeak(lastAgent.text)}
              title="Read answer aloud"
              className="flex items-center gap-1 font-mono text-[10px] text-dim transition hover:text-cyan"
            >
              <Volume2 size={12} /> speak
            </button>
          )}
          <button
            onClick={() => exportConversationPdf(turns)}
            title="Export conversation as PDF"
            className="flex items-center gap-1 font-mono text-[10px] text-cyan transition hover:text-ink"
          >
            <FileDown size={12} /> export PDF
          </button>
        </div>
      </div>

      <div className="max-h-[150px] overflow-y-auto px-4 py-2.5 text-[12px] leading-relaxed">
        {turns.map((t, i) => (
          <div key={i} className="mb-2 last:mb-0">
            {t.role === "user" ? (
              <div className="font-mono text-[11px] text-cyan">
                <span className="text-dim">›</span> {t.text}
              </div>
            ) : (
              <div className="flex gap-2">
                <Eye size={14} className="mt-0.5 shrink-0 text-cyan" />
                <div className="min-w-0 text-ink">
                  {t.text}
                  {t.sources && t.sources.length > 0 && (
                    <div className="mt-0.5 font-mono text-[10px] text-dim">
                      SOURCES: {t.sources.join(" · ")}
                    </div>
                  )}
                  {(t.zcql || t.reasoning) && (
                    <details className="mt-1 group">
                      <summary className="cursor-pointer list-none font-mono text-[10px] text-cyan/80 transition hover:text-cyan">
                        <ChevronRight
                          size={11}
                          className="-mt-0.5 mr-0.5 inline transition group-open:rotate-90"
                        />
                        view query &amp; reasoning
                      </summary>
                      <div className="mt-1.5 space-y-1.5 border-l border-line pl-2.5">
                        {t.reasoning && (
                          <ol className="space-y-0.5">
                            {t.reasoning.map((r, j) => (
                              <li key={j} className="font-mono text-[10px] text-muted">
                                <span className="text-dim">{j + 1}.</span> {r}
                              </li>
                            ))}
                          </ol>
                        )}
                        {t.zcql && (
                          <pre className="overflow-x-auto whitespace-pre rounded bg-well px-2 py-1.5 font-mono text-[10px] leading-relaxed text-cyan/90">
{t.zcql}
                          </pre>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
