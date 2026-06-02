import { useEffect } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, ToolType } from '../store/useEditorStore';

const WORKAREA_ID = '__workarea__';

const TOOL_CURSORS: Record<ToolType, string> = {
  move: 'move',
  marquee: 'crosshair',
  ellipseMarquee: 'crosshair',
  lasso: 'crosshair',
  polyLasso: 'crosshair',
  magicWand: 'crosshair',
  crop: 'crosshair',
  eyedropper: 'crosshair',
  cloneStamp: 'crosshair',
  brush: 'crosshair',
  pencil: 'crosshair',
  eraser: 'crosshair',
  fill: 'crosshair',
  gradient: 'crosshair',
  blur: 'crosshair',
  sharpen: 'crosshair',
  smudge: 'crosshair',
  dodge: 'crosshair',
  burn: 'crosshair',
  sponge: 'crosshair',
  pen: 'crosshair',
  text: 'text',
  line: 'crosshair',
  rectangle: 'crosshair',
  ellipse: 'crosshair',
  polygon: 'crosshair',
  hand: 'grab',
  zoom: 'zoom-in',
};

// ── Zoom helpers ──
function zoomBy(factor: number) {
  const store = useEditorStore.getState();
  const canvas = store.canvas;
  if (!canvas) return;
  const cw = canvas.width as number;
  const ch = canvas.height as number;
  const newZoom = Math.max(0.01, Math.min(64, canvas.getZoom() * factor));
  canvas.zoomToPoint(new fabric.Point(cw / 2, ch / 2), newZoom);
  store.setZoom(Math.round(newZoom * 100));
  canvas.requestRenderAll();
}

function setZoomAbsolute(z: number) {
  const store = useEditorStore.getState();
  const canvas = store.canvas;
  if (!canvas) return;
  const cw = canvas.width as number;
  const ch = canvas.height as number;
  canvas.zoomToPoint(new fabric.Point(cw / 2, ch / 2), z);
  store.setZoom(Math.round(z * 100));
  canvas.requestRenderAll();
}

function fitToScreen() {
  const store = useEditorStore.getState();
  const canvas = store.canvas;
  if (!canvas) return;
  const cw = canvas.width as number;
  const ch = canvas.height as number;
  const canvasWidth = store.canvasWidth;
  const canvasHeight = store.canvasHeight;
  const zx = (cw - 80) / canvasWidth;
  const zy = (ch - 80) / canvasHeight;
  const z = Math.min(zx, zy, 1);
  canvas.setZoom(z);

  const workarea = canvas.getObjects().find((o: any) => o.customId === WORKAREA_ID);
  if (workarea) {
    const center = workarea.getCenterPoint();
    canvas.viewportTransform![4] = cw / 2 - center.x * z;
    canvas.viewportTransform![5] = ch / 2 - center.y * z;
  }
  store.setZoom(Math.round(z * 100));
  canvas.requestRenderAll();
}

function saveHistory() {
  const store = useEditorStore.getState();
  const canvas = store.canvas;
  if (!canvas) return;
  const json = JSON.stringify(canvas.toJSON());
  store.pushHistory(json);
  store.setModified(true);
}

function pasteFromClipboard() {
  const store = useEditorStore.getState();
  const canvas = store.canvas;
  const data = store.clipboardData;
  if (!canvas || !data) return;
  data.clone().then((cloned: any) => {
    cloned.set({
      left: (cloned.left || 0) + 20,
      top: (cloned.top || 0) + 20,
    });
    if (cloned instanceof fabric.ActiveSelection) {
      cloned.forEachObject((obj: any) => canvas.add(obj));
      cloned.setCoords();
    } else {
      canvas.add(cloned);
    }
    canvas.setActiveObject(cloned);
    canvas.requestRenderAll();
    saveHistory();
  });
}

// ── The hook ──
export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const store = useEditorStore.getState();
      const canvas = store.canvas;
      if (!canvas) return;

      // Don't intercept when typing in an input or text editing
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Check if editing text on canvas
      const activeObj = canvas.getActiveObject();
      if (activeObj && activeObj instanceof fabric.IText && (activeObj as any).isEditing) {
        if (!e.ctrlKey && !e.metaKey) return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const key = e.key.toLowerCase();

      // ── Ctrl combos ──
      if (ctrl) {
        switch (key) {
          case 'z':
            e.preventDefault();
            if (shift) {
              const redoJson = store.redo();
              if (redoJson) {
                canvas.loadFromJSON(redoJson).then(() => canvas.requestRenderAll());
              }
            } else {
              const undoJson = store.undo();
              if (undoJson) {
                canvas.loadFromJSON(undoJson).then(() => canvas.requestRenderAll());
              }
            }
            return;

          case 'y':
            e.preventDefault();
            {
              const redoJson2 = store.redo();
              if (redoJson2) {
                canvas.loadFromJSON(redoJson2).then(() => canvas.requestRenderAll());
              }
            }
            return;

          case 'c':
            e.preventDefault();
            {
              const activeC = canvas.getActiveObject();
              if (activeC) {
                activeC.clone().then((cloned: any) => {
                  store.setClipboardData(cloned);
                });
              }
            }
            return;

          case 'x':
            e.preventDefault();
            {
              const activeX = canvas.getActiveObject();
              if (activeX) {
                activeX.clone().then((cloned: any) => {
                  store.setClipboardData(cloned);
                  canvas.remove(activeX);
                  canvas.requestRenderAll();
                  saveHistory();
                });
              }
            }
            return;

          case 'v':
            e.preventDefault();
            if (navigator.clipboard && navigator.clipboard.read) {
              navigator.clipboard.read().then((items) => {
                for (const item of items) {
                  const imageType = item.types.find((t: string) => t.startsWith('image/'));
                  if (imageType) {
                    item.getType(imageType).then((blob: Blob) => {
                      const url = URL.createObjectURL(blob);
                      fabric.FabricImage.fromURL(url).then((img) => {
                        const cWidth = useEditorStore.getState().canvasWidth;
                        img.scaleToWidth(Math.min(cWidth * 0.5, img.width || 400));
                        const layerId = useEditorStore.getState().activeLayerId;
                        (img as any).layerId = layerId;
                        canvas.add(img);
                        canvas.centerObject(img);
                        canvas.setActiveObject(img);
                        canvas.requestRenderAll();
                        saveHistory();
                        URL.revokeObjectURL(url);
                      });
                    });
                    return;
                  }
                }
                pasteFromClipboard();
              }).catch(() => {
                pasteFromClipboard();
              });
            } else {
              pasteFromClipboard();
            }
            return;

          case 'a':
            e.preventDefault();
            {
              const allObjs = canvas.getObjects().filter(
                (o: any) => o.customId !== WORKAREA_ID && !o.isMarquee,
              );
              if (allObjs.length > 0) {
                const sel = new fabric.ActiveSelection(allObjs, { canvas });
                canvas.setActiveObject(sel);
                canvas.requestRenderAll();
              }
            }
            return;

          case 'd':
            e.preventDefault();
            canvas.discardActiveObject();
            canvas.getObjects().forEach((o: any) => {
              if (o.isMarquee) canvas.remove(o);
            });
            canvas.requestRenderAll();
            return;

          case 't':
            e.preventDefault();
            {
              const activeT = canvas.getActiveObject();
              if (activeT) {
                activeT.set({
                  hasControls: true,
                  hasBorders: true,
                  lockRotation: false,
                  lockScalingX: false,
                  lockScalingY: false,
                });
                canvas.requestRenderAll();
              }
            }
            return;

          case 'g':
            e.preventDefault();
            if (shift) {
              const activeUg = canvas.getActiveObject();
              if (activeUg && activeUg instanceof fabric.Group) {
                const items = (activeUg as fabric.Group).getObjects();
                canvas.remove(activeUg);
                items.forEach((item) => canvas.add(item));
                canvas.requestRenderAll();
                saveHistory();
              }
            } else {
              const activeSel = canvas.getActiveObject();
              if (activeSel && activeSel instanceof fabric.ActiveSelection) {
                const objs = (activeSel as fabric.ActiveSelection).getObjects();
                canvas.discardActiveObject();
                const group = new fabric.Group(objs);
                canvas.add(group);
                canvas.setActiveObject(group);
                canvas.requestRenderAll();
                saveHistory();
              }
            }
            return;

          case 'e':
            e.preventDefault();
            if (store.activeLayerId) {
              store.mergeDown(store.activeLayerId);
            }
            return;

          case 's':
            e.preventDefault();
            // Ctrl+S triggers save - handled by MenuBar
            (window as any).__doSaveDraft?.();
            return;

          case 'n':
            if (shift) {
              e.preventDefault();
              store.addLayer();
            } else {
              e.preventDefault();
              // Ctrl+N triggers new project - handled by MenuBar
              (window as any).__showNewProject?.();
            }
            return;

          case '=':
          case '+':
            e.preventDefault();
            zoomBy(1.25);
            return;

          case '-':
            e.preventDefault();
            zoomBy(0.8);
            return;

          case '0':
            e.preventDefault();
            fitToScreen();
            return;

          case '1':
            e.preventDefault();
            setZoomAbsolute(1);
            return;
        }
      }

      // ── Tool shortcuts (single key) ──
      switch (key) {
        case 'v': store.setActiveTool('move'); break;
        case 'm': store.setActiveTool('marquee'); break;
        case 'l': store.setActiveTool('lasso'); break;
        case 'w': store.setActiveTool('magicWand'); break;
        case 'c': store.setActiveTool('crop'); break;
        case 'i': store.setActiveTool('eyedropper'); break;
        case 's': store.setActiveTool('cloneStamp'); break;
        case 'b': store.setActiveTool('brush'); break;
        case 'n': store.setActiveTool('pencil'); break;
        case 'e': store.setActiveTool('eraser'); break;
        case 'g': store.setActiveTool('fill'); break;
        case 'r': store.setActiveTool('blur'); break;
        case 'o': store.setActiveTool('dodge'); break;
        case 'p': store.setActiveTool('pen'); break;
        case 't': store.setActiveTool('text'); break;
        case 'u': store.setActiveTool('rectangle'); break;
        case 'h': store.setActiveTool('hand'); break;
        case 'z': store.setActiveTool('zoom'); break;
        case 'x': store.swapColors(); break;
        case 'd': store.resetColors(); break;
        case ' ':
          if (!store.isSpaceHeld) {
            store.setIsSpaceHeld(true);
            canvas.defaultCursor = 'grab';
          }
          e.preventDefault();
          break;
        case '[':
          store.setBrushSize(store.brushSize - 5);
          break;
        case ']':
          store.setBrushSize(store.brushSize + 5);
          break;
        case 'delete':
        case 'backspace': {
          const activeDel = canvas.getActiveObject();
          if (activeDel && !((activeDel as any) instanceof fabric.IText && (activeDel as any).isEditing)) {
            if (activeDel instanceof fabric.ActiveSelection) {
              (activeDel as fabric.ActiveSelection).forEachObject((o) =>
                canvas.remove(o),
              );
            } else {
              canvas.remove(activeDel);
            }
            canvas.discardActiveObject();
            canvas.requestRenderAll();
            saveHistory();
          }
          break;
        }
      }
    };

    const keyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        useEditorStore.getState().setIsSpaceHeld(false);
        const canvas = useEditorStore.getState().canvas;
        if (canvas) {
          const tool = useEditorStore.getState().activeTool;
          canvas.defaultCursor = TOOL_CURSORS[tool] || 'default';
        }
      }
    };

    window.addEventListener('keydown', handler);
    window.addEventListener('keyup', keyUp);
    return () => {
      window.removeEventListener('keydown', handler);
      window.removeEventListener('keyup', keyUp);
    };
  }, []);
}
