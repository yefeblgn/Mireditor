import React from 'react';
import type { ToolId } from '../model/types';

const s = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" {...s}>
      {children}
    </svg>
  );
}

export const ToolIcons: Record<ToolId, React.ReactNode> = {
  move: (
    <Svg>
      <path d="M12 3v18M3 12h18" />
      <path d="M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
    </Svg>
  ),
  marquee: (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="3 3" />
    </Svg>
  ),
  lasso: (
    <Svg>
      <path d="M4 11c0-4 4-7 8-7s8 3 8 7-4 7-8 7c-1.5 0-2.5 1-2.5 2.2 0 .9.7 1.3 1.5 1.3" />
      <circle cx="8" cy="20" r="1.4" />
    </Svg>
  ),
  brush: (
    <Svg>
      <path d="M15 4l5 5-9 9-5 1 1-5 8-8z" />
      <path d="M14 5l5 5" />
    </Svg>
  ),
  pencil: (
    <Svg>
      <path d="M4 20l3.5-.8L19 7.7a2 2 0 000-2.8l-1.1-1.1a2 2 0 00-2.8 0L3.8 15.5 4 20z" />
    </Svg>
  ),
  eraser: (
    <Svg>
      <path d="M3 16l6-6 8 8H9l-6-6z" />
      <path d="M9 10l5-5a2 2 0 012.8 0L20 8.2a2 2 0 010 2.8l-6 6" />
    </Svg>
  ),
  bucket: (
    <Svg>
      <path d="M5 11l6-6 7 7-6 6a2 2 0 01-2.8 0L5 13.8a2 2 0 010-2.8z" />
      <path d="M11 5L9 3" />
      <path d="M20 15c1.2 1.5 1.2 3.5 0 4" />
    </Svg>
  ),
  eyedropper: (
    <Svg>
      <path d="M4 20l1-3 9-9 3 3-9 9-4 0z" />
      <path d="M14 6l2-2a2 2 0 013 3l-2 2-3-3z" />
    </Svg>
  ),
  text: (
    <Svg>
      <path d="M5 6V4h14v2M12 4v16M8 20h8" />
    </Svg>
  ),
  crop: (
    <Svg>
      <path d="M6 2v16h16M2 6h16v16" />
    </Svg>
  ),
  shape: (
    <Svg>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
    </Svg>
  ),
  gradient: (
    <Svg>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M3 9h18M3 15h18" opacity="0.5" />
    </Svg>
  ),
  clone: (
    <Svg>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </Svg>
  ),
  zoom: (
    <Svg>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M11 8v6M8 11h6" />
    </Svg>
  ),
  hand: (
    <Svg>
      <path d="M8 13V6a1.5 1.5 0 013 0v5M11 11V4.5a1.5 1.5 0 013 0V11M14 11V6.5a1.5 1.5 0 013 0V13c0 4-2 7-6 7s-6-2-7-5l-1.5-3a1.5 1.5 0 012.5-1.6L11 13" />
    </Svg>
  ),
};

export const TOOL_LABELS: Record<ToolId, string> = {
  move: 'Taşı (V)',
  marquee: 'Dikdörtgen Seçim (M)',
  lasso: 'Kement (L)',
  brush: 'Fırça (B)',
  pencil: 'Kalem (N)',
  eraser: 'Silgi (E)',
  bucket: 'Kova (G)',
  eyedropper: 'Damlalık (I)',
  text: 'Metin (T)',
  crop: 'Kırpma (C)',
  shape: 'Şekil (U)',
  gradient: 'Gradyan (R)',
  clone: 'Klon Damgası (S)',
  zoom: 'Yakınlaştır (Z)',
  hand: 'El (H)',
};

// ── Panel / aksiyon ikonları ──
export const UI = {
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="14" height="14" viewBox="0 0 24 24" {...s}>
      <path d="M17.9 17.9A10 10 0 0112 20C5 20 1 12 1 12a18 18 0 015-5.9M9.9 4.2A9 9 0 0112 4c7 0 11 8 11 8a18 18 0 01-2.2 3.2M14 14a3 3 0 01-4-4" />
      <path d="M1 1l22 22" />
    </svg>
  ),
  add: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
    </svg>
  ),
  duplicate: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <rect x="9" y="9" width="11" height="11" rx="1.5" />
      <path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1" />
    </svg>
  ),
  group: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M3 7a2 2 0 012-2h3l2 2h9a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  ),
  merge: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M12 3v12M8 11l4 4 4-4M5 21h14" />
    </svg>
  ),
  lock: (
    <svg width="13" height="13" viewBox="0 0 24 24" {...s}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  undo: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M9 14L4 9l5-5M4 9h11a5 5 0 015 5v1" />
    </svg>
  ),
  redo: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M15 14l5-5-5-5M20 9H9a5 5 0 00-5 5v1" />
    </svg>
  ),
  sparkles: (
    <svg width="15" height="15" viewBox="0 0 24 24" {...s}>
      <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
      <path d="M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14z" />
    </svg>
  ),
};
