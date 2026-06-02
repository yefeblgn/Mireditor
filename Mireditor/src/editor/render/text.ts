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

  const displayText = t.content || getTextPlaceholder();
  const lines = displayText.split('\n');
  const lineHeight = t.fontSize * 1.25;

  const letterSpacing = t.letterSpacing || 0;
  try {
    // @ts-ignore
    ctx.letterSpacing = `${letterSpacing}px`;
  } catch (e) {
    // fallback if not supported
  }

  // Placeholder veya normal metin rengi
  if (t.content) {
    ctx.fillStyle = t.color;
  } else {
    ctx.fillStyle = '#999999'; // Placeholder rengi (gri)
  }

  const curve = t.curve || 0;

  if (curve === 0) {
    ctx.textBaseline = 'top';
    ctx.textAlign = t.align;
    lines.forEach((line, i) => {
      const originX = t.align === 'center' ? layer.canvas.width / 2 : t.align === 'right' ? layer.canvas.width - 4 : 4;
      ctx.fillText(line, originX, 4 + i * lineHeight);
    });
  } else {
    // Kavisli (Polar) Çizim
    lines.forEach((line, lineIndex) => {
      const chars = Array.from(line);
      if (chars.length === 0) return;

      // Her karakterin genişliğini ölç
      const charWidths = chars.map(char => {
        try {
          // @ts-ignore
          ctx.letterSpacing = '0px';
        } catch (e) {}
        const w = ctx.measureText(char).width;
        try {
          // @ts-ignore
          ctx.letterSpacing = `${letterSpacing}px`;
        } catch (e) {}
        return w;
      });

      const totalWidth = charWidths.reduce((a, b) => a + b, 0) + (chars.length - 1) * letterSpacing;

      // Yarıçap (kavis miktarına bağlı)
      const R = 15000 / curve;

      const centerX = layer.canvas.width / 2;
      const baseY = 4 + lineIndex * lineHeight + t.fontSize / 2;
      const centerY = baseY + R;

      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let currentX = 0;
      chars.forEach((char, charIndex) => {
        const charW = charWidths[charIndex];
        const x = currentX + charW / 2 - totalWidth / 2;
        currentX += charW + letterSpacing;

        const theta = x / R;

        const posX = centerX + R * Math.sin(theta);
        const posY = centerY - R * Math.cos(theta);

        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(theta);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });

      ctx.restore();
    });
  }
}

export function defaultTextData(color: string, fontFamily: string, fontSize: number): TextData {
  return {
    content: '', // Placeholder için boş başla
    fontFamily,
    fontSize,
    color,
    bold: false,
    italic: false,
    align: 'left',
  };
}

export function getTextPlaceholder(): string {
  return 'Metninizi yazın';
}
