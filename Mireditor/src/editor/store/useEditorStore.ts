import { create } from 'zustand';
import {
  createDocument,
  createLayer,
  createLayerCanvas,
  cloneLayer,
  get2d,
  getActiveLayer,
  getLayerIndex,
} from '../model/document';
import type {
  BlendMode,
  Layer,
  MirDocument,
  Selection,
  ToolId,
  ToolOptions,
  ViewState,
} from '../model/types';

const MAX_HISTORY = 40;

interface Snapshot {
  label: string;
  width: number;
  height: number;
  dpi: number;
  name: string;
  filePath: string | null;
  activeLayerId: string | null;
  layers: Array<Omit<Layer, 'canvas'> & { canvas: HTMLCanvasElement }>;
}

function cloneCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const c = createLayerCanvas(src.width, src.height);
  get2d(c).drawImage(src, 0, 0);
  return c;
}

function snapshotDoc(doc: MirDocument, label: string): Snapshot {
  return {
    label,
    width: doc.width,
    height: doc.height,
    dpi: doc.dpi,
    name: doc.name,
    filePath: doc.filePath,
    activeLayerId: doc.activeLayerId,
    layers: doc.layers.map((l) => ({ ...l, canvas: cloneCanvas(l.canvas) })),
  };
}

function restoreSnapshot(snap: Snapshot): MirDocument {
  return {
    id: 'doc_restored',
    name: snap.name,
    width: snap.width,
    height: snap.height,
    dpi: snap.dpi,
    colorMode: 'RGB',
    filePath: snap.filePath,
    activeLayerId: snap.activeLayerId,
    layers: snap.layers.map((l) => ({ ...l, canvas: cloneCanvas(l.canvas) })),
  };
}

const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  primaryColor: '#ffffff',
  secondaryColor: '#000000',
  brushSize: 24,
  brushHardness: 0.8,
  brushOpacity: 1,
  flow: 1,
  fontFamily: 'Plus Jakarta Sans',
  fontSize: 64,
  shapeKind: 'rect',
  fillShape: true,
  toleranceFill: 32,
};

const DEFAULT_VIEW: ViewState = { zoom: 1, panX: 0, panY: 0 };

interface EditorState {
  doc: MirDocument | null;
  activeTool: ToolId;
  toolOptions: ToolOptions;
  view: ViewState;
  selection: Selection | null;
  renderVersion: number;
  dirty: boolean;

  past: Snapshot[];
  future: Snapshot[];

  // ── Belge ──
  newDocument: (opts: { name?: string; width: number; height: number; dpi?: number; background?: 'white' | 'transparent' }) => void;
  setDocument: (doc: MirDocument) => void;
  closeDocument: () => void;
  renameDocument: (name: string) => void;
  setFilePath: (path: string | null) => void;
  markClean: () => void;

  // ── Araç ──
  setActiveTool: (tool: ToolId) => void;
  setToolOption: (patch: Partial<ToolOptions>) => void;

  // ── Görünüm ──
  setView: (patch: Partial<ViewState>) => void;
  resetView: () => void;

  // ── Seçim ──
  setSelection: (sel: Selection | null) => void;

  // ── Render ──
  bumpRender: () => void;

  // ── Katmanlar ──
  addRasterLayer: (name?: string) => void;
  addLayer: (layer: Layer, makeActive?: boolean) => void;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  toggleVisible: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, mode: BlendMode) => void;
  setLayerLocked: (id: string, locked: boolean) => void;
  renameLayer: (id: string, name: string) => void;
  reorderLayer: (id: string, toIndex: number) => void;
  mergeDown: (id: string) => void;
  flattenImage: () => void;

  // ── Geçmiş ──
  pushHistory: (label?: string) => void;
  undo: () => void;
  redo: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  doc: null,
  activeTool: 'brush',
  toolOptions: DEFAULT_TOOL_OPTIONS,
  view: DEFAULT_VIEW,
  selection: null,
  renderVersion: 0,
  dirty: false,
  past: [],
  future: [],

  // ── Belge ──
  newDocument: (opts) => {
    const doc = createDocument(opts);
    set({ doc, selection: null, past: [], future: [], view: DEFAULT_VIEW, dirty: false, renderVersion: get().renderVersion + 1 });
  },
  setDocument: (doc) =>
    set({ doc, selection: null, past: [], future: [], view: DEFAULT_VIEW, dirty: false, renderVersion: get().renderVersion + 1 }),
  closeDocument: () => set({ doc: null, selection: null, past: [], future: [], dirty: false }),
  renameDocument: (name) => {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, name }, dirty: true });
  },
  setFilePath: (path) => {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, filePath: path } });
  },
  markClean: () => set({ dirty: false }),

  // ── Araç ──
  setActiveTool: (tool) => set({ activeTool: tool }),
  setToolOption: (patch) => set({ toolOptions: { ...get().toolOptions, ...patch } }),

  // ── Görünüm ──
  setView: (patch) => set({ view: { ...get().view, ...patch } }),
  resetView: () => set({ view: DEFAULT_VIEW }),

  // ── Seçim ──
  setSelection: (sel) => set({ selection: sel }),

  // ── Render ──
  bumpRender: () => set({ renderVersion: get().renderVersion + 1, dirty: true }),

  // ── Katmanlar ──
  addRasterLayer: (name) => {
    const doc = get().doc;
    if (!doc) return;
    get().pushHistory('Katman ekle');
    const layer = createLayer({ name: name ?? `Katman ${doc.layers.length + 1}`, width: doc.width, height: doc.height });
    const idx = getLayerIndex(doc, doc.activeLayerId ?? '');
    const layers = [...doc.layers];
    layers.splice(idx + 1, 0, layer);
    set({ doc: { ...doc, layers, activeLayerId: layer.id }, dirty: true });
  },
  addLayer: (layer, makeActive = true) => {
    const doc = get().doc;
    if (!doc) return;
    get().pushHistory('Katman ekle');
    const idx = getLayerIndex(doc, doc.activeLayerId ?? '');
    const layers = [...doc.layers];
    layers.splice(idx + 1, 0, layer);
    set({
      doc: { ...doc, layers, activeLayerId: makeActive ? layer.id : doc.activeLayerId },
      dirty: true,
      renderVersion: get().renderVersion + 1,
    });
  },
  removeLayer: (id) => {
    const doc = get().doc;
    if (!doc || doc.layers.length <= 1) return;
    get().pushHistory('Katman sil');
    const idx = getLayerIndex(doc, id);
    const layers = doc.layers.filter((l) => l.id !== id);
    const nextActive = doc.activeLayerId === id ? layers[Math.max(0, idx - 1)].id : doc.activeLayerId;
    set({ doc: { ...doc, layers, activeLayerId: nextActive }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  duplicateLayer: (id) => {
    const doc = get().doc;
    if (!doc) return;
    const src = doc.layers.find((l) => l.id === id);
    if (!src) return;
    get().pushHistory('Katmanı çoğalt');
    const copy = cloneLayer(src);
    const idx = getLayerIndex(doc, id);
    const layers = [...doc.layers];
    layers.splice(idx + 1, 0, copy);
    set({ doc: { ...doc, layers, activeLayerId: copy.id }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  setActiveLayer: (id) => {
    const doc = get().doc;
    if (!doc) return;
    set({ doc: { ...doc, activeLayerId: id } });
  },
  toggleVisible: (id) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l));
    set({ doc: { ...doc, layers }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  setLayerOpacity: (id, opacity) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers.map((l) => (l.id === id ? { ...l, opacity } : l));
    set({ doc: { ...doc, layers }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  setLayerBlendMode: (id, mode) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers.map((l) => (l.id === id ? { ...l, blendMode: mode } : l));
    set({ doc: { ...doc, layers }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  setLayerLocked: (id, locked) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers.map((l) => (l.id === id ? { ...l, locked } : l));
    set({ doc: { ...doc, layers } });
  },
  renameLayer: (id, name) => {
    const doc = get().doc;
    if (!doc) return;
    const layers = doc.layers.map((l) => (l.id === id ? { ...l, name } : l));
    set({ doc: { ...doc, layers }, dirty: true });
  },
  reorderLayer: (id, toIndex) => {
    const doc = get().doc;
    if (!doc) return;
    const from = getLayerIndex(doc, id);
    if (from < 0) return;
    const clamped = Math.max(0, Math.min(doc.layers.length - 1, toIndex));
    if (from === clamped) return;
    get().pushHistory('Katman sırası');
    const layers = [...doc.layers];
    const [moved] = layers.splice(from, 1);
    layers.splice(clamped, 0, moved);
    set({ doc: { ...doc, layers }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  mergeDown: (id) => {
    const doc = get().doc;
    if (!doc) return;
    const idx = getLayerIndex(doc, id);
    if (idx <= 0) return;
    get().pushHistory('Aşağı birleştir');
    const upper = doc.layers[idx];
    const lower = doc.layers[idx - 1];
    const ctx = get2d(lower.canvas);
    ctx.globalAlpha = upper.opacity;
    ctx.globalCompositeOperation = upper.blendMode === 'normal' ? 'source-over' : (upper.blendMode as GlobalCompositeOperation);
    ctx.drawImage(upper.canvas, upper.x - lower.x, upper.y - lower.y);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const layers = doc.layers.filter((l) => l.id !== id);
    set({ doc: { ...doc, layers, activeLayerId: lower.id }, dirty: true, renderVersion: get().renderVersion + 1 });
  },
  flattenImage: () => {
    const doc = get().doc;
    if (!doc) return;
    get().pushHistory('Görüntüyü düzleştir');
    const flat = createLayer({ name: 'Arkaplan', width: doc.width, height: doc.height });
    const ctx = get2d(flat.canvas);
    for (const layer of doc.layers) {
      if (!layer.visible || layer.opacity <= 0) continue;
      ctx.globalAlpha = layer.opacity;
      ctx.globalCompositeOperation = layer.blendMode === 'normal' ? 'source-over' : (layer.blendMode as GlobalCompositeOperation);
      ctx.drawImage(layer.canvas, layer.x, layer.y);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    set({ doc: { ...doc, layers: [flat], activeLayerId: flat.id }, dirty: true, renderVersion: get().renderVersion + 1 });
  },

  // ── Geçmiş ──
  pushHistory: (label = 'Düzenle') => {
    const doc = get().doc;
    if (!doc) return;
    const past = [...get().past, snapshotDoc(doc, label)];
    if (past.length > MAX_HISTORY) past.shift();
    set({ past, future: [] });
  },
  undo: () => {
    const { past, doc } = get();
    if (!doc || past.length === 0) return;
    const prev = past[past.length - 1];
    const future = [snapshotDoc(doc, prev.label), ...get().future];
    set({
      doc: restoreSnapshot(prev),
      past: past.slice(0, -1),
      future,
      renderVersion: get().renderVersion + 1,
      dirty: true,
    });
  },
  redo: () => {
    const { future, doc } = get();
    if (!doc || future.length === 0) return;
    const next = future[0];
    const past = [...get().past, snapshotDoc(doc, next.label)];
    set({
      doc: restoreSnapshot(next),
      future: future.slice(1),
      past,
      renderVersion: get().renderVersion + 1,
      dirty: true,
    });
  },
}));
