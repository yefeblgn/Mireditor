import { uid } from '../model/uid';
import { createLayerCanvas, get2d } from '../model/document';
import type { Layer, MirDocument, TextData } from '../model/types';

export const GEF_VERSION = 1;

interface SerializedLayer {
  id: string;
  name: string;
  type: Layer['type'];
  visible: boolean;
  opacity: number;
  blendMode: Layer['blendMode'];
  locked: boolean;
  x: number;
  y: number;
  text?: TextData;
  data: string; // data:image/png;base64,...
}

interface SerializedDoc {
  format: 'mireditor';
  version: number;
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: 'RGB';
  activeLayerId: string | null;
  layers: SerializedLayer[];
}

/** Belgeyi .gef JSON metnine dönüştürür (katman PNG'leri gömülü). */
export function serializeDocument(doc: MirDocument): string {
  const payload: SerializedDoc = {
    format: 'mireditor',
    version: GEF_VERSION,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    dpi: doc.dpi,
    colorMode: doc.colorMode,
    activeLayerId: doc.activeLayerId,
    layers: doc.layers.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      locked: l.locked,
      x: l.x,
      y: l.y,
      text: l.text,
      data: l.canvas.toDataURL('image/png'),
    })),
  };
  return JSON.stringify(payload);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** .gef JSON metnini belgeye dönüştürür. */
export async function deserializeDocument(json: string): Promise<MirDocument> {
  const data = JSON.parse(json) as SerializedDoc;
  if (data.format !== 'mireditor') throw new Error('Geçersiz Mireditor dosyası');

  const layers: Layer[] = [];
  for (const sl of data.layers) {
    let img: HTMLImageElement | null = null;
    try {
      img = await loadImage(sl.data);
    } catch {
      /* boş katman olarak bırak */
    }
    const canvasW = img ? img.width : data.width;
    const canvasH = img ? img.height : data.height;
    const canvas = createLayerCanvas(canvasW, canvasH);
    if (img) {
      get2d(canvas).drawImage(img, 0, 0);
    }
    layers.push({
      id: sl.id || uid('layer'),
      name: sl.name,
      type: sl.type,
      visible: sl.visible,
      opacity: sl.opacity,
      blendMode: sl.blendMode,
      locked: sl.locked,
      x: sl.x,
      y: sl.y,
      text: sl.text,
      canvas,
    });
  }

  return {
    id: uid('doc'),
    name: data.name,
    width: data.width,
    height: data.height,
    dpi: data.dpi,
    colorMode: 'RGB',
    activeLayerId: data.activeLayerId ?? (layers[0]?.id ?? null),
    layers,
    filePath: null,
  };
}
