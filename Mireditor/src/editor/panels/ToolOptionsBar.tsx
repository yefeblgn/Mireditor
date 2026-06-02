import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { TOOL_LABELS } from '../ui/icons';
import type { ShapeKind } from '../model/types';

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] text-[#666] uppercase tracking-wider whitespace-nowrap">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 accent-[#3b82f6]"
      />
      <span className="text-[10px] text-[#999] w-10 text-right font-mono">
        {value}
        {suffix}
      </span>
    </div>
  );
}

export function ToolOptionsBar() {
  const tool = useEditorStore((s) => s.activeTool);
  const o = useEditorStore((s) => s.toolOptions);
  const set = useEditorStore((s) => s.setToolOption);
  const selection = useEditorStore((s) => s.selection);
  const cropDocument = useEditorStore((s) => s.cropDocument);
  const setSelection = useEditorStore((s) => s.setSelection);

  const isPaint = tool === 'brush' || tool === 'pencil' || tool === 'eraser';

  return (
    <div className="h-10 bg-[#111] border-b border-[#1a1a1a] flex items-center px-4 gap-5 overflow-x-auto">
      <span className="text-[10px] text-[#888] font-bold uppercase tracking-[2px] whitespace-nowrap">
        {TOOL_LABELS[tool].replace(/\s*\(.*\)/, '')}
      </span>
      <div className="w-px h-4 bg-[#222]" />

      {isPaint && (
        <>
          <Slider label="Boyut" value={o.brushSize} min={1} max={400} suffix="px" onChange={(v) => set({ brushSize: v })} />
          <Slider
            label="Sertlik"
            value={Math.round(o.brushHardness * 100)}
            min={0}
            max={100}
            suffix="%"
            onChange={(v) => set({ brushHardness: v / 100 })}
          />
          {tool !== 'eraser' && (
            <Slider
              label="Opaklık"
              value={Math.round(o.brushOpacity * 100)}
              min={1}
              max={100}
              suffix="%"
              onChange={(v) => set({ brushOpacity: v / 100 })}
            />
          )}
        </>
      )}

      {tool === 'bucket' && (
        <Slider label="Tolerans" value={o.toleranceFill} min={0} max={128} onChange={(v) => set({ toleranceFill: v })} />
      )}

      {tool === 'shape' && (
        <>
          <div className="flex items-center gap-1">
            {(['rect', 'ellipse', 'line'] as ShapeKind[]).map((k) => (
              <button
                key={k}
                onClick={() => set({ shapeKind: k })}
                className={`px-2.5 py-1 rounded text-[10px] uppercase tracking-wider ${
                  o.shapeKind === k ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                }`}
              >
                {k === 'rect' ? 'Dikdörtgen' : k === 'ellipse' ? 'Elips' : 'Çizgi'}
              </button>
            ))}
          </div>
          {o.shapeKind !== 'line' && (
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={o.fillShape} onChange={(e) => set({ fillShape: e.target.checked })} className="accent-[#3b82f6]" />
              <span className="text-[10px] text-[#999] uppercase tracking-wider">Dolgu</span>
            </label>
          )}
          {(o.shapeKind === 'line' || !o.fillShape) && (
            <Slider label="Kalınlık" value={o.brushSize} min={1} max={100} suffix="px" onChange={(v) => set({ brushSize: v })} />
          )}
        </>
      )}

      {tool === 'text' && (
        <Slider label="Punto" value={o.fontSize} min={8} max={300} suffix="px" onChange={(v) => set({ fontSize: v })} />
      )}

      {tool === 'crop' && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#555]">Kırpılacak alanı seçin.</span>
          {selection && (
            <div className="flex items-center gap-1.5 ml-2">
              <button
                onClick={() => {
                  cropDocument(
                    Math.round(selection.x),
                    Math.round(selection.y),
                    Math.round(selection.width),
                    Math.round(selection.height)
                  );
                  setSelection(null);
                }}
                className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
              >
                Onayla (Enter)
              </button>
              <button
                onClick={() => setSelection(null)}
                className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
              >
                İptal (Esc)
              </button>
            </div>
          )}
        </div>
      )}

      {tool === 'transform' && (
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-[#555]">Görseli köşelerden boyutlandırıp döndürün (Oransız ölçek için Shift'e basın).</span>
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mireditor:apply-transform'));
              }}
              className="bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
            >
              Onayla (Enter)
            </button>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('mireditor:cancel-transform'));
              }}
              className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold px-2.5 py-1 rounded transition-colors uppercase tracking-wider"
            >
              İptal (Esc)
            </button>
          </div>
        </div>
      )}

      {(tool === 'clone' || tool === 'gradient') && (
        <span className="text-[10px] text-[#555]">
          {tool === 'clone' ? 'Alt+tık ile kaynak belirleyin' : 'Sürükleyerek gradyan çizin (Alt: saydam bitiş)'}
        </span>
      )}
    </div>
  );
}
