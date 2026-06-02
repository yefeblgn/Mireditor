import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { UI } from '../ui/icons';

export function HistoryPanel() {
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  const jumpBack = (steps: number) => {
    for (let i = 0; i < steps; i++) undo();
  };
  const jumpForward = (steps: number) => {
    for (let i = 0; i < steps; i++) redo();
  };

  const n = past.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a1a]">
        <span className="text-[9px] text-[#666] font-bold uppercase tracking-[2px]">Geçmiş</span>
        <div className="flex gap-1">
          <button
            onClick={() => undo()}
            disabled={n === 0}
            className={`p-1 rounded ${n === 0 ? 'text-[#2a2a2a]' : 'text-[#888] hover:text-white hover:bg-[#1d1d1d]'}`}
            title="Geri Al (Ctrl+Z)"
          >
            {UI.undo}
          </button>
          <button
            onClick={() => redo()}
            disabled={future.length === 0}
            className={`p-1 rounded ${future.length === 0 ? 'text-[#2a2a2a]' : 'text-[#888] hover:text-white hover:bg-[#1d1d1d]'}`}
            title="Yinele (Ctrl+Shift+Z)"
          >
            {UI.redo}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 text-[11px]">
        <Row label="Başlangıç" muted onClick={() => jumpBack(n)} />
        {past.map((snap, i) => (
          <Row key={`p${i}`} label={snap.label} onClick={() => jumpBack(n - 1 - i)} />
        ))}
        <Row label="Şu an" current />
        {future.map((snap, i) => (
          <Row key={`f${i}`} label={snap.label} faded onClick={() => jumpForward(i + 1)} />
        ))}
      </div>
    </div>
  );
}

function Row({
  label,
  current,
  faded,
  muted,
  onClick,
}: {
  label: string;
  current?: boolean;
  faded?: boolean;
  muted?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={current}
      className={`w-full text-left px-2.5 py-1.5 rounded transition-colors ${
        current
          ? 'bg-[#1d2a44] text-white border border-[#3b82f6]/40'
          : faded
          ? 'text-[#555] hover:bg-[#161616]'
          : muted
          ? 'text-[#666] hover:bg-[#161616]'
          : 'text-[#bbb] hover:bg-[#161616]'
      }`}
    >
      {label}
    </button>
  );
}
