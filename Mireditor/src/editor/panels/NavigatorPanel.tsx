import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { flattenDocument, makeThumbnail } from '../render/Compositor';

export function NavigatorPanel() {
  const doc = useEditorStore((s) => s.doc);
  const renderVersion = useEditorStore((s) => s.renderVersion);
  const zoom = useEditorStore((s) => s.view.zoom);
  const setView = useEditorStore((s) => s.setView);
  const [thumb, setThumb] = useState<string>('');

  // Önizlemeyi debounce ile güncelle (büyük belgelerde performans için)
  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(() => {
      try {
        setThumb(makeThumbnail(flattenDocument(doc, '#1a1a1a'), 220, 130));
      } catch {
        /* yok say */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [doc, renderVersion]);

  if (!doc) return null;

  const changeZoom = (nz: number) => {
    const z1 = Math.max(0.02, Math.min(32, nz));
    const v = useEditorStore.getState().view;
    const panX = v.panX + (doc.width / 2) * (v.zoom - z1);
    const panY = v.panY + (doc.height / 2) * (v.zoom - z1);
    setView({ zoom: z1, panX, panY });
  };

  return (
    <div className="p-3">
      <div className="w-full h-28 bg-[#0a0a0a] border border-[#1f1f1f] rounded flex items-center justify-center overflow-hidden mb-2">
        {thumb ? (
          <img src={thumb} alt="preview" className="max-w-full max-h-full object-contain" draggable={false} />
        ) : (
          <span className="text-[#222] text-[10px]">ÖNİZLEME</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => changeZoom(zoom / 1.25)}
          className="w-6 h-6 rounded bg-[#141414] border border-[#262626] text-[#999] hover:text-white text-sm leading-none"
        >
          −
        </button>
        <input
          type="range"
          min={2}
          max={800}
          value={Math.round(zoom * 100)}
          onChange={(e) => changeZoom(Number(e.target.value) / 100)}
          className="flex-1 accent-[#3b82f6]"
        />
        <button
          onClick={() => changeZoom(zoom * 1.25)}
          className="w-6 h-6 rounded bg-[#141414] border border-[#262626] text-[#999] hover:text-white text-sm leading-none"
        >
          +
        </button>
      </div>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-[#888] font-mono">{Math.round(zoom * 100)}%</span>
        <div className="flex gap-1">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('mireditor:fit'))}
            className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[9px] text-[#999] hover:text-white uppercase tracking-wider"
          >
            Sığdır
          </button>
          <button
            onClick={() => changeZoom(1)}
            className="px-2 py-0.5 rounded bg-[#141414] border border-[#262626] text-[9px] text-[#999] hover:text-white uppercase tracking-wider"
          >
            %100
          </button>
        </div>
      </div>
    </div>
  );
}
