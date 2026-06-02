// ─── Mireditor çekirdek tip tanımları ───

export type ColorMode = 'RGB';

export type LayerType = 'raster' | 'text' | 'shape' | 'adjustment' | 'group';

// Photoshop blend modları — Canvas globalCompositeOperation'a eşlenir.
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Çarpım' },
  { value: 'screen', label: 'Ekran' },
  { value: 'overlay', label: 'Kaplama' },
  { value: 'darken', label: 'Koyulaştır' },
  { value: 'lighten', label: 'Açıklaştır' },
  { value: 'color-dodge', label: 'Renk Soldurma' },
  { value: 'color-burn', label: 'Renk Yakma' },
  { value: 'hard-light', label: 'Sert Işık' },
  { value: 'soft-light', label: 'Yumuşak Işık' },
  { value: 'difference', label: 'Fark' },
  { value: 'exclusion', label: 'Hariç Tutma' },
  { value: 'hue', label: 'Renk Tonu' },
  { value: 'saturation', label: 'Doygunluk' },
  { value: 'color', label: 'Renk' },
  { value: 'luminosity', label: 'Parlaklık' },
];

// 'normal' Canvas'ta 'source-over' karşılığıdır.
export function blendToComposite(mode: BlendMode): GlobalCompositeOperation {
  return mode === 'normal' ? 'source-over' : (mode as GlobalCompositeOperation);
}

export interface TextData {
  content: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
  letterSpacing?: number;
  curve?: number;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  opacity: number; // 0..1
  blendMode: BlendMode;
  locked: boolean;
  x: number; // belge koordinatında konum kayması
  y: number;
  /** Katmanın piksel tamponu (belge boyutunda). */
  canvas: HTMLCanvasElement;
  /** Metin katmanları için kaynak veri (yeniden düzenlenebilir). */
  text?: TextData;
}

export interface MirDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: ColorMode;
  /** index 0 = en alt katman; kompozisyon alttan üste yapılır. */
  layers: Layer[];
  activeLayerId: string | null;
  filePath: string | null;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ToolId =
  | 'move'
  | 'marquee'
  | 'lasso'
  | 'brush'
  | 'pencil'
  | 'eraser'
  | 'bucket'
  | 'eyedropper'
  | 'text'
  | 'crop'
  | 'shape'
  | 'gradient'
  | 'clone'
  | 'zoom'
  | 'hand'
  | 'transform';

export type ShapeKind = 'rect' | 'ellipse' | 'line';

export interface ToolOptions {
  primaryColor: string;
  secondaryColor: string;
  brushSize: number;
  brushHardness: number; // 0..1
  brushOpacity: number; // 0..1
  flow: number; // 0..1
  fontFamily: string;
  fontSize: number;
  shapeKind: ShapeKind;
  fillShape: boolean;
  toleranceFill: number; // bucket tolerance 0..255
}

export interface ViewState {
  zoom: number; // 1 = %100
  panX: number; // ekran pikseli kayması
  panY: number;
}

export interface DocumentPreset {
  name: string;
  width: number;
  height: number;
  dpi: number;
}

export const DOCUMENT_PRESETS: DocumentPreset[] = [
  { name: 'Özel', width: 1920, height: 1080, dpi: 72 },
  { name: 'HD 1920×1080', width: 1920, height: 1080, dpi: 72 },
  { name: '4K 3840×2160', width: 3840, height: 2160, dpi: 72 },
  { name: 'Instagram Kare 1080', width: 1080, height: 1080, dpi: 72 },
  { name: 'Instagram Story', width: 1080, height: 1920, dpi: 72 },
  { name: 'A4 Baskı 300dpi', width: 2480, height: 3508, dpi: 300 },
  { name: 'Web 1280×720', width: 1280, height: 720, dpi: 72 },
];
