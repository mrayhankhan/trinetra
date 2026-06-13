"use client";

import { Eye, Search, Mic, MicOff, CornerDownLeft } from "lucide-react";
import { LANG_LABEL, type Lang } from "@/lib/voice";

export default function CommandBar({
  query,
  onQuery,
  onSubmit,
  lang,
  onToggleLang,
  listening,
  onMic,
  micSupported,
}: {
  query: string;
  onQuery: (v: string) => void;
  onSubmit: () => void;
  lang: Lang;
  onToggleLang: () => void;
  listening: boolean;
  onMic: () => void;
  micSupported: boolean;
}) {
  return (
    <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-2.5">
      <div className="flex items-center gap-2 font-mono text-[13px] tracking-[2px] text-cyan">
        <Eye size={18} />
        TRINETRA
      </div>

      <form
        className="flex flex-1 items-center gap-2 rounded-md border border-line bg-well px-3 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <Search size={14} className="text-muted" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Ask in Kannada or English — e.g. who connects these chain-snatching cases?"
          className="flex-1 bg-transparent font-mono text-[12px] text-ink placeholder:text-dim focus:outline-none"
        />
        <span className="flex items-center gap-1 font-mono text-[10px] text-dim">
          <CornerDownLeft size={12} /> ask
        </span>
      </form>

      <button
        onClick={onToggleLang}
        title="Toggle language"
        className="rounded-md border border-line px-2 py-1.5 font-mono text-[11px] text-muted transition hover:text-cyan"
      >
        {LANG_LABEL[lang]}
      </button>

      <button
        onClick={onMic}
        aria-label="Voice query"
        title={micSupported ? "Voice query" : "Voice not supported in this browser"}
        disabled={!micSupported}
        className={
          "rounded-md border p-1.5 transition " +
          (listening
            ? "border-danger/50 bg-danger/10 text-dangerGlow"
            : "border-line text-cyan hover:text-ink disabled:text-dim")
        }
      >
        {listening ? <Mic size={16} /> : micSupported ? <Mic size={16} /> : <MicOff size={16} />}
      </button>

      <span className="rounded-md border border-cyan/30 bg-cyan/10 px-2 py-1 font-mono text-[11px] text-cyan">
        SP · Investigator
      </span>
    </header>
  );
}
