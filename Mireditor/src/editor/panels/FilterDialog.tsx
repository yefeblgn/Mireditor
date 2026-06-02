import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import type { FilterDef } from '../filters';
import { backupRegion, getActiveRegion, restoreRegion, type ActiveTarget } from '../filters/run';

export function FilterDialog({ filter, onClose }: { filter: FilterDef; onClose: () => void }) {
  const bumpRender = useEditorStore((s) => s.bumpRender);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const targetRef = useRef<ActiveTarget | null>(null);
  const backupRef = useRef<ImageData | null>(null);
  const initedRef = useRef(false);
  const [values, setValues] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    filter.params.forEach((p) => (v[p.key] = p.default));
    return v;
  });
  const [error, setError] = useState(false);

  // Aç: hedefi ve yedeği hazırla, ilk önizlemeyi uygula.
  // initedRef ile StrictMode'un çift effect çağrısına karşı korunur
  // (aksi halde yedek, önizlenmiş katmandan yeniden alınır ve bozulur).
  useEffect(() => {
    if (initedRef.current) return;
    initedRef.current = true;
    const t = getActiveRegion();
    if (!t) {
      setError(true);
      return;
    }
    targetRef.current = t;
    backupRef.current = backupRegion(t);
    preview(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const preview = (v: Record<string, number>) => {
    const t = targetRef.current;
    const b = backupRef.current;
    if (!t || !b) return;
    restoreRegion(t, b);
    filter.apply(t.canvas, t.region, v);
    bumpRender();
  };

  const onChange = (key: string, val: number) => {
    const v = { ...values, [key]: val };
    setValues(v);
    preview(v);
  };

  const handleApply = () => {
    const t = targetRef.current;
    const b = backupRef.current;
    if (t && b) {
      // Geçmişe filtre öncesi durumu yaz, sonra tekrar uygula
      restoreRegion(t, b);
      pushHistory(filter.label);
      filter.apply(t.canvas, t.region, values);
      bumpRender();
    }
    onClose();
  };

  const handleCancel = () => {
    const t = targetRef.current;
    const b = backupRef.current;
    if (t && b) {
      restoreRegion(t, b);
      bumpRender();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/50" onClick={handleCancel} />
      <div className="relative w-[360px] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        <div className="px-5 py-3.5 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold">{filter.label}</h2>
        </div>
        <div className="p-5 space-y-4">
          {error ? (
            <p className="text-[#888] text-xs">
              Uygulanabilir bir katman yok (katman kilitli olabilir).
            </p>
          ) : filter.params.length === 0 ? (
            <p className="text-[#888] text-xs">Bu efekt doğrudan uygulanacak.</p>
          ) : (
            filter.params.map((p) => (
              <div key={p.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-[#999] uppercase tracking-wider">{p.label}</span>
                  <span className="text-[11px] text-white font-mono">{values[p.key]}</span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step ?? 1}
                  value={values[p.key]}
                  onChange={(e) => onChange(p.key, Number(e.target.value))}
                  className="w-full accent-[#3b82f6]"
                />
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-[#222]">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 rounded-lg text-[11px] text-[#aaa] hover:text-white hover:bg-[#1d1d1d] uppercase tracking-wider"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            disabled={error}
            className="px-4 py-1.5 rounded-lg text-[11px] bg-[#3b82f6] text-white hover:bg-blue-600 disabled:bg-[#1a1a1a] disabled:text-[#444] uppercase tracking-wider font-semibold"
          >
            Uygula
          </button>
        </div>
      </div>
    </div>
  );
}
