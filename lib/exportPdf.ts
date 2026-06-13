// Client-side conversation export — satisfies PS1's "save conversation history
// in PDF locally". Opens a print-ready window; the user picks "Save as PDF".
// No dependencies, works offline. (Production can also render server-side via
// Catalyst SmartBrowz.)

import type { AgentTurn } from "@/components/AgentLog";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function exportConversationPdf(turns: AgentTurn[]) {
  if (typeof window === "undefined") return;
  const when = new Date().toLocaleString("en-IN");

  const rows = turns
    .map((t) => {
      if (t.role === "user") {
        return `<div class="q"><span class="tag">QUERY</span> ${escapeHtml(
          t.text
        )}</div>`;
      }
      const src = t.sources?.length
        ? `<div class="src">Sources: ${t.sources
            .map(escapeHtml)
            .join(" · ")}</div>`
        : "";
      return `<div class="a"><span class="tag a-tag">TRINETRA</span> ${escapeHtml(
        t.text
      )}${src}</div>`;
    })
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>TRINETRA — Conversation Record</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color:#15202b; margin:40px; }
  header { border-bottom:2px solid #0d3b53; padding-bottom:10px; margin-bottom:20px; }
  h1 { font-size:18px; letter-spacing:2px; color:#0d3b53; margin:0; }
  .meta { font-size:12px; color:#5f6b78; margin-top:4px; }
  .q { margin:16px 0 6px; font-weight:600; }
  .a { margin:0 0 16px; padding-left:8px; border-left:3px solid #2f7fa0; }
  .tag { display:inline-block; font-size:10px; letter-spacing:1px; background:#e7eef3; color:#0d3b53; padding:2px 6px; border-radius:4px; margin-right:6px; }
  .a-tag { background:#0d3b53; color:#fff; }
  .src { font-size:11px; color:#5f6b78; margin-top:4px; }
  footer { margin-top:30px; font-size:10px; color:#8a96a3; border-top:1px solid #dde3e8; padding-top:8px; }
</style></head>
<body>
  <header>
    <h1>TRINETRA — CONVERSATION RECORD</h1>
    <div class="meta">Karnataka State Police · Crime Intelligence Console · Generated ${escapeHtml(
      when
    )}</div>
  </header>
  ${rows}
  <footer>Synthetic-data prototype · KSP Datathon 2026 · Every answer is grounded in cited records for audit and accountability.</footer>
  <script>window.onload = function(){ window.print(); }</script>
</body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}
