import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { DOCUMENT_PRESETS } from '../model/types';

export function NewDocumentDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const newDocument = useEditorStore((s) => s.newDocument);
  const [preset, setPreset] = useState(1);
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [dpi, setDpi] = useState(72);
  const [bg, setBg] = useState<'white' | 'transparent'>('white');
  const [name, setName] = useState('Adsız-1');

  const pickPreset = (i: number) => {
    setPreset(i);
    const p = DOCUMENT_PRESETS[i];
    if (i !== 0) {
      setWidth(p.width);
      setHeight(p.height);
      setDpi(p.dpi);
    }
  };

  const create = () => {
    newDocument({
      name: name.trim() || 'Adsız-1',
      width: Math.max(1, Math.min(8000, Math.round(width))),
      height: Math.max(1, Math.min(8000, Math.round(height))),
      dpi,
      background: bg,
    });
    onClose();
    onCreated?.();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-[440px] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        <div className="px-5 py-3.5 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold">Yeni Belge</h2>
        </div>
        <div className="p-5 space-y-4">
          <Field label="İsim">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#141414] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#3b82f6]"
            />
          </Field>

          <Field label="Hazır Şablon">
            <select
              value={preset}
              onChange={(e) => pickPreset(Number(e.target.value))}
              className="w-full bg-[#141414] border border-[#262626] rounded px-2.5 py-1.5 text-xs text-[#ccc] outline-none focus:border-[#3b82f6]"
            >
              {DOCUMENT_PRESETS.map((p, i) => (
                <option key={p.name} value={i}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Genişlik">
              <NumInput value={width} onChange={(v) => { setWidth(v); setPreset(0); }} />
            </Field>
            <Field label="Yükseklik">
              <NumInput value={height} onChange={(v) => { setHeight(v); setPreset(0); }} />
            </Field>
            <Field label="DPI">
              <NumInput value={dpi} onChange={setDpi} />
            </Field>
          </div>

          <Field label="Arkaplan">
            <div className="flex gap-2">
              {(['white', 'transparent'] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBg(b)}
                  className={`flex-1 py-1.5 rounded text-[10px] uppercase tracking-wider ${
                    bg === b ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'
                  }`}
                >
                  {b === 'white' ? 'Beyaz' : 'Saydam'}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#222]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-[11px] text-[#aaa] hover:text-white hover:bg-[#1d1d1d] uppercase tracking-wider"
          >
            İptal
          </button>
          <button
            onClick={create}
            className="px-4 py-1.5 rounded-lg text-[11px] bg-[#3b82f6] text-white hover:bg-blue-600 uppercase tracking-wider font-semibold"
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[9px] text-[#666] uppercase tracking-wider mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-xs text-white outline-none focus:border-[#3b82f6]"
    />
  );
}
