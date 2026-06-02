import React, { useState } from 'react';
import { FILTERS, type FilterDef } from '../filters';
import { FilterDialog } from './FilterDialog';

export function AdjustmentsPanel() {
  const [active, setActive] = useState<FilterDef | null>(null);
  const adjustments = FILTERS.filter((f) => f.group === 'adjust');
  const filters = FILTERS.filter((f) => f.group === 'filter');

  return (
    <div className="p-3 space-y-4">
      <Section title="Ayarlamalar" items={adjustments} onPick={setActive} />
      <Section title="Filtreler" items={filters} onPick={setActive} />
      {active && <FilterDialog filter={active} onClose={() => setActive(null)} />}
    </div>
  );
}

function Section({
  title,
  items,
  onPick,
}: {
  title: string;
  items: FilterDef[];
  onPick: (f: FilterDef) => void;
}) {
  return (
    <div>
      <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px] mb-2">{title}</h3>
      <div className="grid grid-cols-2 gap-1">
        {items.map((f) => (
          <button
            key={f.id}
            onClick={() => onPick(f)}
            className="text-left px-2.5 py-1.5 rounded bg-[#141414] border border-[#222] text-[10px] text-[#bbb] hover:text-white hover:border-[#3b82f6]/40 hover:bg-[#181818] transition-colors"
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}
