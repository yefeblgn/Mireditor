import React, { useEffect, useRef, useCallback, useState } from 'react';
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

  // ── Right-click context menu state ──
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; target: fabric.FabricObject } | null>(null);

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
      hasBorders: false,
      hoverCursor: 'default',
      strokeWidth: 0,
      lockMovementX: true,
      lockMovementY: true,
      lockRotation: true,
      lockScalingX: true,
      lockScalingY: true,
    });
    (workarea as any).customId = WORKAREA_ID;
    (workarea as any).excludeFromExport = false;
    canvas.add(workarea);

    // ── Prevent workarea from EVER being selected ──
    const filterWorkareaFromSelection = (e: any) => {
      const selected: fabric.FabricObject[] = e.selected || [];
      if (selected.length === 0) return;
      const filtered = selected.filter((o: any) => (o as any).customId !== WORKAREA_ID);
      if (filtered.length === 0) {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
      } else if (filtered.length < selected.length) {
        if (filtered.length === 1) {
          canvas.setActiveObject(filtered[0]);
        } else {
          const sel = new fabric.ActiveSelection(filtered, { canvas });
          canvas.setActiveObject(sel);
        }
        canvas.requestRenderAll();
      }
    };
    canvas.on('selection:created', filterWorkareaFromSelection);
    canvas.on('selection:updated', filterWorkareaFromSelection);

    // ── Prevent workarea from moving (belt + suspenders) ──
    canvas.on('object:moving', (e: any) => {
      if (e.target && (e.target as any).customId === WORKAREA_ID) {
        e.target.set({ left: 0, top: 0 });
        e.target.setCoords();
      }
    });

    // Clip all new objects to the workarea bounds
    canvas.on('object:added', (opt: any) => {
      const obj = opt.target;
      if (!obj) return;
      if ((obj as any).customId === WORKAREA_ID) return;
      if ((obj as any).customId === '__grid__') return;
      if ((obj as any).isMarquee) return;
      if (obj.clipPath) return; // already clipped
      const wa = canvas.getObjects().find((o: any) => (o as any).customId === WORKAREA_ID);
      obj.clipPath = new fabric.Rect({
        left: wa?.left || 0,
        top: wa?.top || 0,
        width: canvasWidth,
        height: canvasHeight,
        absolutePositioned: true,
      });
    });

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
      if ((obj as any).customId === WORKAREA_ID || (obj as any).customId === '__grid__') {
        obj.selectable = false;
        obj.evented = false;
        return;
      }
      obj.selectable = activeTool === 'move';
      obj.evented = activeTool === 'move';
    });

    switch (activeTool) {
      case 'move':
        canvas.selection = true;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        canvas.forEachObject((obj) => {
          if ((obj as any).customId === WORKAREA_ID || (obj as any).customId === '__grid__') {
            obj.selectable = false;
            obj.evented = false;
            return;
          }
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
        const tool = useEditorStore.getState().activeTool;

        if (tool === 'ellipse' && obj instanceof fabric.Ellipse) {
          obj.set({
            left: w > 0 ? sx : pointer2.x,
            top: h > 0 ? sy : pointer2.y,
            rx: Math.abs(w) / 2,
            ry: Math.abs(h) / 2,
          });
        } else if (tool === 'line' && obj instanceof fabric.Line) {
          obj.set({ x2: pointer2.x, y2: pointer2.y });
        } else {
          obj.set({
            left: w > 0 ? sx : pointer2.x,
            top: h > 0 ? sy : pointer2.y,
            width: Math.abs(w),
            height: Math.abs(h),
          });
        }
        canvas.requestRenderAll();
      }
    };

    const onMouseDown = (opt: any) => {
      const e: MouseEvent = opt.e;
      const tool = useEditorStore.getState().activeTool;

      // ── Right-click context menu ──
      if (e.button === 2 || opt.button === 3) {
        const target = opt.target;
        if (target && (target as any).customId !== WORKAREA_ID && (target as any).customId !== '__grid__' && !(target as any).isMarquee) {
          canvas.setActiveObject(target);
          canvas.requestRenderAll();
          setCtxMenu({ x: e.clientX, y: e.clientY, target });
        }
        return;
      }

      // Close context menu on left click
      setCtxMenu(null);

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
        // If clicking on an existing IText/Textbox, just enter editing mode
        const target = opt.target;
        if (target && (target instanceof fabric.IText || target instanceof fabric.Textbox)) {
          canvas.setActiveObject(target);
          (target as fabric.IText).enterEditing();
          return;
        }
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
        text.selectAll();
        saveHistory();
        // Switch to move tool after creating text so clicking doesn't create another
        useEditorStore.getState().setActiveTool('move');
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
            // Auto-switch to move tool after drawing a shape
            useEditorStore.getState().setActiveTool('move');
          }
        }
        currentShape.current = null;
      }
    };

    // Drawing complete — tag path with active layer
    const onPathCreated = (opt: any) => {
      const path = opt.path;
      if (path) {
        const layerId = useEditorStore.getState().activeLayerId;
        (path as any).layerId = layerId;
      }
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

  // ── Layer ↔ Canvas sync ──
  const layers = useEditorStore((s) => s.layers);
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    canvas.getObjects().forEach((obj: any) => {
      const layerId = obj.layerId;
      if (!layerId || obj.customId === WORKAREA_ID || obj.customId === '__grid__') return;

      const layer = layers.find((l) => l.id === layerId);
      if (!layer) return;

      // Sync visibility
      obj.visible = layer.visible;

      // Sync opacity
      obj.opacity = layer.opacity / 100;

      // Sync lock
      const tool = useEditorStore.getState().activeTool;
      if (layer.locked) {
        obj.selectable = false;
        obj.evented = false;
      } else if (tool === 'move') {
        obj.selectable = true;
        obj.evented = true;
      }

      // Sync blend mode
      obj.globalCompositeOperation = (layer.blendMode && layer.blendMode !== 'normal')
        ? layer.blendMode
        : 'source-over';
    });

    // ── Sync z-order: layers[0] is top → should be last in canvas objects ──
    // Fabric.js: higher index = rendered on top
    // layers[]: lower index = higher in panel = should be on top
    const canvasObjects = canvas.getObjects();
    const workareaIdx = canvasObjects.findIndex((o: any) => (o as any).customId === WORKAREA_ID);
    // Build desired order: workarea first (index 0), then layers from bottom (last in array) to top (first in array)
    const reversedLayers = [...layers].reverse(); // bottom layer first
    let nextInsertIdx = workareaIdx + 1;
    for (const layer of reversedLayers) {
      // Find all objects belonging to this layer
      const layerObjs = canvasObjects.filter((o: any) => (o as any).layerId === layer.id);
      for (const obj of layerObjs) {
        const currentIdx = canvas.getObjects().indexOf(obj);
        if (currentIdx !== nextInsertIdx && currentIdx >= 0) {
          canvas.moveTo(obj, nextInsertIdx);
        }
        nextInsertIdx++;
      }
    }

    canvas.requestRenderAll();
  }, [layers]);

  // ── Drag & Drop images ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const canvas = fabricRef.current;
    if (!canvas) return;

    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) return;
        fabric.FabricImage.fromURL(dataUrl).then((img) => {
          const store = useEditorStore.getState();
          const maxW = store.canvasWidth * 0.6;
          if ((img.width || 400) > maxW) img.scaleToWidth(maxW);

          const layerId = store.activeLayerId || store.addLayer({ name: file.name.replace(/\.[^.]+$/, '') });
          (img as any).layerId = layerId;

          canvas.add(img);
          canvas.centerObject(img);
          canvas.setActiveObject(img);
          canvas.requestRenderAll();
          saveHistory();
          // Auto-switch to move tool after dropping an image
          useEditorStore.getState().setActiveTool('move');
        });
      };
      reader.readAsDataURL(file);
    }
  }, [saveHistory]);

  // ── Grid overlay ──
  const { showGrid, showRulers } = useEditorStore();
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

  // ── Ruler state (computed from viewport) ──
  const [rulerState, setRulerState] = useState<{
    zoom: number; panX: number; panY: number;
    containerW: number; containerH: number;
  }>({ zoom: 1, panX: 0, panY: 0, containerW: 0, containerH: 0 });

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || !showRulers) return;
    const update = () => {
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      const container = (canvas as any).wrapperEl?.parentElement;
      setRulerState({
        zoom: vpt[0],
        panX: vpt[4],
        panY: vpt[5],
        containerW: container?.offsetWidth || 0,
        containerH: container?.offsetHeight || 0,
      });
    };
    update();
    canvas.on('after:render', update);
    return () => { canvas.off('after:render', update); };
  }, [showRulers]);

  // ── Context menu actions ──
  const ctxAction = useCallback((action: string) => {
    const canvas = fabricRef.current;
    if (!canvas || !ctxMenu) return;
    const obj = ctxMenu.target;

    switch (action) {
      case 'bringToFront':
        canvas.bringObjectToFront(obj);
        break;
      case 'bringForward':
        canvas.bringObjectForward(obj);
        break;
      case 'sendToBack': {
        canvas.sendObjectToBack(obj);
        // Make sure workarea stays at bottom
        const wa = canvas.getObjects().find((o: any) => (o as any).customId === WORKAREA_ID);
        if (wa) canvas.sendObjectToBack(wa);
        break;
      }
      case 'sendBackward': {
        canvas.sendObjectBackwards(obj);
        // Make sure obj doesn't go behind workarea
        const wa2 = canvas.getObjects().find((o: any) => (o as any).customId === WORKAREA_ID);
        if (wa2) {
          const waIdx = canvas.getObjects().indexOf(wa2);
          const objIdx = canvas.getObjects().indexOf(obj);
          if (objIdx <= waIdx) canvas.bringObjectForward(obj);
        }
        break;
      }
      case 'delete':
        canvas.remove(obj);
        canvas.discardActiveObject();
        break;
      case 'flipH':
        obj.set('flipX', !obj.flipX);
        break;
      case 'flipV':
        obj.set('flipY', !obj.flipY);
        break;
      case 'rotateCW':
        obj.rotate((obj.angle || 0) + 90);
        break;
      case 'rotateCCW':
        obj.rotate((obj.angle || 0) - 90);
        break;
      case 'duplicate':
        obj.clone().then((cloned: any) => {
          cloned.set({ left: (cloned.left || 0) + 20, top: (cloned.top || 0) + 20 });
          const layerId = (obj as any).layerId;
          if (layerId) (cloned as any).layerId = layerId;
          canvas.add(cloned);
          canvas.setActiveObject(cloned);
        });
        break;
    }

    obj.setCoords();
    canvas.requestRenderAll();
    saveHistory();
    setCtxMenu(null);
  }, [ctxMenu, saveHistory]);

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-[#1a1a1a]"
      style={{ cursor: TOOL_CURSORS[activeTool] || 'default' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <canvas ref={canvasElRef} />

      {/* ── Rulers (HTML overlay — NOT canvas objects) ── */}
      {showRulers && (
        <>
          {/* Top ruler */}
          <div className="absolute top-0 left-0 right-0 h-5 bg-[#1e1e1e] border-b border-[#333] z-[50] overflow-hidden pointer-events-none" style={{ marginLeft: 20 }}>
            <RulerTicks direction="horizontal" zoom={rulerState.zoom} pan={rulerState.panX - 20} size={rulerState.containerW} />
          </div>
          {/* Left ruler */}
          <div className="absolute top-0 left-0 bottom-0 w-5 bg-[#1e1e1e] border-r border-[#333] z-[50] overflow-hidden pointer-events-none" style={{ marginTop: 20 }}>
            <RulerTicks direction="vertical" zoom={rulerState.zoom} pan={rulerState.panY - 20} size={rulerState.containerH} />
          </div>
          {/* Corner square */}
          <div className="absolute top-0 left-0 w-5 h-5 bg-[#1e1e1e] border-r border-b border-[#333] z-[51] pointer-events-none" />
        </>
      )}

      {/* ── Right-click context menu ── */}
      {ctxMenu && (
        <>
          <div
            className="fixed inset-0 z-[400]"
            onMouseDown={(e) => {
              // Only close if clicking outside the menu
              const menu = document.getElementById('ctx-menu-panel');
              if (menu && menu.contains(e.target as Node)) return;
              setCtxMenu(null);
            }}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }}
          />
          <div
            id="ctx-menu-panel"
            className="fixed bg-[#222] border border-[#3a3a3a] rounded-lg shadow-xl shadow-black/50 py-1 min-w-[180px] z-[401] select-none"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            <CtxMenuItem label="Öne Getir" onClick={() => ctxAction('bringToFront')} />
            <CtxMenuItem label="Bir Öne Al" onClick={() => ctxAction('bringForward')} />
            <CtxMenuItem label="Arkaya Gönder" onClick={() => ctxAction('sendToBack')} />
            <CtxMenuItem label="Bir Arkaya Al" onClick={() => ctxAction('sendBackward')} />
            <div className="h-px bg-[#333] my-1 mx-2" />
            <CtxMenuItem label="Çoğalt" onClick={() => ctxAction('duplicate')} />
            <div className="h-px bg-[#333] my-1 mx-2" />
            <CtxMenuItem label="Yatay Çevir" onClick={() => ctxAction('flipH')} />
            <CtxMenuItem label="Dikey Çevir" onClick={() => ctxAction('flipV')} />
            <CtxMenuItem label="90° Saat Yönünde Döndür" onClick={() => ctxAction('rotateCW')} />
            <CtxMenuItem label="90° Saat Yönü Tersi Döndür" onClick={() => ctxAction('rotateCCW')} />
            <div className="h-px bg-[#333] my-1 mx-2" />
            <CtxMenuItem label="Sil" onClick={() => ctxAction('delete')} danger />
          </div>
        </>
      )}
    </div>
  );
}

// ── Ruler tick marks component ──
function RulerTicks({ direction, zoom, pan, size }: { direction: 'horizontal' | 'vertical'; zoom: number; pan: number; size: number }) {
  const ticks: React.ReactNode[] = [];
  // Determine step based on zoom level
  let step = 100;
  if (zoom > 2) step = 25;
  else if (zoom > 0.5) step = 50;
  else if (zoom < 0.2) step = 200;

  const start = Math.floor(-pan / zoom / step) * step - step;
  const end = Math.ceil((size - pan) / zoom / step) * step + step;

  for (let val = start; val <= end; val += step) {
    const pos = val * zoom + pan;
    if (pos < 0 || pos > size) continue;

    if (direction === 'horizontal') {
      ticks.push(
        <React.Fragment key={val}>
          <div className="absolute top-0 h-full" style={{ left: pos, width: 1, backgroundColor: '#444' }} />
          <span className="absolute text-[8px] text-[#777] select-none" style={{ left: pos + 2, top: 2 }}>{val}</span>
        </React.Fragment>
      );
      // Minor ticks
      for (let m = 1; m < 5; m++) {
        const mPos = (val + (step / 5) * m) * zoom + pan;
        if (mPos > 0 && mPos < size) {
          ticks.push(<div key={`${val}-m${m}`} className="absolute bottom-0" style={{ left: mPos, width: 1, height: m === 2 || m === 3 ? 6 : 4, backgroundColor: '#3a3a3a' }} />);
        }
      }
    } else {
      ticks.push(
        <React.Fragment key={val}>
          <div className="absolute left-0 w-full" style={{ top: pos, height: 1, backgroundColor: '#444' }} />
          <span className="absolute text-[8px] text-[#777] select-none" style={{ top: pos + 2, left: 2, writingMode: 'vertical-lr' }}>{val}</span>
        </React.Fragment>
      );
      for (let m = 1; m < 5; m++) {
        const mPos = (val + (step / 5) * m) * zoom + pan;
        if (mPos > 0 && mPos < size) {
          ticks.push(<div key={`${val}-m${m}`} className="absolute right-0" style={{ top: mPos, height: 1, width: m === 2 || m === 3 ? 6 : 4, backgroundColor: '#3a3a3a' }} />);
        }
      }
    }
  }

  return <>{ticks}</>;
}

// ── Context menu item component ──
function CtxMenuItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/20' : 'text-[#ccc] hover:bg-[#3b82f6] hover:text-white'}`}
      style={{ cursor: 'default' }}
    >
      {label}
    </button>
  );
}

// ── Export helpers (used by MenuBar) ──
export function exportCanvasPNG(canvas: any, width: number, height: number): string | null {
  if (!canvas) return null;
  const workarea = canvas.getObjects().find((o: any) => o.customId === WORKAREA_ID);
  if (!workarea) return null;

  const left = workarea.left || 0;
  const top = workarea.top || 0;

  // Hide grid/ruler objects before export
  const hiddenObjs: any[] = [];
  canvas.getObjects().forEach((obj: any) => {
    if (obj.customId === '__grid__') {
      hiddenObjs.push({ obj, visible: obj.visible });
      obj.visible = false;
    }
  });

  // Save current viewport, reset it for clean export
  const vpt = canvas.viewportTransform!.slice();
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];
  canvas.setDimensions({ width, height });

  const dataUrl = canvas.toDataURL({
    format: 'png',
    left,
    top,
    width,
    height,
    multiplier: 1,
  });

  // Restore viewport
  canvas.viewportTransform = vpt;
  const container = (canvas as any).wrapperEl?.parentElement;
  if (container) {
    canvas.setDimensions({ width: container.offsetWidth, height: container.offsetHeight });
  }

  // Restore hidden objects
  hiddenObjs.forEach(({ obj, visible }) => { obj.visible = visible; });

  canvas.requestRenderAll();
  return dataUrl;
}

export function getCanvasJSON(canvas: any): string | null {
  if (!canvas) return null;
  return JSON.stringify(canvas.toJSON(['customId', 'layerId', 'isMarquee']));
}

export function loadCanvasJSON(canvas: any, json: string): Promise<void> {
  if (!canvas) return Promise.resolve();
  return canvas.loadFromJSON(json).then(() => {
    canvas.requestRenderAll();
  });
}

// ── Thumbnail helpers ──
export function getCanvasThumbnail(canvas: any, cw: number, ch: number, thumbW = 200): string | null {
  if (!canvas) return null;
  const workarea = canvas.getObjects().find((o: any) => o.customId === WORKAREA_ID);
  if (!workarea) return null;

  const left = workarea.left || 0;
  const top = workarea.top || 0;
  const scale = thumbW / cw;

  const vpt = canvas.viewportTransform!.slice();
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];

  const dataUrl = canvas.toDataURL({
    format: 'png',
    left,
    top,
    width: cw,
    height: ch,
    multiplier: scale,
  });

  canvas.viewportTransform = vpt;
  canvas.requestRenderAll();
  return dataUrl;
}

export function getLayerThumbnail(
  canvas: any,
  layerId: string,
  cw: number,
  ch: number,
  thumbW = 48,
  thumbH = 32,
): string | null {
  if (!canvas) return null;
  const objects = canvas.getObjects().filter(
    (o: any) => (o as any).layerId === layerId && (o as any).customId !== WORKAREA_ID && (o as any).customId !== '__grid__',
  );
  if (objects.length === 0) return null;

  // Temporarily hide non-layer objects, show only this layer's objects
  const allObjs = canvas.getObjects();
  const visibilityMap = new Map<any, boolean>();
  allObjs.forEach((obj: any) => {
    visibilityMap.set(obj, obj.visible);
    if ((obj as any).customId === WORKAREA_ID) {
      obj.visible = true; // keep workarea as background
    } else if ((obj as any).layerId === layerId) {
      obj.visible = true;
    } else {
      obj.visible = false;
    }
  });

  const workarea = allObjs.find((o: any) => (o as any).customId === WORKAREA_ID);
  const left = workarea?.left || 0;
  const top = workarea?.top || 0;
  const scale = thumbW / cw;

  const vpt = canvas.viewportTransform!.slice();
  canvas.viewportTransform = [1, 0, 0, 1, 0, 0];

  const dataUrl = canvas.toDataURL({
    format: 'png',
    left,
    top,
    width: cw,
    height: ch,
    multiplier: scale,
  });

  canvas.viewportTransform = vpt;

  // Restore visibility
  allObjs.forEach((obj: any) => {
    obj.visible = visibilityMap.get(obj) ?? true;
  });
  canvas.requestRenderAll();
  return dataUrl;
}

// ── Reset canvas for new project ──
export function resetCanvas(canvas: any, width: number, height: number, bg: string) {
  if (!canvas) return;
  canvas.clear();
  canvas.backgroundColor = '#1a1a1a';

  const workarea = new fabric.Rect({
    width,
    height,
    fill: bg || '#ffffff',
    selectable: false,
    evented: false,
    hasControls: false,
    hasBorders: false,
    hoverCursor: 'default',
    strokeWidth: 0,
    lockMovementX: true,
    lockMovementY: true,
    lockRotation: true,
    lockScalingX: true,
    lockScalingY: true,
  });
  (workarea as any).customId = WORKAREA_ID;
  canvas.add(workarea);

  // Center and zoom
  const container = (canvas as any).wrapperEl?.parentElement;
  if (container) {
    const w = container.offsetWidth;
    const h = container.offsetHeight;
    const zx = (w - 80) / width;
    const zy = (h - 80) / height;
    const z = Math.min(zx, zy, 1);
    canvas.setZoom(z);
    const center = workarea.getCenterPoint();
    canvas.viewportTransform![4] = w / 2 - center.x * z;
    canvas.viewportTransform![5] = h / 2 - center.y * z;
    useEditorStore.getState().setZoom(Math.round(z * 100));
  }

  canvas.requestRenderAll();
}
