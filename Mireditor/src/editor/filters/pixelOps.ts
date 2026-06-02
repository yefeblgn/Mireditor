import { clamp255, hslToRgb, rgbToHsl } from '../utils/color';

// ImageData üzerinde yerinde (in-place) çalışan piksel operasyonları.

export function invert(img: ImageData): void {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i];
    d[i + 1] = 255 - d[i + 1];
    d[i + 2] = 255 - d[i + 2];
  }
}

export function grayscale(img: ImageData): void {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    d[i] = d[i + 1] = d[i + 2] = y;
  }
}

export function sepia(img: ImageData): void {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    d[i] = clamp255(0.393 * r + 0.769 * g + 0.189 * b);
    d[i + 1] = clamp255(0.349 * r + 0.686 * g + 0.168 * b);
    d[i + 2] = clamp255(0.272 * r + 0.534 * g + 0.131 * b);
  }
}

/** brightness, contrast: -100..100 */
export function brightnessContrast(img: ImageData, brightness: number, contrast: number): void {
  const d = img.data;
  const b = (brightness / 100) * 255;
  const c = contrast / 100;
  const factor = (1.015 * (c + 1)) / (1.015 - c);
  for (let i = 0; i < d.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      let v = d[i + k] + b;
      v = factor * (v - 128) + 128;
      d[i + k] = clamp255(v);
    }
  }
}

/** hue: -180..180, sat: -100..100, light: -100..100 */
export function hueSaturation(img: ImageData, hue: number, sat: number, light: number): void {
  const d = img.data;
  const satMul = 1 + sat / 100;
  const lightAdd = light / 100;
  for (let i = 0; i < d.length; i += 4) {
    const hsl = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    let h = (hsl.h + hue) % 360;
    if (h < 0) h += 360;
    const s = Math.max(0, Math.min(1, hsl.s * satMul));
    const l = Math.max(0, Math.min(1, hsl.l + lightAdd));
    const rgb = hslToRgb(h, s, l);
    d[i] = rgb.r;
    d[i + 1] = rgb.g;
    d[i + 2] = rgb.b;
  }
}

/** levels: blackPoint 0..254, whitePoint 1..255, gamma 0.1..9.99 */
export function levels(img: ImageData, black: number, white: number, gamma: number): void {
  const d = img.data;
  const range = Math.max(1, white - black);
  const invGamma = 1 / gamma;
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let n = (v - black) / range;
    n = Math.max(0, Math.min(1, n));
    lut[v] = clamp255(Math.pow(n, invGamma) * 255);
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];
    d[i + 1] = lut[d[i + 1]];
    d[i + 2] = lut[d[i + 2]];
  }
}

/** posterize: levels 2..255 */
export function posterize(img: ImageData, lv: number): void {
  const d = img.data;
  const step = 255 / (lv - 1);
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp255(Math.round(d[i] / step) * step);
    d[i + 1] = clamp255(Math.round(d[i + 1] / step) * step);
    d[i + 2] = clamp255(Math.round(d[i + 2] / step) * step);
  }
}

/** threshold: 0..255 */
export function threshold(img: ImageData, t: number): void {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = y >= t ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
}

/** colorBalance: her kanal için -100..100 kayma */
export function colorBalance(img: ImageData, r: number, g: number, b: number): void {
  const d = img.data;
  const rr = (r / 100) * 255;
  const gg = (g / 100) * 255;
  const bb = (b / 100) * 255;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = clamp255(d[i] + rr);
    d[i + 1] = clamp255(d[i + 1] + gg);
    d[i + 2] = clamp255(d[i + 2] + bb);
  }
}

/** noise: amount 0..100 */
export function noise(img: ImageData, amount: number): void {
  const d = img.data;
  const a = (amount / 100) * 255;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * a;
    d[i] = clamp255(d[i] + n);
    d[i + 1] = clamp255(d[i + 1] + n);
    d[i + 2] = clamp255(d[i + 2] + n);
  }
}
