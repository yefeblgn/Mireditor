import { get2d } from '../model/document';
import type { Layer, TextData } from '../model/types';

/** Metin verisini katman canvas'ına yeniden çizer (rasterize). */
export function renderTextLayer(layer: Layer): void {
  if (!layer.text) return;
  const t = layer.text;
  const ctx = get2d(layer.canvas);
  ctx.clearRect(0, 0, layer.canvas.width, layer.canvas.height);

  const weight = t.bold ? '700' : '400';
  const style = t.italic ? 'italic' : 'normal';
  ctx.font = `${style} ${weight} ${t.fontSize}px "${t.fontFamily}", sans-serif`;
  ctx.fillStyle = t.color;
  ctx.textBaseline = 'top';
  ctx.textAlign = t.align;

  const lines = t.content.split('\n');
  const lineHeight = t.fontSize * 1.25;
  // Metin katmanın sol-üstüne hizalanır; konum layer.x/y ile ayarlanır.
  const originX = t.align === 'center' ? layer.canvas.width / 2 : t.align === 'right' ? layer.canvas.width - 4 : 4;
  lines.forEach((line, i) => {
    ctx.fillText(line, originX, 4 + i * lineHeight);
  });
}

export function defaultTextData(color: string, fontFamily: string, fontSize: number): TextData {
  return {
    content: 'Metninizi yazın',
    fontFamily,
    fontSize,
    color,
    bold: false,
    italic: false,
    align: 'left',
  };
}
