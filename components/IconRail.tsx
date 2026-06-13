"use client";

import { RAIL_ITEMS, type ViewId } from "@/lib/views";

export default function IconRail({
  active,
  onSelect,
}: {
  active: ViewId;
  onSelect: (id: ViewId) => void;
}) {
  return (
    <nav className="flex flex-col gap-1 border-r border-line bg-panel px-1.5 py-2.5">
      {RAIL_ITEMS.map(({ id, icon: Icon, label }) => {
        const on = active === id;
        return (
          <button
            key={id}
            aria-label={label}
            title={label}
            onClick={() => onSelect(id)}
            className={
              "rounded-md p-2 transition " +
              (on ? "bg-cyan/10 text-cyan" : "text-dim hover:text-muted")
            }
          >
            <Icon size={18} />
          </button>
        );
      })}
    </nav>
  );
}
