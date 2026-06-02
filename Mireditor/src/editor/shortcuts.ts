import { useEffect } from 'react';
import { useEditorStore } from './store/useEditorStore';
import { getActiveLayer, get2d } from './model/document';
import type { ToolId } from './model/types';

const TOOL_KEYS: Record<string, ToolId> = {
  v: 'move',
  m: 'marquee',
  l: 'lasso',
  b: 'brush',
  n: 'pencil',
  e: 'eraser',
  g: 'bucket',
  i: 'eyedropper',
  t: 'text',
  c: 'crop',
  u: 'shape',
  r: 'gradient',
  s: 'clone',
  z: 'zoom',
  h: 'hand',
};

function isTyping(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
}

/** Editör klavye kısayolları. */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const st = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      // Geri al / yinele
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        st.redo();
        return;
      }

      // Seçimi kaldır
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        st.setSelection(null);
        return;
      }

      // Tümünü seç
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (st.doc) st.setSelection({ x: 0, y: 0, width: st.doc.width, height: st.doc.height });
        return;
      }

      if (mod) return; // diğer mod kombinasyonlarını bırak

      // Seçimi/katmanı sil
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const layer = getActiveLayer(st.doc);
        const sel = st.selection;
        if (layer && !layer.locked && sel && sel.width > 0) {
          st.pushHistory('Sil');
          const ctx = get2d(layer.canvas);
          ctx.clearRect(sel.x - layer.x, sel.y - layer.y, sel.width, sel.height);
          st.bumpRender();
        }
        return;
      }

      // Renkleri değiştir
      if (e.key.toLowerCase() === 'x') {
        st.setToolOption({ primaryColor: st.toolOptions.secondaryColor, secondaryColor: st.toolOptions.primaryColor });
        return;
      }

      // Fırça boyutu
      if (e.key === '[') {
        st.setToolOption({ brushSize: Math.max(1, st.toolOptions.brushSize - 2) });
        return;
      }
      if (e.key === ']') {
        st.setToolOption({ brushSize: Math.min(500, st.toolOptions.brushSize + 2) });
        return;
      }

      // Araç seçimi
      const tool = TOOL_KEYS[e.key.toLowerCase()];
      if (tool) st.setActiveTool(tool);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
