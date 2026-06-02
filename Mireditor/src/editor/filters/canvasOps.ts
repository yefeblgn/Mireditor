import { get2d } from '../model/document';

export interface Region {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Gauss bulanıklığı — yerleşik ctx.filter ile (GPU hızlandırmalı). */
export function gaussianBlur(canvas: HTMLCanvasElement, radius: number, region: Region): void {
  if (radius <= 0) return;
  const ctx = get2d(canvas);
  const tmp = document.createElement('canvas');
  tmp.width = region.w;
  tmp.height = region.h;
  const t = get2d(tmp);
  t.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, region.w, region.h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.clearRect(region.x, region.y, region.w, region.h);
  ctx.filter = `blur(${radius}px)`;
  ctx.drawImage(tmp, region.x, region.y);
  ctx.filter = 'none';
  ctx.restore();
}

/** 3x3 konvolüsyon ile keskinleştirme. amount 0..100 */
export function sharpen(canvas: HTMLCanvasElement, amount: number, region: Region): void {
  if (amount <= 0) return;
  const ctx = get2d(canvas);
  const a = amount / 100;
  const src = ctx.getImageData(region.x, region.y, region.w, region.h);
  const out = ctx.createImageData(region.w, region.h);
  const w = region.w;
  const h = region.h;
  const sd = src.data;
  const od = out.data;
  const center = 1 + 4 * a;
  const side = -a;
  const at = (x: number, y: number, c: number) => {
    const cx = Math.max(0, Math.min(w - 1, x));
    const cy = Math.max(0, Math.min(h - 1, y));
    return sd[(cy * w + cx) * 4 + c];
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const v =
          center * at(x, y, c) +
          side * (at(x - 1, y, c) + at(x + 1, y, c) + at(x, y - 1, c) + at(x, y + 1, c));
        od[i + c] = v < 0 ? 0 : v > 255 ? 255 : v;
      }
      od[i + 3] = sd[i + 3];
    }
  }
  ctx.putImageData(out, region.x, region.y);
}

/** Piksel mozaik. size >= 1 */
export function pixelate(canvas: HTMLCanvasElement, size: number, region: Region): void {
  if (size <= 1) return;
  const ctx = get2d(canvas);
  const sw = Math.max(1, Math.round(region.w / size));
  const sh = Math.max(1, Math.round(region.h / size));
  const tmp = document.createElement('canvas');
  tmp.width = sw;
  tmp.height = sh;
  const t = get2d(tmp);
  t.imageSmoothingEnabled = false;
  t.drawImage(canvas, region.x, region.y, region.w, region.h, 0, 0, sw, sh);
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(region.x, region.y, region.w, region.h);
  ctx.drawImage(tmp, 0, 0, sw, sh, region.x, region.y, region.w, region.h);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();
}

/** Vinyet — kenarları karartır. strength 0..100 */
export function vignette(canvas: HTMLCanvasElement, strength: number, region: Region): void {
  if (strength <= 0) return;
  const ctx = get2d(canvas);
  const cx = region.x + region.w / 2;
  const cy = region.y + region.h / 2;
  const r = Math.hypot(region.w, region.h) / 2;
  const grad = ctx.createRadialGradient(cx, cy, r * 0.45, cx, cy, r);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${strength / 100})`);
  ctx.save();
  ctx.beginPath();
  ctx.rect(region.x, region.y, region.w, region.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = grad;
  ctx.fillRect(region.x, region.y, region.w, region.h);
  ctx.restore();
}
