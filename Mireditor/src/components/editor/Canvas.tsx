import React, { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { useEditorStore, ToolType } from '../../store/useEditorStore';

const WORKAREA_ID = '__workarea__';

// ── Cursor map ──
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

export function EditorCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const isPanning = useRef(false);
  const lastPan = useRef({ x: 0, y: 0 });
  const isDrawingShape = useRef(false);
  const shapeStart = useRef({ x: 0, y: 0 });
  const currentShape = useRef<fabric.FabricObject | null>(null);

  const {
    activeTool,
    canvasWidth,
    canvasHeight,
    projectBg,
    foregroundColor,
    brushSize,
    brushOpacity,
    setZoom,
    setCanvas,
    setCursorPos,
    setForegroundColor,
    pushHistory,
    activeLayerId,
    setModified,
  } = useEditorStore();

  // ── Initialize canvas ──
  useEffect(() => {
    if (!containerRef.current || !canvasElRef.current) return;
    if (fabricRef.current) return;

    const container = containerRef.current;
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: w,
      height: h,
      backgroundColor: '#1a1a1a',
      selection: true,
      preserveObjectStacking: true,
      enableRetinaScaling: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Workarea (the "document")
    const workarea = new fabric.Rect({
      width: canvasWidth,
      height: canvasHeight,
      fill: projectBg || '#ffffff',
      selectable: false,
      evented: false,
      hasControls: false,
      hoverCursor: 'default',
      strokeWidth: 0,
    });
    (workarea as any).customId = WORKAREA_ID;
    (workarea as any).excludeFromExport = false;
    canvas.add(workarea);

    // Center and zoom to fit
    const zoomX = (w - 80) / canvasWidth;
    const zoomY = (h - 80) / canvasHeight;
    const initialZoom = Math.min(zoomX, zoomY, 1);

    canvas.setZoom(initialZoom);
    const workareaCenter = workarea.getCenterPoint();
    const vpCenter = new fabric.Point(w / 2, h / 2);
    const panX = vpCenter.x - workareaCenter.x * initialZoom;
    const panY = vpCenter.y - workareaCenter.y * initialZoom;
    canvas.viewportTransform![4] = panX;
    canvas.viewportTransform![5] = panY;
    canvas.requestRenderAll();

    useEditorStore.getState().setZoom(Math.round(initialZoom * 100));

    fabricRef.current = canvas;
    setCanvas(canvas);

    // Add default layer
    if (useEditorStore.getState().layers.length === 0) {
      useEditorStore.getState().addLayer({ name: 'Arka Plan' });
    }

    // Push initial history
    const json = JSON.stringify(canvas.toJSON());
    pushHistory(json);

    // Resize observer
    const ro = new ResizeObserver(() => {
      const cw = container.offsetWidth;
      const ch = container.offsetHeight;
      canvas.setDimensions({ width: cw, height: ch });
      canvas.requestRenderAll();
    });
    ro.observe(container);

    return () => {
      ro.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save history helper ──
  const saveHistory = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const json = JSON.stringify(canvas.toJSON());
    pushHistory(json);
    setModified(true);
  }, [pushHistory, setModified]);

  // ── Tool mode changes ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Reset modes
    canvas.isDrawingMode = false;
    canvas.selection = false;
    canvas.defaultCursor = TOOL_CURSORS[activeTool] || 'default';
    canvas.hoverCursor = TOOL_CURSORS[activeTool] || 'default';

    canvas.forEachObject((obj) => {
      if ((obj as any).customId === WORKAREA_ID) return;
      obj.selectable = activeTool === 'move';
      obj.evented = activeTool === 'move';
    });

    switch (activeTool) {
      case 'move':
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.forEachObject((obj) => {
          if ((obj as any).customId === WORKAREA_ID) return;
          obj.selectable = true;
          obj.evented = true;
        });
        break;

      case 'brush':
      case 'pencil': {
        canvas.isDrawingMode = true;
        const brush = new fabric.PencilBrush(canvas);
        brush.width = brushSize;
        brush.color = foregroundColor;
        (brush as any).opacity = brushOpacity / 100;
        canvas.freeDrawingBrush = brush;
        break;
      }

      case 'eraser': {
        canvas.isDrawingMode = true;
        const eraser = new fabric.PencilBrush(canvas);
        eraser.width = brushSize;
        eraser.color = projectBg || '#ffffff';
        canvas.freeDrawingBrush = eraser;
        break;
      }

      case 'hand':
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        break;

      case 'zoom':
        canvas.defaultCursor = 'zoom-in';
        canvas.hoverCursor = 'zoom-in';
        break;

      default:
        break;
    }

    canvas.requestRenderAll();
  }, [activeTool, brushSize, foregroundColor, brushOpacity, projectBg]);

  // ── Canvas events ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Mouse move → cursor position
    const onMouseMove = (opt: any) => {
      const e: MouseEvent = opt.e;
      if (!e.clientX && e.clientX !== 0) return;
      const pointer = canvas.getScenePoint(e);
      setCursorPos({ x: Math.round(pointer.x), y: Math.round(pointer.y) });

      // Panning
      if (isPanning.current && (activeTool === 'hand' || useEditorStore.getState().isSpaceHeld)) {
        const dx = e.clientX - lastPan.current.x;
        const dy = e.clientY - lastPan.current.y;
        canvas.relativePan(new fabric.Point(dx, dy));
        lastPan.current = { x: e.clientX, y: e.clientY };
        canvas.defaultCursor = 'grabbing';
        return;
      }

      // Drawing shapes
      if (isDrawingShape.current && currentShape.current) {
        const pointer2 = canvas.getScenePoint(e);
        const sx = shapeStart.current.x;
        const sy = shapeStart.current.y;
        const w = pointer2.x - sx;
        const h = pointer2.y - sy;

        const obj = currentShape.current;
        obj.set({
          left: w > 0 ? sx : pointer2.x,
          top: h > 0 ? sy : pointer2.y,
          width: Math.abs(w),
          height: Math.abs(h),
        });
        canvas.requestRenderAll();
      }
    };

    const onMouseDown = (opt: any) => {
      const e: MouseEvent = opt.e;
      const tool = useEditorStore.getState().activeTool;

      // Hand / Space panning
      if (tool === 'hand' || useEditorStore.getState().isSpaceHeld) {
        isPanning.current = true;
        lastPan.current = { x: e.clientX, y: e.clientY };
        canvas.defaultCursor = 'grabbing';
        return;
      }

      // Zoom click
      if (tool === 'zoom') {
        const currentZoom = canvas.getZoom();
        const newZoom = e.altKey
          ? Math.max(currentZoom * 0.8, 0.01)
          : Math.min(currentZoom * 1.25, 64);
        canvas.zoomToPoint(new fabric.Point(e.offsetX, e.offsetY), newZoom);
        useEditorStore.getState().setZoom(Math.round(newZoom * 100));
        canvas.requestRenderAll();
        return;
      }

      // Eyedropper
      if (tool === 'eyedropper') {
        const pointer = canvas.getScenePoint(e);
        const ctx = canvas.getContext();
        const vpt = canvas.viewportTransform!;
        const px = pointer.x * vpt[0] + vpt[4];
        const py = pointer.y * vpt[3] + vpt[5];
        const pixel = ctx.getImageData(Math.round(px), Math.round(py), 1, 1).data;
        const hex = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
        setForegroundColor(hex);
        return;
      }

      // Fill tool
      if (tool === 'fill') {
        const target = canvas.findTarget(e);
        if (target && (target as any).customId !== WORKAREA_ID) {
          target.set('fill', useEditorStore.getState().foregroundColor);
          canvas.requestRenderAll();
          saveHistory();
        }
        return;
      }

      // Text tool
      if (tool === 'text') {
        const pointer = canvas.getScenePoint(e);
        const text = new fabric.IText('Metin yazın', {
          left: pointer.x,
          top: pointer.y,
          fontSize: 24,
          fill: useEditorStore.getState().foregroundColor,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          editable: true,
        });
        const layerId = useEditorStore.getState().activeLayerId;
        (text as any).layerId = layerId;
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        saveHistory();
        return;
      }

      // Shape tools
      if (['rectangle', 'ellipse', 'line'].includes(tool)) {
        const pointer = canvas.getScenePoint(e);
        shapeStart.current = { x: pointer.x, y: pointer.y };
        isDrawingShape.current = true;

        let shape: fabric.FabricObject;
        const fg = useEditorStore.getState().foregroundColor;

        if (tool === 'rectangle') {
          shape = new fabric.Rect({
            left: pointer.x,
            top: pointer.y,
            width: 0,
            height: 0,
            fill: 'transparent',
            stroke: fg,
            strokeWidth: 2,
          });
        } else if (tool === 'ellipse') {
          shape = new fabric.Ellipse({
            left: pointer.x,
            top: pointer.y,
            rx: 0,
            ry: 0,
            fill: 'transparent',
            stroke: fg,
            strokeWidth: 2,
          });
        } else {
          shape = new fabric.Line(
            [pointer.x, pointer.y, pointer.x, pointer.y],
            {
              stroke: fg,
              strokeWidth: 2,
            },
          );
        }

        const layerId = useEditorStore.getState().activeLayerId;
        (shape as any).layerId = layerId;
        currentShape.current = shape;
        canvas.add(shape);
        canvas.requestRenderAll();
        return;
      }

      // Marquee selection
      if (tool === 'marquee' || tool === 'ellipseMarquee') {
        const pointer = canvas.getScenePoint(e);
        shapeStart.current = { x: pointer.x, y: pointer.y };
        isDrawingShape.current = true;

        const sel = tool === 'marquee'
          ? new fabric.Rect({
              left: pointer.x,
              top: pointer.y,
              width: 0,
              height: 0,
              fill: 'rgba(59,130,246,0.15)',
              stroke: '#3b82f6',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            })
          : new fabric.Ellipse({
              left: pointer.x,
              top: pointer.y,
              rx: 0,
              ry: 0,
              fill: 'rgba(59,130,246,0.15)',
              stroke: '#3b82f6',
              strokeWidth: 1,
              strokeDashArray: [4, 4],
              selectable: false,
              evented: false,
            });
        (sel as any).isMarquee = true;
        currentShape.current = sel;
        canvas.add(sel);
        return;
      }
    };

    const onMouseUp = () => {
      const tool = useEditorStore.getState().activeTool;

      if (isPanning.current) {
        isPanning.current = false;
        canvas.defaultCursor =
          tool === 'hand' ? 'grab' : TOOL_CURSORS[tool] || 'default';
        return;
      }

      if (isDrawingShape.current && currentShape.current) {
        isDrawingShape.current = false;
        const obj = currentShape.current;

        // Remove tiny shapes
        const w = (obj as any).width || (obj as any).rx * 2 || 0;
        const h = (obj as any).height || (obj as any).ry * 2 || 0;
        if (w < 3 && h < 3) {
          canvas.remove(obj);
        } else {
          if ((obj as any).isMarquee) {
            // Keep marquee as visual selection indicator
          } else {
            obj.setCoords();
            canvas.setActiveObject(obj);
            saveHistory();
          }
        }
        currentShape.current = null;
      }
    };

    // Drawing complete
    const onPathCreated = () => {
      saveHistory();
    };

    // Object modified
    const onObjectModified = () => {
      saveHistory();
    };

    // Mouse wheel zoom
    const onWheel = (opt: any) => {
      opt.e.preventDefault();
      opt.e.stopPropagation();
      const delta = opt.e.deltaY;
      const currentZoom = canvas.getZoom();
      let newZoom = delta > 0
        ? currentZoom * 0.92
        : currentZoom * 1.08;
      newZoom = Math.max(0.01, Math.min(64, newZoom));
      canvas.zoomToPoint(
        new fabric.Point(opt.e.offsetX, opt.e.offsetY),
        newZoom,
      );
      useEditorStore.getState().setZoom(Math.round(newZoom * 100));
      canvas.requestRenderAll();
    };

    canvas.on('mouse:move', onMouseMove as any);
    canvas.on('mouse:down', onMouseDown as any);
    canvas.on('mouse:up', onMouseUp as any);
    canvas.on('path:created', onPathCreated as any);
    canvas.on('object:modified', onObjectModified as any);
    canvas.on('mouse:wheel', onWheel as any);

    return () => {
      canvas.off('mouse:move', onMouseMove as any);
      canvas.off('mouse:down', onMouseDown as any);
      canvas.off('mouse:up', onMouseUp as any);
      canvas.off('path:created', onPathCreated as any);
      canvas.off('object:modified', onObjectModified as any);
      canvas.off('mouse:wheel', onWheel as any);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, saveHistory]);

  // ── Brush size/color updates ──
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !canvas.isDrawingMode || !canvas.freeDrawingBrush) return;
    canvas.freeDrawingBrush.width = brushSize;
    if (activeTool !== 'eraser') {
      canvas.freeDrawingBrush.color = foregroundColor;
    }
  }, [brushSize, foregroundColor, activeTool]);

  // ── Grid overlay ──
  const { showGrid } = useEditorStore();
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    // Remove old grid
    canvas.getObjects().forEach((o: any) => {
      if (o.customId === '__grid__') canvas.remove(o);
    });

    if (showGrid) {
      const gridSize = 50;
      const lines: fabric.FabricObject[] = [];
      for (let i = 0; i <= canvasWidth; i += gridSize) {
        const line = new fabric.Line([i, 0, i, canvasHeight], {
          stroke: 'rgba(255,255,255,0.06)',
          strokeWidth: 0.5,
          selectable: false,
          evented: false,
        });
        (line as any).customId = '__grid__';
        lines.push(line);
      }
      for (let j = 0; j <= canvasHeight; j += gridSize) {
        const line = new fabric.Line([0, j, canvasWidth, j], {
          stroke: 'rgba(255,255,255,0.06)',
          strokeWidth: 0.5,
          selectable: false,
          evented: false,
        });
        (line as any).customId = '__grid__';
        lines.push(line);
      }
      lines.forEach((l) => canvas.add(l));
      canvas.requestRenderAll();
    }
  }, [showGrid, canvasWidth, canvasHeight]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#1a1a1a]"
      style={{ cursor: TOOL_CURSORS[activeTool] || 'default' }}
    >
      <canvas ref={canvasElRef} />
    </div>
  );
}

// ── Export helpers (used by MenuBar) ──
export function exportCanvasPNG(canvas: any, width: number, height: number): string | null {
  if (!canvas) return null;
  const workarea = canvas.getObjects().find((o: any) => o.customId === WORKAREA_ID);
  if (!workarea) return null;

  const left = workarea.left || 0;
  const top = workarea.top || 0;

  return canvas.toDataURL({
    format: 'png',
    left,
    top,
    width,
    height,
    multiplier: 1,
  });
}

export function getCanvasJSON(canvas: any): string | null {
  if (!canvas) return null;
  return JSON.stringify(canvas.toJSON(['customId', 'layerId']));
}

export function loadCanvasJSON(canvas: any, json: string): Promise<void> {
  if (!canvas) return Promise.resolve();
  return canvas.loadFromJSON(json).then(() => {
    canvas.requestRenderAll();
  });
}
