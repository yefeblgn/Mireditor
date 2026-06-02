import { get2d } from '../model/document';
import type { Region } from './canvasOps';
import { gaussianBlur, pixelate, sharpen, vignette } from './canvasOps';
import {
  brightnessContrast,
  colorBalance,
  grayscale,
  hueSaturation,
  invert,
  levels,
  noise,
  posterize,
  sepia,
  threshold,
} from './pixelOps';

export type { Region } from './canvasOps';

export interface FilterParam {
  key: string;
  label: string;
  min: number;
  max: number;
  default: number;
  step?: number;
}

export interface FilterDef {
  id: string;
  label: string;
  group: 'adjust' | 'filter';
  params: FilterParam[];
  apply: (canvas: HTMLCanvasElement, region: Region, v: Record<string, number>) => void;
}

/** ImageData tabanlı op'u bölgeye uygular. */
function runID(canvas: HTMLCanvasElement, region: Region, fn: (img: ImageData) => void): void {
  const ctx = get2d(canvas);
  const img = ctx.getImageData(region.x, region.y, region.w, region.h);
  fn(img);
  ctx.putImageData(img, region.x, region.y);
}

export const FILTERS: FilterDef[] = [
  // ── Ayarlamalar ──
  {
    id: 'brightness-contrast',
    label: 'Parlaklık / Kontrast',
    group: 'adjust',
    params: [
      { key: 'brightness', label: 'Parlaklık', min: -100, max: 100, default: 0 },
      { key: 'contrast', label: 'Kontrast', min: -100, max: 100, default: 0 },
    ],
    apply: (c, r, v) => runID(c, r, (img) => brightnessContrast(img, v.brightness, v.contrast)),
  },
  {
    id: 'hue-saturation',
    label: 'Renk Tonu / Doygunluk',
    group: 'adjust',
    params: [
      { key: 'hue', label: 'Ton', min: -180, max: 180, default: 0 },
      { key: 'sat', label: 'Doygunluk', min: -100, max: 100, default: 0 },
      { key: 'light', label: 'Açıklık', min: -100, max: 100, default: 0 },
    ],
    apply: (c, r, v) => runID(c, r, (img) => hueSaturation(img, v.hue, v.sat, v.light)),
  },
  {
    id: 'levels',
    label: 'Düzeyler',
    group: 'adjust',
    params: [
      { key: 'black', label: 'Siyah Nokta', min: 0, max: 254, default: 0 },
      { key: 'white', label: 'Beyaz Nokta', min: 1, max: 255, default: 255 },
      { key: 'gamma', label: 'Gama', min: 0.1, max: 3, default: 1, step: 0.01 },
    ],
    apply: (c, r, v) => runID(c, r, (img) => levels(img, v.black, v.white, v.gamma)),
  },
  {
    id: 'color-balance',
    label: 'Renk Dengesi',
    group: 'adjust',
    params: [
      { key: 'r', label: 'Kırmızı', min: -100, max: 100, default: 0 },
      { key: 'g', label: 'Yeşil', min: -100, max: 100, default: 0 },
      { key: 'b', label: 'Mavi', min: -100, max: 100, default: 0 },
    ],
    apply: (c, r, v) => runID(c, r, (img) => colorBalance(img, v.r, v.g, v.b)),
  },
  {
    id: 'posterize',
    label: 'Posterleştir',
    group: 'adjust',
    params: [{ key: 'levels', label: 'Düzey', min: 2, max: 32, default: 6 }],
    apply: (c, r, v) => runID(c, r, (img) => posterize(img, v.levels)),
  },
  {
    id: 'threshold',
    label: 'Eşik',
    group: 'adjust',
    params: [{ key: 't', label: 'Eşik', min: 0, max: 255, default: 128 }],
    apply: (c, r, v) => runID(c, r, (img) => threshold(img, v.t)),
  },
  { id: 'invert', label: 'Tersine Çevir', group: 'adjust', params: [], apply: (c, r) => runID(c, r, invert) },
  { id: 'grayscale', label: 'Gri Tonlama', group: 'adjust', params: [], apply: (c, r) => runID(c, r, grayscale) },
  { id: 'sepia', label: 'Sepya', group: 'adjust', params: [], apply: (c, r) => runID(c, r, sepia) },

  // ── Filtreler ──
  {
    id: 'blur',
    label: 'Gauss Bulanıklığı',
    group: 'filter',
    params: [{ key: 'radius', label: 'Yarıçap', min: 0, max: 50, default: 4, step: 0.5 }],
    apply: (c, r, v) => gaussianBlur(c, v.radius, r),
  },
  {
    id: 'sharpen',
    label: 'Keskinleştir',
    group: 'filter',
    params: [{ key: 'amount', label: 'Miktar', min: 0, max: 100, default: 40 }],
    apply: (c, r, v) => sharpen(c, v.amount, r),
  },
  {
    id: 'pixelate',
    label: 'Pikselleştir',
    group: 'filter',
    params: [{ key: 'size', label: 'Hücre', min: 2, max: 64, default: 8 }],
    apply: (c, r, v) => pixelate(c, v.size, r),
  },
  {
    id: 'noise',
    label: 'Gürültü Ekle',
    group: 'filter',
    params: [{ key: 'amount', label: 'Miktar', min: 0, max: 100, default: 20 }],
    apply: (c, r, v) => runID(c, r, (img) => noise(img, v.amount)),
  },
  {
    id: 'vignette',
    label: 'Vinyet',
    group: 'filter',
    params: [{ key: 'strength', label: 'Güç', min: 0, max: 100, default: 50 }],
    apply: (c, r, v) => vignette(c, v.strength, r),
  },
];
