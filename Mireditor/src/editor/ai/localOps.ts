import { createLayerCanvas, get2d } from '../model/document';
import type { Layer, MirDocument } from '../model/types';

/**
 * Çevrimdışı arkaplan kaldırma (sezgisel): kenarlardan başlayarak,
 * köşe rengine benzeyen bağlantılı pikselleri saydamlaştırır.
 * Düz/tek renkli arkaplanlarda iyi çalışır.
 */
export function removeBackgroundLocal(canvas: HTMLCanvasElement, tolerance = 40): void {
  const ctx = get2d(canvas);
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;

  const corner = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const cs = [corner(0, 0), corner(w - 1, 0), corner(0, h - 1), corner(w - 1, h - 1)];
  const ref = [0, 1, 2].map((k) => (cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4);
  const tol = tolerance * tolerance * 3;

  const matches = (i: number) => {
    const dr = d[i] - ref[0];
    const dg = d[i + 1] - ref[1];
    const db = d[i + 2] - ref[2];
    return dr * dr + dg * dg + db * db <= tol && d[i + 3] > 0;
  };

  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let x = 0; x < w; x++) {
    stack.push(x, 0, x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    stack.push(0, y, w - 1, y);
  }

  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    const flat = y * w + x;
    if (visited[flat]) continue;
    visited[flat] = 1;
    const i = flat * 4;
    if (!matches(i)) continue;
    d[i + 3] = 0; // saydam yap
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  ctx.putImageData(img, 0, 0);
}

/** Belgeyi (tüm katmanları) verilen katsayıyla büyütür — yerel "enhance". */
export function upscaleDocument(doc: MirDocument, factor: number): MirDocument {
  const maxDim = 8000;
  const f = Math.min(factor, maxDim / doc.width, maxDim / doc.height);
  const nw = Math.round(doc.width * f);
  const nh = Math.round(doc.height * f);

  const layers: Layer[] = doc.layers.map((l) => {
    const c = createLayerCanvas(nw, nh);
    const ctx = get2d(c);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(l.canvas, 0, 0, l.canvas.width, l.canvas.height, 0, 0, nw, nh);
    return { ...l, canvas: c, x: Math.round(l.x * f), y: Math.round(l.y * f) };
  });

  return { ...doc, width: nw, height: nh, layers };
}
