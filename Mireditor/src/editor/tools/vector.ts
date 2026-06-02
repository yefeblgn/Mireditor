import { createLayer, get2d, getActiveLayer } from '../model/document';
import { useEditorStore } from '../store/useEditorStore';
import { hexToRgba } from '../utils/color';
import { defaultTextData, renderTextLayer } from '../render/text';
import type { Tool, PointerInfo } from './types';

// ─── Aktif katman piksellerini yedekle / geri yükle (canlı önizleme için) ───
interface DragBackup {
  active: boolean;
  startX: number;
  startY: number;
  backup: ImageData | null;
  layerId: string | null;
}

function makeDrag(): DragBackup {
  return { active: false, startX: 0, startY: 0, backup: null, layerId: null };
}

function snapshotLayer(d: DragBackup): CanvasRenderingContext2D | null {
  const st = useEditorStore.getState();
  const layer = getActiveLayer(st.doc);
  if (!layer || layer.locked) return null;
  const ctx = get2d(layer.canvas);
  d.backup = ctx.getImageData(0, 0, layer.canvas.width, layer.canvas.height);
  d.layerId = layer.id;
  return ctx;
}

function restoreLayer(d: DragBackup): CanvasRenderingContext2D | null {
  const st = useEditorStore.getState();
  const layer = getActiveLayer(st.doc);
  if (!layer || !d.backup) return null;
  const ctx = get2d(layer.canvas);
  ctx.putImageData(d.backup, 0, 0);
  return ctx;
}

// ─── Şekil aracı (rect / ellipse / line) ───
const shapeDrag = makeDrag();

export const shapeTool: Tool = {
  id: 'shape',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    const st = useEditorStore.getState();
    st.pushHistory('Şekil');
    if (snapshotLayer(shapeDrag)) {
      shapeDrag.active = true;
      shapeDrag.startX = p.x;
      shapeDrag.startY = p.y;
    }
  },
  onMove(p: PointerInfo) {
    if (!shapeDrag.active) return;
    const ctx = restoreLayer(shapeDrag);
    if (!ctx) return;
    const st = useEditorStore.getState();
    const o = st.toolOptions;
    drawShape(ctx, shapeDrag.startX, shapeDrag.startY, p.x, p.y, o.shapeKind, o.primaryColor, o.fillShape, o.brushSize, p.shiftKey);
    st.bumpRender();
  },
  onUp() {
    shapeDrag.active = false;
    shapeDrag.backup = null;
  },
};

function drawShape(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  kind: 'rect' | 'ellipse' | 'line',
  color: string,
  fill: boolean,
  stroke: number,
  constrain: boolean
) {
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, stroke / 4);
  ctx.lineCap = 'round';

  let w = x1 - x0;
  let h = y1 - y0;
  if (constrain && kind !== 'line') {
    const s = Math.max(Math.abs(w), Math.abs(h));
    w = Math.sign(w || 1) * s;
    h = Math.sign(h || 1) * s;
  }

  if (kind === 'rect') {
    if (fill) ctx.fillRect(x0, y0, w, h);
    else ctx.strokeRect(x0, y0, w, h);
  } else if (kind === 'ellipse') {
    ctx.beginPath();
    ctx.ellipse(x0 + w / 2, y0 + h / 2, Math.abs(w / 2), Math.abs(h / 2), 0, 0, Math.PI * 2);
    if (fill) ctx.fill();
    else ctx.stroke();
  } else {
    let ex = x1;
    let ey = y1;
    if (constrain) {
      const angle = Math.atan2(y1 - y0, x1 - x0);
      const snapped = (Math.round(angle / (Math.PI / 4)) * Math.PI) / 4;
      const len = Math.hypot(x1 - x0, y1 - y0);
      ex = x0 + Math.cos(snapped) * len;
      ey = y0 + Math.sin(snapped) * len;
    }
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }
}

// ─── Gradyan (Gradient) aracı ───
const gradDrag = makeDrag();

export const gradientTool: Tool = {
  id: 'gradient',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    const st = useEditorStore.getState();
    st.pushHistory('Gradyan');
    if (snapshotLayer(gradDrag)) {
      gradDrag.active = true;
      gradDrag.startX = p.x;
      gradDrag.startY = p.y;
    }
  },
  onMove(p: PointerInfo) {
    if (!gradDrag.active) return;
    const ctx = restoreLayer(gradDrag);
    if (!ctx) return;
    const st = useEditorStore.getState();
    const o = st.toolOptions;
    const sel = st.selection;
    const grad = ctx.createLinearGradient(gradDrag.startX, gradDrag.startY, p.x, p.y);
    grad.addColorStop(0, o.primaryColor);
    grad.addColorStop(1, p.altKey ? hexToRgba(o.primaryColor, 0) : o.secondaryColor);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = grad;
    if (sel) ctx.fillRect(sel.x, sel.y, sel.width, sel.height);
    else ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    st.bumpRender();
  },
  onUp() {
    gradDrag.active = false;
    gradDrag.backup = null;
  },
};

// ─── Metin aracı ───
export const textTool: Tool = {
  id: 'text',
  cursor: 'text',
  onDown(p: PointerInfo) {
    const st = useEditorStore.getState();
    const doc = st.doc;
    if (!doc) return;
    const o = st.toolOptions;
    
    const layer = createLayer({ name: 'Metin', type: 'text', width: doc.width, height: doc.height });
    layer.text = defaultTextData(o.primaryColor, o.fontFamily, o.fontSize);
    
    layer.x = Math.round(p.x);
    layer.y = Math.round(p.y);
    renderTextLayer(layer);
    st.pushHistory('Metin ekle');
    st.addLayer(layer, true);
  },
};

// ─── Kırpma (Crop) aracı ───
const cropDrag = { active: false, startX: 0, startY: 0 };

export const cropTool: Tool = {
  id: 'crop',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    cropDrag.active = true;
    cropDrag.startX = p.x;
    cropDrag.startY = p.y;
    useEditorStore.getState().setSelection({ x: p.x, y: p.y, width: 0, height: 0 });
  },
  onMove(p: PointerInfo) {
    if (!cropDrag.active) return;
    const x = Math.min(cropDrag.startX, p.x);
    const y = Math.min(cropDrag.startY, p.y);
    useEditorStore.getState().setSelection({
      x,
      y,
      width: Math.abs(p.x - cropDrag.startX),
      height: Math.abs(p.y - cropDrag.startY),
    });
  },
  onUp(p: PointerInfo) {
    cropDrag.active = false;
    const st = useEditorStore.getState();
    const sel = st.selection;
    if (sel && (sel.width < 5 || sel.height < 5)) {
      st.setSelection(null);
    }
  },
};

// ─── Klon damgası (Clone stamp) ───
const cloneState = { active: false, hasSource: false, srcX: 0, srcY: 0, offX: 0, offY: 0 };

export const cloneTool: Tool = {
  id: 'clone',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    const st = useEditorStore.getState();
    if (p.altKey || !cloneState.hasSource) {
      cloneState.srcX = p.x;
      cloneState.srcY = p.y;
      cloneState.hasSource = true;
      return;
    }
    const layer = getActiveLayer(st.doc);
    if (!layer || layer.locked) return;
    st.pushHistory('Klonla');
    cloneState.offX = p.x - cloneState.srcX;
    cloneState.offY = p.y - cloneState.srcY;
    cloneState.active = true;
    cloneStamp(p.x, p.y);
    st.bumpRender();
  },
  onMove(p: PointerInfo) {
    if (!cloneState.active) return;
    cloneStamp(p.x, p.y);
    useEditorStore.getState().bumpRender();
  },
  onUp() {
    cloneState.active = false;
  },
};

function cloneStamp(x: number, y: number) {
  const st = useEditorStore.getState();
  const layer = getActiveLayer(st.doc);
  if (!layer) return;
  const r = st.toolOptions.brushSize / 2;
  const ctx = get2d(layer.canvas);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  // Kaynak (x-offX, y-offY) pikseli hedef (x, y) noktasına gelmeli → ofset = (offX, offY)
  ctx.drawImage(layer.canvas, cloneState.offX, cloneState.offY);
  ctx.restore();
}

// ─── Kement (Lasso) — basitleştirilmiş: serbest yolun sınırlayıcı kutusu ───
const lassoState = { active: false, minX: 0, minY: 0, maxX: 0, maxY: 0 };

export const lassoTool: Tool = {
  id: 'lasso',
  cursor: 'crosshair',
  onDown(p: PointerInfo) {
    lassoState.active = true;
    lassoState.minX = p.x;
    lassoState.minY = p.y;
    lassoState.maxX = p.x;
    lassoState.maxY = p.y;
  },
  onMove(p: PointerInfo) {
    if (!lassoState.active) return;
    lassoState.minX = Math.min(lassoState.minX, p.x);
    lassoState.minY = Math.min(lassoState.minY, p.y);
    lassoState.maxX = Math.max(lassoState.maxX, p.x);
    lassoState.maxY = Math.max(lassoState.maxY, p.y);
    useEditorStore.getState().setSelection({
      x: lassoState.minX,
      y: lassoState.minY,
      width: lassoState.maxX - lassoState.minX,
      height: lassoState.maxY - lassoState.minY,
    });
  },
  onUp() {
    lassoState.active = false;
  },
};
