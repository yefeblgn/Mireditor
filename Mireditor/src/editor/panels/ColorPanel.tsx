import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from '../utils/color';

const SWATCHES = [
  '#000000', '#ffffff', '#7f7f7f', '#c3c3c3',
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#6366f1', '#a855f7',
  '#ec4899', '#92400e', '#0ea5e9', '#84cc16',
];

export function ColorPanel() {
  const options = useEditorStore((s) => s.toolOptions);
  const setToolOption = useEditorStore((s) => s.setToolOption);
  const [target, setTarget] = useState<'primary' | 'secondary'>('primary');
  const svRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const which = (e as CustomEvent).detail?.which;
      if (which === 'primary' || which === 'secondary') setTarget(which);
    };
    window.addEventListener('mireditor:color-click', handler);
    return () => window.removeEventListener('mireditor:color-click', handler);
  }, []);
  const hueRef = useRef<HTMLDivElement>(null);

  const current = target === 'primary' ? options.primaryColor : options.secondaryColor;
  const { r, g, b } = hexToRgb(current);
  const hsv = rgbToHsv(r, g, b);

  const setColor = (hex: string) => {
    setToolOption(target === 'primary' ? { primaryColor: hex } : { secondaryColor: hex });
  };

  const updateFromHsv = (h: number, sv: number, v: number) => {
    const rgb = hsvToRgb(h, sv, v);
    setColor(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const handleSV = (e: React.PointerEvent) => {
    const el = svRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (clientX: number, clientY: number) => {
      const s = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const v = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
      updateFromHsv(hsv.h, s, v);
    };
    move(e.clientX, e.clientY);
    const onMove = (ev: PointerEvent) => move(ev.clientX, ev.clientY);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const handleHue = (e: React.PointerEvent) => {
    const el = hueRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    const move = (clientX: number) => {
      const h = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * 360;
      updateFromHsv(h, hsv.s, hsv.v);
    };
    move(e.clientX);
    const onMove = (ev: PointerEvent) => move(ev.clientX);
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const hueColor = (() => {
    const rgb = hsvToRgb(hsv.h, 1, 1);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
  })();

  return (
    <div className="p-3 space-y-3">
      {/* Primary / Secondary */}
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <button
            onClick={() => setTarget('secondary')}
            className={`absolute right-0 bottom-0 w-7 h-7 rounded border-2 ${target === 'secondary' ? 'border-[#3b82f6] z-10' : 'border-[#333]'}`}
            style={{ background: options.secondaryColor }}
            title="İkincil renk"
          />
          <button
            onClick={() => setTarget('primary')}
            className={`absolute left-0 top-0 w-7 h-7 rounded border-2 ${target === 'primary' ? 'border-[#3b82f6] z-10' : 'border-[#333]'}`}
            style={{ background: options.primaryColor }}
            title="Birincil renk"
          />
        </div>
        <button
          onClick={() => setToolOption({ primaryColor: options.secondaryColor, secondaryColor: options.primaryColor })}
          className="text-[9px] text-[#666] hover:text-white uppercase tracking-wider"
          title="Renkleri değiştir (X)"
        >
          ⇄ Değiştir
        </button>
      </div>

      {/* SV kare */}
      <div
        ref={svRef}
        onPointerDown={handleSV}
        className="relative w-full h-28 rounded cursor-crosshair select-none"
        style={{ background: hueColor }}
      >
        <div className="absolute inset-0 rounded" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="absolute inset-0 rounded" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
        <div
          className="absolute w-3 h-3 rounded-full border-2 border-white shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%` }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onPointerDown={handleHue}
        className="relative w-full h-3 rounded cursor-pointer select-none"
        style={{ background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
      >
        <div
          className="absolute top-1/2 w-2 h-4 rounded-sm border-2 border-white -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%` }}
        />
      </div>

      {/* Hex */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-[#666] uppercase">Hex</span>
        <input
          value={current}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#?[0-9a-fA-F]{0,6}$/.test(v)) {
              const hex = v.startsWith('#') ? v : '#' + v;
              if (/^#[0-9a-fA-F]{6}$/.test(hex)) setColor(hex);
            }
          }}
          className="flex-1 bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[11px] text-white outline-none focus:border-[#3b82f6]"
        />
      </div>

      {/* Swatches */}
      <div className="grid grid-cols-8 gap-1">
        {SWATCHES.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-full aspect-square rounded border border-[#2a2a2a] hover:scale-110 transition-transform"
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}
