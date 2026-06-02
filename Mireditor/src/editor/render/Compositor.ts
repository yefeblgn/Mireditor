import { blendToComposite, type MirDocument } from '../model/types';
import { get2d } from '../model/document';

/** Şeffaflık için satranç-tahtası deseni (cache'lenir). */
let checkerPattern: CanvasPattern | null = null;
let checkerKey = '';

export function getCheckerPattern(
  ctx: CanvasRenderingContext2D,
  size = 8,
  light = '#2a2a2a',
  dark = '#1f1f1f'
): CanvasPattern | null {
  const key = `${size}-${light}-${dark}`;
  if (checkerPattern && checkerKey === key) return checkerPattern;

  const tile = document.createElement('canvas');
  tile.width = size * 2;
  tile.height = size * 2;
  const t = get2d(tile);
  t.fillStyle = dark;
  t.fillRect(0, 0, size * 2, size * 2);
  t.fillStyle = light;
  t.fillRect(0, 0, size, size);
  t.fillRect(size, size, size, size);

  checkerPattern = ctx.createPattern(tile, 'repeat');
  checkerKey = key;
  return checkerPattern;
}

/**
 * Belgenin tüm görünür katmanlarını hedef canvas'a (belge çözünürlüğünde)
 * blend modu + opaklık ile birleştirir.
 */
export function compositeDocument(doc: MirDocument, dest: HTMLCanvasElement): void {
  if (dest.width !== doc.width) dest.width = doc.width;
  if (dest.height !== doc.height) dest.height = doc.height;

  const ctx = get2d(dest);
  ctx.clearRect(0, 0, dest.width, dest.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    ctx.globalCompositeOperation = blendToComposite(layer.blendMode);
    ctx.drawImage(layer.canvas, layer.x, layer.y);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Tek seferlik düz (flatten) kompozit — export için.
 * Arkaplanı opsiyonel olarak doldurur (JPG gibi şeffaflık desteklemeyen formatlar için).
 */
export function flattenDocument(doc: MirDocument, background?: string): HTMLCanvasElement {
  const out = document.createElement('canvas');
  out.width = doc.width;
  out.height = doc.height;
  const ctx = get2d(out);

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, out.width, out.height);
  }

  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    ctx.globalCompositeOperation = blendToComposite(layer.blendMode);
    ctx.drawImage(layer.canvas, layer.x, layer.y);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return out;
}

/** Küçük önizleme (thumbnail) üretir — Layers/Navigator panelleri için. */
export function makeThumbnail(
  source: HTMLCanvasElement,
  maxW: number,
  maxH: number
): string {
  const ratio = Math.min(maxW / source.width, maxH / source.height, 1);
  const w = Math.max(1, Math.round(source.width * ratio));
  const h = Math.max(1, Math.round(source.height * ratio));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = get2d(c);
  ctx.drawImage(source, 0, 0, w, h);
  return c.toDataURL('image/png');
}
