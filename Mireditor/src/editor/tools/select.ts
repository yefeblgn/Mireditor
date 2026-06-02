import { getActiveLayer } from '../model/document';
import { useEditorStore } from '../store/useEditorStore';
import type { Tool, PointerInfo } from './types';

// ─── Taşıma (Move) — aktif katmanı sürükler ───
const moveState = { active: false };

export const moveTool: Tool = {
  id: 'move',
  cursor: 'move',
  onDown(_p: PointerInfo) {
    const st = useEditorStore.getState();
    const layer = getActiveLayer(st.doc);
    if (!layer || layer.locked) return;
    st.pushHistory('Taşı');
    moveState.active = true;
  },
  onMove(p: PointerInfo) {
    if (!moveState.active) return;
    const st = useEditorStore.getState();
    const doc = st.doc;
    if (!doc) return;
    const layer = getActiveLayer(doc);
    if (!layer) return;
    const layers = doc.layers.map((l) =>
      l.id === layer.id ? { ...l, x: l.x + p.dx, y: l.y + p.dy } : l
    );
    useEditorStore.setState({ doc: { ...doc, layers }, renderVersion: st.renderVersion + 1, dirty: true });
  },
  onUp() {
    moveState.active = false;
  },
};

// ─── Dikdörtgen Seçim (Marquee) ───
const marqueeState = { active: false, startX: 0, startY: 0 };

export const marqueeTool: Tool = {
  id: 'marquee',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    marqueeState.active = true;
    marqueeState.startX = p.x;
    marqueeState.startY = p.y;
    useEditorStore.getState().setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
  },
  onMove(p: PointerInfo) {
    if (!marqueeState.active) return;
    const x = Math.min(marqueeState.startX, p.x);
    const y = Math.min(marqueeState.startY, p.y);
    const width = Math.abs(p.x - marqueeState.startX);
    const height = Math.abs(p.y - marqueeState.startY);
    useEditorStore.getState().setSelection({ x, y, width, height });
  },
  onUp(p: PointerInfo) {
    marqueeState.active = false;
    const width = Math.abs(p.x - marqueeState.startX);
    const height = Math.abs(p.y - marqueeState.startY);
    // Çok küçük sürükleme = seçimi temizle
    if (width < 3 || height < 3) {
      useEditorStore.getState().setSelection(null);
    }
  },
};

// Görünüm araçları (hand/zoom) viewport tarafından işlenir — kayıt için boş tanım.
export const handTool: Tool = { id: 'hand', cursor: 'grab' };
export const zoomTool: Tool = { id: 'zoom', cursor: 'zoom-in' };
