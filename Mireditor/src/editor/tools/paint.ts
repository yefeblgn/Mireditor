import { get2d, getActiveLayer } from '../model/document';
import { useEditorStore } from '../store/useEditorStore';
import { hexToRgb, hexToRgba } from '../utils/color';
import type { Tool, PointerInfo } from './types';

interface StrokeState {
  active: boolean;
  lastX: number;
  lastY: number;
}

function makeStroke(): StrokeState {
  return { active: false, lastX: 0, lastY: 0 };
}

/** Aktif katmanın 2D bağlamını, kilit/seçim kontrolüyle hazırlar. */
function beginPaint(): { ctx: CanvasRenderingContext2D } | null {
  const st = useEditorStore.getState();
  const layer = getActiveLayer(st.doc);
  if (!layer || layer.locked) return null;
  const ctx = get2d(layer.canvas);
  const sel = st.selection;
  if (sel) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(sel.x, sel.y, sel.width, sel.height);
    ctx.clip();
  } else {
    ctx.save();
  }
  return { ctx };
}

function endPaint(ctx: CanvasRenderingContext2D) {
  ctx.restore();
}

function stamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  hardness: number,
  color: string,
  erase: boolean
) {
  const r = Math.max(0.5, size / 2);
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  if (hardness >= 0.99) {
    ctx.fillStyle = erase ? 'rgba(0,0,0,1)' : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const inner = r * hardness;
    const grad = ctx.createRadialGradient(x, y, inner, x, y, r);
    if (erase) {
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, color);
      grad.addColorStop(1, hexToRgba(color, 0));
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** İki nokta arasında fırça izini interpole ederek sürekli çizgi oluşturur. */
function strokeLine(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  size: number,
  hardness: number,
  color: string,
  erase: boolean
) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const spacing = Math.max(1, size * 0.15);
  const steps = Math.max(1, Math.ceil(dist / spacing));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    stamp(ctx, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size, hardness, color, erase);
  }
}

function makePaintTool(id: 'brush' | 'pencil' | 'eraser'): Tool {
  const stroke = makeStroke();
  const erase = id === 'eraser';
  const hardOverride = id === 'pencil' ? 1 : null;

  return {
    id,
    cursor: 'crosshair',
    onDown(p: PointerInfo) {
      const st = useEditorStore.getState();
      const layer = getActiveLayer(st.doc);
      if (!layer || layer.locked) return;
      st.pushHistory(erase ? 'Silgi' : id === 'pencil' ? 'Kalem' : 'Fırça');
      const paint = beginPaint();
      if (!paint) return;
      const o = st.toolOptions;
      paint.ctx.globalAlpha = erase ? 1 : o.brushOpacity;
      stamp(paint.ctx, p.x, p.y, o.brushSize, hardOverride ?? o.brushHardness, o.primaryColor, erase);
      endPaint(paint.ctx);
      stroke.active = true;
      stroke.lastX = p.x;
      stroke.lastY = p.y;
      st.bumpRender();
    },
    onMove(p: PointerInfo) {
      if (!stroke.active) return;
      const st = useEditorStore.getState();
      const paint = beginPaint();
      if (!paint) return;
      const o = st.toolOptions;
      paint.ctx.globalAlpha = erase ? 1 : o.brushOpacity;
      strokeLine(paint.ctx, stroke.lastX, stroke.lastY, p.x, p.y, o.brushSize, hardOverride ?? o.brushHardness, o.primaryColor, erase);
      endPaint(paint.ctx);
      stroke.lastX = p.x;
      stroke.lastY = p.y;
      st.bumpRender();
    },
    onUp() {
      stroke.active = false;
    },
  };
}

export const brushTool = makePaintTool('brush');
export const pencilTool = makePaintTool('pencil');
export const eraserTool = makePaintTool('eraser');

// ─── Damlalık (Eyedropper) ───
export const eyedropperTool: Tool = {
  id: 'eyedropper',
  cursor: 'crosshair',
  onDown(p, env) {
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= env.composite.width || y >= env.composite.height) return;
    const data = get2d(env.composite).getImageData(x, y, 1, 1).data;
    const hex = `#${[data[0], data[1], data[2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
    useEditorStore.getState().setToolOption({ primaryColor: hex });
  },
};

// ─── Kova / Doldurma (Flood Fill) ───
export const bucketTool: Tool = {
  id: 'bucket',
  cursor: 'crosshair',
  onDown(p) {
    const st = useEditorStore.getState();
    const layer = getActiveLayer(st.doc);
    if (!layer || layer.locked) return;
    const x = Math.floor(p.x);
    const y = Math.floor(p.y);
    if (x < 0 || y < 0 || x >= layer.canvas.width || y >= layer.canvas.height) return;
    st.pushHistory('Doldur');
    floodFill(layer.canvas, x, y, st.toolOptions.primaryColor, st.toolOptions.toleranceFill);
    st.bumpRender();
  },
};

function floodFill(canvas: HTMLCanvasElement, sx: number, sy: number, hex: string, tolerance: number) {
  const ctx = get2d(canvas);
  const { width, height } = canvas;
  const img = ctx.getImageData(0, 0, width, height);
  const data = img.data;
  const idx = (x: number, y: number) => (y * width + x) * 4;
  const start = idx(sx, sy);
  const target = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  const fill = hexToRgb(hex);
  const tol = tolerance * tolerance * 4;

  const matches = (i: number) => {
    const dr = data[i] - target[0];
    const dg = data[i + 1] - target[1];
    const db = data[i + 2] - target[2];
    const da = data[i + 3] - target[3];
    return dr * dr + dg * dg + db * db + da * da <= tol;
  };

  // Aynı renge dolduruyorsa atla
  if (
    target[0] === fill.r &&
    target[1] === fill.g &&
    target[2] === fill.b &&
    target[3] === 255
  ) {
    return;
  }

  const stack: number[] = [sx, sy];
  const seen = new Uint8Array(width * height);

  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const flat = y * width + x;
    if (seen[flat]) continue;
    const i = flat * 4;
    if (!matches(i)) continue;
    seen[flat] = 1;
    data[i] = fill.r;
    data[i + 1] = fill.g;
    data[i + 2] = fill.b;
    data[i + 3] = 255;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  ctx.putImageData(img, 0, 0);
}
