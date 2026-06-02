import { uid } from './uid';
import type { Layer, LayerType, MirDocument, TextData } from './types';

/** Belge boyutunda boş, şeffaf bir canvas üretir. */
export function createLayerCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2D context alınamadı');
  return ctx;
}

interface CreateLayerOpts {
  name?: string;
  type?: LayerType;
  width: number;
  height: number;
  fill?: string | null; // dolgu rengi (örn. arkaplan beyaz)
  text?: TextData;
}

export function createLayer(opts: CreateLayerOpts): Layer {
  const canvas = createLayerCanvas(opts.width, opts.height);
  if (opts.fill) {
    const ctx = get2d(canvas);
    ctx.fillStyle = opts.fill;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return {
    id: uid('layer'),
    name: opts.name ?? 'Katman',
    type: opts.type ?? 'raster',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    locked: false,
    x: 0,
    y: 0,
    canvas,
    text: opts.text,
  };
}

interface CreateDocumentOpts {
  name?: string;
  width: number;
  height: number;
  dpi?: number;
  background?: 'white' | 'transparent' | string;
}

export function createDocument(opts: CreateDocumentOpts): MirDocument {
  const { width, height } = opts;
  const fill =
    opts.background === 'transparent'
      ? null
      : opts.background === 'white' || opts.background === undefined
      ? '#ffffff'
      : opts.background;

  const bg = createLayer({
    name: 'Arkaplan',
    width,
    height,
    fill,
  });
  // Arkaplan varsayılan olarak kilitli DEĞİL — kullanıcı doğrudan boyayabilsin/efekt uygulayabilsin.
  bg.locked = false;

  return {
    id: uid('doc'),
    name: opts.name ?? 'Adsız-1',
    width,
    height,
    dpi: opts.dpi ?? 72,
    colorMode: 'RGB',
    layers: [bg],
    activeLayerId: bg.id,
    filePath: null,
  };
}

export function getActiveLayer(doc: MirDocument | null): Layer | null {
  if (!doc) return null;
  return doc.layers.find((l) => l.id === doc.activeLayerId) ?? null;
}

export function getLayerIndex(doc: MirDocument, layerId: string): number {
  return doc.layers.findIndex((l) => l.id === layerId);
}

/** Bir katmanın içeriğini başka bir boyuta klonlar. */
export function cloneLayer(layer: Layer, suffix = ' kopya'): Layer {
  const canvas = createLayerCanvas(layer.canvas.width, layer.canvas.height);
  get2d(canvas).drawImage(layer.canvas, 0, 0);
  return {
    ...layer,
    id: uid('layer'),
    name: layer.name + suffix,
    canvas,
    text: layer.text ? { ...layer.text } : undefined,
  };
}
