import { useEffect } from 'react';
import { useEditorStore } from './store/useEditorStore';
import { getActiveLayer, get2d, getLayerIndex } from './model/document';
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

function hexToRgba(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b, 255];
}

/** Editör klavye kısayolları. */
export function useEditorShortcuts(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const st = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // ── Geri al / yinele ──────────────────────────────────────────────────
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) st.redo();
        else st.undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        st.redo();
        return;
      }
      // Ctrl+Alt+Z — adım adım geri al (PS compat, normal undo ile aynı)
      if (mod && e.altKey && key === 'z') {
        e.preventDefault();
        st.undo();
        return;
      }

      // ── Seçim ────────────────────────────────────────────────────────────
      if (mod && !e.shiftKey && key === 'd') {
        e.preventDefault();
        st.setSelection(null);
        return;
      }
      if (mod && !e.shiftKey && key === 'a') {
        e.preventDefault();
        if (st.doc) st.setSelection({ x: 0, y: 0, width: st.doc.width, height: st.doc.height });
        return;
      }
      // Ctrl+Shift+I — seçimi tersine çevir (basit dikdörtgen seçim için)
      if (mod && e.shiftKey && key === 'i') {
        e.preventDefault();
        // Tam belge seçiliyken kaldır, değilse tümü seç
        if (st.selection && st.doc &&
            st.selection.x === 0 && st.selection.y === 0 &&
            st.selection.width === st.doc.width && st.selection.height === st.doc.height) {
          st.setSelection(null);
        } else if (st.doc) {
          st.setSelection({ x: 0, y: 0, width: st.doc.width, height: st.doc.height });
        }
        return;
      }

      // ── Katman işlemleri ──────────────────────────────────────────────────
      // Ctrl+T — serbest dönüşüm
      if (mod && !e.shiftKey && key === 't') {
        e.preventDefault();
        st.setActiveTool('transform');
        return;
      }
      // Ctrl+J — katmanı çoğalt
      if (mod && !e.shiftKey && key === 'j') {
        e.preventDefault();
        if (st.doc?.activeLayerId) st.duplicateLayer(st.doc.activeLayerId);
        return;
      }
      // Ctrl+E — aşağıyla birleştir
      if (mod && !e.shiftKey && key === 'e') {
        e.preventDefault();
        if (st.doc?.activeLayerId) st.mergeDown(st.doc.activeLayerId);
        return;
      }
      // Ctrl+Shift+E — tüm katmanları birleştir
      if (mod && e.shiftKey && key === 'e') {
        e.preventDefault();
        st.flattenImage();
        return;
      }
      // Ctrl+] — katmanı yukarı taşı
      if (mod && e.key === ']') {
        e.preventDefault();
        if (st.doc?.activeLayerId) {
          const idx = getLayerIndex(st.doc, st.doc.activeLayerId);
          if (idx < st.doc.layers.length - 1) st.reorderLayer(st.doc.activeLayerId, idx + 1);
        }
        return;
      }
      // Ctrl+[ — katmanı aşağı taşı
      if (mod && e.key === '[') {
        e.preventDefault();
        if (st.doc?.activeLayerId) {
          const idx = getLayerIndex(st.doc, st.doc.activeLayerId);
          if (idx > 0) st.reorderLayer(st.doc.activeLayerId, idx - 1);
        }
        return;
      }
      // Ctrl+Shift+N — yeni katman
      if (mod && e.shiftKey && key === 'n') {
        e.preventDefault();
        st.addRasterLayer();
        return;
      }

      // ── Renk / Doldurma ──────────────────────────────────────────────────
      // Ctrl+I — renkleri ters çevir (aktif katman piksellerini tersine)
      if (mod && !e.shiftKey && key === 'i') {
        e.preventDefault();
        const layer = getActiveLayer(st.doc);
        if (layer && !layer.locked) {
          st.pushHistory('Renkleri Ters Çevir');
          const ctx = get2d(layer.canvas);
          const sel = st.selection;
          const x = sel?.x ?? 0, y = sel?.y ?? 0;
          const w = sel?.width ?? layer.canvas.width;
          const h = sel?.height ?? layer.canvas.height;
          const imgData = ctx.getImageData(x, y, w, h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i]   = 255 - d[i];
            d[i+1] = 255 - d[i+1];
            d[i+2] = 255 - d[i+2];
          }
          ctx.putImageData(imgData, x, y);
          st.bumpRender();
        }
        return;
      }
      // Alt+Del — ön plan rengiyle doldur
      if (e.altKey && e.key === 'Delete') {
        e.preventDefault();
        const layer = getActiveLayer(st.doc);
        if (layer && !layer.locked) {
          st.pushHistory('Ön Plan Rengi ile Doldur');
          const ctx = get2d(layer.canvas);
          const sel = st.selection;
          ctx.fillStyle = st.toolOptions.primaryColor;
          if (sel) ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
          else ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
          st.bumpRender();
        }
        return;
      }
      // Ctrl+Del — arka plan rengiyle doldur
      if (mod && e.key === 'Delete') {
        e.preventDefault();
        const layer = getActiveLayer(st.doc);
        if (layer && !layer.locked) {
          st.pushHistory('Arka Plan Rengi ile Doldur');
          const ctx = get2d(layer.canvas);
          const sel = st.selection;
          ctx.fillStyle = st.toolOptions.secondaryColor;
          if (sel) ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
          else ctx.fillRect(0, 0, layer.canvas.width, layer.canvas.height);
          st.bumpRender();
        }
        return;
      }

      // ── Panel Kısayolları ────────────────────────────────────────────────
      // F5 — Renk panelini aç
      if (e.key === 'F5') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mireditor:switch-tab', { detail: 'color' }));
        return;
      }
      // F7 — Katmanlar panelini aç
      if (e.key === 'F7') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('mireditor:switch-tab', { detail: 'layers' }));
        return;
      }

      // ── Kırpma Onayla / İptal ──────────────────────────────────────────────
      if (st.activeTool === 'crop' && st.selection) {
        if (e.key === 'Enter') {
          e.preventDefault();
          st.cropDocument(
            Math.round(st.selection.x),
            Math.round(st.selection.y),
            Math.round(st.selection.width),
            Math.round(st.selection.height)
          );
          st.setSelection(null);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          st.setSelection(null);
          return;
        }
      }

      // ── Serbest Dönüşüm Onayla / İptal ─────────────────────────────────────
      if (st.activeTool === 'transform') {
        if (e.key === 'Enter') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('mireditor:apply-transform'));
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('mireditor:cancel-transform'));
          return;
        }
      }

      if (mod) return;

      // ── Seçimi / katmanı sil ──────────────────────────────────────────────
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const layer = getActiveLayer(st.doc);
        const sel = st.selection;
        if (layer && !layer.locked) {
          if (sel && sel.width > 0) {
            st.pushHistory('Sil');
            const ctx = get2d(layer.canvas);
            ctx.clearRect(sel.x - layer.x, sel.y - layer.y, sel.width, sel.height);
            st.bumpRender();
          } else {
            st.removeLayer(layer.id);
          }
        }
        return;
      }

      // Renkleri değiştir
      if (key === 'x') {
        st.setToolOption({ primaryColor: st.toolOptions.secondaryColor, secondaryColor: st.toolOptions.primaryColor });
        return;
      }

      // Renkleri sıfırla
      if (key === 'd') {
        st.setToolOption({ primaryColor: '#000000', secondaryColor: '#ffffff' });
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
      const tool = TOOL_KEYS[key];
      if (tool) st.setActiveTool(tool);
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
