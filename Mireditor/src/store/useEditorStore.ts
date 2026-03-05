import { create } from 'zustand';

// ── Tool Types ──
export type ToolType =
  | 'move' | 'marquee' | 'ellipseMarquee' | 'lasso' | 'polyLasso'
  | 'magicWand' | 'crop' | 'eyedropper' | 'cloneStamp'
  | 'brush' | 'pencil' | 'eraser'
  | 'fill' | 'gradient'
  | 'blur' | 'sharpen' | 'smudge'
  | 'dodge' | 'burn' | 'sponge'
  | 'pen' | 'text'
  | 'line' | 'rectangle' | 'ellipse' | 'polygon'
  | 'hand' | 'zoom';

// ── Layer ──
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: string;
  isGroup: boolean;
  parentId: string | null;
  collapsed: boolean;
}

// ── Project Config ──
export interface ProjectConfig {
  title: string;
  width: number;
  height: number;
  backgroundColor: string;
}

// ── State ──
interface EditorState {
  // Canvas
  canvas: any;
  setCanvas: (c: any) => void;

  // Project
  projectTitle: string;
  canvasWidth: number;
  canvasHeight: number;
  projectBg: string;
  setProjectConfig: (cfg: ProjectConfig) => void;

  // Tool
  activeTool: ToolType;
  previousTool: ToolType;
  setActiveTool: (t: ToolType) => void;
  restorePreviousTool: () => void;

  // Colors
  foregroundColor: string;
  backgroundColor: string;
  setForegroundColor: (c: string) => void;
  setBackgroundColor: (c: string) => void;
  swapColors: () => void;
  resetColors: () => void;

  // Brush
  brushSize: number;
  brushOpacity: number;
  brushHardness: number;
  setBrushSize: (s: number) => void;
  setBrushOpacity: (o: number) => void;
  setBrushHardness: (h: number) => void;

  // Zoom
  zoom: number;
  setZoom: (z: number) => void;

  // Layers
  layers: Layer[];
  activeLayerId: string | null;
  setActiveLayerId: (id: string | null) => void;
  addLayer: (partial?: Partial<Layer>) => string;
  removeLayer: (id: string) => void;
  duplicateLayer: (id: string) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  reorderLayers: (from: number, to: number) => void;
  addGroup: () => string;
  mergeDown: (id: string) => void;
  flattenLayers: () => void;

  // History
  undoStack: string[];
  redoStack: string[];
  pushHistory: (json: string) => void;
  undo: () => string | null;
  redo: () => string | null;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Space held (for global shortcuts <-> canvas panning)
  isSpaceHeld: boolean;
  setIsSpaceHeld: (v: boolean) => void;

  // UI
  showGrid: boolean;
  showRulers: boolean;
  toggleGrid: () => void;
  toggleRulers: () => void;

  // Clipboard
  clipboardData: any;
  setClipboardData: (d: any) => void;

  // Status
  isModified: boolean;
  setModified: (v: boolean) => void;
  cursorPos: { x: number; y: number };
  setCursorPos: (p: { x: number; y: number }) => void;
  documentSize: string;
  setDocumentSize: (s: string) => void;
}

let _layerCounter = 1;
const uid = () => `layer-${Date.now()}-${_layerCounter++}`;

export const useEditorStore = create<EditorState>()((set, get) => ({
  // Canvas
  canvas: null,
  setCanvas: (c) => set({ canvas: c }),

  // Project
  projectTitle: 'Untitled-1',
  canvasWidth: 1920,
  canvasHeight: 1080,
  projectBg: '#ffffff',
  setProjectConfig: (cfg) =>
    set({
      projectTitle: cfg.title,
      canvasWidth: cfg.width,
      canvasHeight: cfg.height,
      projectBg: cfg.backgroundColor,
    }),

  // Tool
  activeTool: 'move',
  previousTool: 'move',
  setActiveTool: (t) =>
    set((s) => ({ activeTool: t, previousTool: s.activeTool })),
  restorePreviousTool: () =>
    set((s) => ({ activeTool: s.previousTool })),

  // Colors
  foregroundColor: '#000000',
  backgroundColor: '#ffffff',
  setForegroundColor: (c) => set({ foregroundColor: c }),
  setBackgroundColor: (c) => set({ backgroundColor: c }),
  swapColors: () =>
    set((s) => ({
      foregroundColor: s.backgroundColor,
      backgroundColor: s.foregroundColor,
    })),
  resetColors: () =>
    set({ foregroundColor: '#000000', backgroundColor: '#ffffff' }),

  // Brush
  brushSize: 5,
  brushOpacity: 100,
  brushHardness: 100,
  setBrushSize: (s) => set({ brushSize: Math.max(1, Math.min(500, s)) }),
  setBrushOpacity: (o) => set({ brushOpacity: Math.max(1, Math.min(100, o)) }),
  setBrushHardness: (h) => set({ brushHardness: Math.max(0, Math.min(100, h)) }),

  // Zoom
  zoom: 100,
  setZoom: (z) => set({ zoom: Math.max(1, Math.min(6400, z)) }),

  // Layers
  layers: [],
  activeLayerId: null,
  setActiveLayerId: (id) => set({ activeLayerId: id }),

  addLayer: (partial) => {
    const id = uid();
    const count = get().layers.filter((l) => !l.isGroup).length + 1;
    const layer: Layer = {
      id,
      name: partial?.name || `Katman ${count}`,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      isGroup: false,
      parentId: null,
      collapsed: false,
      ...partial,
    };
    set((s) => ({
      layers: [layer, ...s.layers],
      activeLayerId: id,
    }));
    return id;
  },

  removeLayer: (id) =>
    set((s) => {
      const filtered = s.layers.filter(
        (l) => l.id !== id && l.parentId !== id,
      );
      return {
        layers: filtered,
        activeLayerId:
          s.activeLayerId === id
            ? filtered[0]?.id || null
            : s.activeLayerId,
      };
    }),

  duplicateLayer: (id) => {
    const layer = get().layers.find((l) => l.id === id);
    if (!layer) return;
    const newId = uid();
    const dup: Layer = {
      ...layer,
      id: newId,
      name: `${layer.name} kopya`,
    };
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      const newLayers = [...s.layers];
      newLayers.splice(idx, 0, dup);
      return { layers: newLayers, activeLayerId: newId };
    });
  },

  updateLayer: (id, updates) =>
    set((s) => ({
      layers: s.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l,
      ),
    })),

  reorderLayers: (from, to) =>
    set((s) => {
      const arr = [...s.layers];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return { layers: arr };
    }),

  addGroup: () => {
    const id = uid();
    const count =
      get().layers.filter((l) => l.isGroup).length + 1;
    const group: Layer = {
      id,
      name: `Grup ${count}`,
      visible: true,
      locked: false,
      opacity: 100,
      blendMode: 'normal',
      isGroup: true,
      parentId: null,
      collapsed: false,
    };
    set((s) => ({
      layers: [group, ...s.layers],
      activeLayerId: id,
    }));
    return id;
  },

  mergeDown: (id) => {
    const { layers } = get();
    const idx = layers.findIndex((l) => l.id === id);
    if (idx < 0 || idx >= layers.length - 1) return;
    const below = layers[idx + 1];
    set((s) => ({
      layers: s.layers
        .filter((l) => l.id !== id)
        .map((l) =>
          l.id === below.id
            ? { ...l, name: `${below.name} (birleşik)` }
            : l,
        ),
      activeLayerId: below.id,
    }));
  },

  flattenLayers: () => {
    const id = uid();
    set({
      layers: [
        {
          id,
          name: 'Düzleştirilmiş',
          visible: true,
          locked: false,
          opacity: 100,
          blendMode: 'normal',
          isGroup: false,
          parentId: null,
          collapsed: false,
        },
      ],
      activeLayerId: id,
    });
  },

  // History
  undoStack: [],
  redoStack: [],
  pushHistory: (json) =>
    set((s) => ({
      undoStack: [...s.undoStack.slice(-49), json],
      redoStack: [],
      isModified: true,
    })),
  undo: () => {
    const { undoStack, redoStack } = get();
    if (undoStack.length < 2) return null;
    const current = undoStack[undoStack.length - 1];
    const prev = undoStack[undoStack.length - 2];
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, current],
    });
    return prev;
  },
  redo: () => {
    const { undoStack, redoStack } = get();
    if (redoStack.length === 0) return null;
    const next = redoStack[redoStack.length - 1];
    set({
      undoStack: [...undoStack, next],
      redoStack: redoStack.slice(0, -1),
    });
    return next;
  },
  canUndo: () => get().undoStack.length > 1,
  canRedo: () => get().redoStack.length > 0,

  // Space held
  isSpaceHeld: false,
  setIsSpaceHeld: (v) => set({ isSpaceHeld: v }),

  // UI
  showGrid: false,
  showRulers: false,
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),

  // Clipboard
  clipboardData: null,
  setClipboardData: (d) => set({ clipboardData: d }),

  // Status
  isModified: false,
  setModified: (v) => set({ isModified: v }),
  cursorPos: { x: 0, y: 0 },
  setCursorPos: (p) => set({ cursorPos: p }),
  documentSize: '0 B',
  setDocumentSize: (s) => set({ documentSize: s }),
}));
