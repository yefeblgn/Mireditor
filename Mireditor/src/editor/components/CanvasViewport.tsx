import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { compositeDocument, getCheckerPattern } from '../render/Compositor';
import { getTool } from '../tools';
import type { PointerInfo } from '../tools/types';
import type { Layer } from '../model/types';
import { renderTextLayer } from '../render/text';

interface Point2D {
  x: number;
  y: number;
}

interface Props {
  onCursor?: (x: number, y: number) => void;
}

export function CanvasViewport({ onCursor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const compositeRef = useRef<HTMLCanvasElement>(document.createElement('canvas'));
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const dragRef = useRef<{ down: boolean; panning: boolean; lastSX: number; lastSY: number; lastDocX: number; lastDocY: number; spaceDown: boolean }>({
    down: false,
    panning: false,
    lastSX: 0,
    lastSY: 0,
    lastDocX: 0,
    lastDocY: 0,
    spaceDown: false,
  });
  const dashRef = useRef(0);
  const lastDocIdRef = useRef<string | null>(null);

  const doc = useEditorStore((s) => s.doc);
  const view = useEditorStore((s) => s.view);
  const selection = useEditorStore((s) => s.selection);
  const renderVersion = useEditorStore((s) => s.renderVersion);
  const activeTool = useEditorStore((s) => s.activeTool);

  const activeLayer = doc ? doc.layers.find((l) => l.id === doc.activeLayerId) : null;

  // Interactive Transform State
  const transformRef = useRef<{
    active: boolean;
    handle: string | null; // 'tl', 'tr', 'br', 'bl', 't', 'r', 'b', 'l', 'rotate', 'move'
    originalX: number;
    originalY: number;
    originalWidth: number;
    originalHeight: number;
    originalCanvas: HTMLCanvasElement | null;
    originalType: 'raster' | 'text' | 'shape' | 'adjustment' | 'group';
    scaleX: number;
    scaleY: number;
    rotation: number; // in radians
    tx: number;
    ty: number;
    startMouseX: number;
    startMouseY: number;
    startScaleX: number;
    startScaleY: number;
    startRotation: number;
    startTx: number;
    startTy: number;
  }>({
    active: false,
    handle: null,
    originalX: 0,
    originalY: 0,
    originalWidth: 0,
    originalHeight: 0,
    originalCanvas: null,
    originalType: 'raster',
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    tx: 0,
    ty: 0,
    startMouseX: 0,
    startMouseY: 0,
    startScaleX: 1,
    startScaleY: 1,
    startRotation: 0,
    startTx: 0,
    startTy: 0,
  });

  const getTransformGeometry = useCallback((tr: typeof transformRef.current) => {
    const w0 = tr.originalWidth;
    const h0 = tr.originalHeight;
    const cx = tr.originalX + w0 / 2 + tr.tx;
    const cy = tr.originalY + h0 / 2 + tr.ty;
    const theta = tr.rotation;
    const scaleX = tr.scaleX;
    const scaleY = tr.scaleY;

    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    const localToScreen = (lx: number, ly: number): Point2D => {
      const sx = lx * scaleX;
      const sy = ly * scaleY;
      const rx = sx * cos - sy * sin;
      const ry = sx * sin + sy * cos;
      const wx = cx + rx;
      const wy = cy + ry;
      return {
        x: view.panX + wx * view.zoom,
        y: view.panY + wy * view.zoom
      };
    };

    const hw = w0 / 2;
    const hh = h0 / 2;

    const p_tl = localToScreen(-hw, -hh);
    const p_tr = localToScreen(hw, -hh);
    const p_br = localToScreen(hw, hh);
    const p_bl = localToScreen(-hw, hh);

    const p_t = localToScreen(0, -hh);
    const p_r = localToScreen(hw, 0);
    const p_b = localToScreen(0, hh);
    const p_l = localToScreen(-hw, 0);

    const p_rot = localToScreen(0, -hh - 25 / view.zoom);

    return { p_tl, p_tr, p_br, p_bl, p_t, p_r, p_b, p_l, p_rot, cx, cy, w0, h0, theta };
  }, [view]);

  const getHoverHandle = useCallback((smx: number, smy: number) => {
    const tr = transformRef.current;
    if (!tr.active) return null;
    const geom = getTransformGeometry(tr);

    const dist = (p1: Point2D, p2: Point2D) => {
      return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
    };

    const m = { x: smx, y: smy };
    const threshold = 8;

    if (dist(m, geom.p_rot) <= threshold) return 'rotate';
    if (dist(m, geom.p_tl) <= threshold) return 'tl';
    if (dist(m, geom.p_tr) <= threshold) return 'tr';
    if (dist(m, geom.p_br) <= threshold) return 'br';
    if (dist(m, geom.p_bl) <= threshold) return 'bl';
    if (dist(m, geom.p_t) <= threshold) return 't';
    if (dist(m, geom.p_r) <= threshold) return 'r';
    if (dist(m, geom.p_b) <= threshold) return 'b';
    if (dist(m, geom.p_l) <= threshold) return 'l';

    const docPt = screenToDoc(smx, smy);
    const lcos = Math.cos(-geom.theta);
    const lsin = Math.sin(-geom.theta);
    const rx = docPt.x - geom.cx;
    const ry = docPt.y - geom.cy;
    const localMX = rx * lcos - ry * lsin;
    const localMY = rx * lsin + ry * lcos;

    if (
      Math.abs(localMX) <= (geom.w0 / 2) * Math.abs(tr.scaleX) &&
      Math.abs(localMY) <= (geom.h0 / 2) * Math.abs(tr.scaleY)
    ) {
      return 'move';
    }

    return null;
  }, [getTransformGeometry]);

  // ── Kompoziti güncelle ──
  useEffect(() => {
    if (doc) compositeDocument(doc, compositeRef.current);
  }, [doc, renderVersion]);

  // ── Ekrana çiz ──
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { dpr } = sizeRef.current;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#181818';
    ctx.fillRect(0, 0, cw, ch);

    if (!doc) return;
    const { zoom, panX, panY } = useEditorStore.getState().view;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Şeffaflık deseni + belge
    const pattern = getCheckerPattern(ctx);
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, doc.width, doc.height);
    }
    ctx.imageSmoothingEnabled = zoom < 4; // büyük zoom'da keskin pikseller
    ctx.drawImage(compositeRef.current, 0, 0);

    // Belge çerçevesi
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(panX + 0.5, panY + 0.5, doc.width * zoom, doc.height * zoom);

    // Seçim (marching ants)
    const sel = useEditorStore.getState().selection;
    if (sel && sel.width > 0 && sel.height > 0) {
      const sx = panX + sel.x * zoom;
      const sy = panY + sel.y * zoom;
      const sw = sel.width * zoom;
      const sh = sel.height * zoom;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = -dashRef.current;
      ctx.strokeStyle = '#000';
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
      ctx.lineDashOffset = -dashRef.current + 4;
      ctx.strokeStyle = '#fff';
      ctx.strokeRect(sx + 0.5, sy + 0.5, sw, sh);
      ctx.setLineDash([]);
    }

    // Transform Bounding Box & Handles
    const tr = transformRef.current;
    if (activeTool === 'transform' && tr.active) {
      const geom = getTransformGeometry(tr);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Bounding box çizimi
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(geom.p_tl.x, geom.p_tl.y);
      ctx.lineTo(geom.p_tr.x, geom.p_tr.y);
      ctx.lineTo(geom.p_br.x, geom.p_br.y);
      ctx.lineTo(geom.p_bl.x, geom.p_bl.y);
      ctx.closePath();
      ctx.stroke();

      // Döndürme kolu çizgisi
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(geom.p_t.x, geom.p_t.y);
      ctx.lineTo(geom.p_rot.x, geom.p_rot.y);
      ctx.stroke();

      const drawHandle = (pt: Point2D, isRot = false) => {
        ctx.beginPath();
        if (isRot) {
          ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#3b82f6';
        } else {
          ctx.rect(pt.x - 4, pt.y - 4, 8, 8);
          ctx.fillStyle = '#ffffff';
        }
        ctx.fill();
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      };

      drawHandle(geom.p_tl);
      drawHandle(geom.p_tr);
      drawHandle(geom.p_br);
      drawHandle(geom.p_bl);
      drawHandle(geom.p_t);
      drawHandle(geom.p_r);
      drawHandle(geom.p_b);
      drawHandle(geom.p_l);
      drawHandle(geom.p_rot, true);

      ctx.restore();
    }
  }, [doc, activeTool, getTransformGeometry]);

  // ── Boyutlandırma ──
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      draw();
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [draw]);

  // ── Yeni belge yüklendiğinde sığdır ──
  useEffect(() => {
    if (!doc) return;
    if (lastDocIdRef.current === doc.id) return;
    lastDocIdRef.current = doc.id;
    fitToScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // ── Çizim tetikleyici ──
  useEffect(() => {
    draw();
  }, [draw, view, selection, renderVersion, doc]);

  // ── Marching ants animasyonu ──
  useEffect(() => {
    if (!selection) return;
    let raf = 0;
    const tick = () => {
      dashRef.current = (dashRef.current + 0.5) % 8;
      draw();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selection, draw]);

  function fitToScreen() {
    const d = useEditorStore.getState().doc;
    const { w, h } = sizeRef.current;
    if (!d || w === 0) return;
    const margin = 60;
    const zoom = Math.min((w - margin) / d.width, (h - margin) / d.height, 1);
    const panX = (w - d.width * zoom) / 2;
    const panY = (h - d.height * zoom) / 2;
    useEditorStore.getState().setView({ zoom, panX, panY });
  }

  // ── Koordinat dönüşümü ──
  const screenToDoc = (sx: number, sy: number) => {
    const v = useEditorStore.getState().view;
    return { x: (sx - v.panX) / v.zoom, y: (sy - v.panY) / v.zoom };
  };

  const makePointer = (e: React.PointerEvent, prevX: number, prevY: number): PointerInfo => {
    const { x, y } = screenToDoc(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    return {
      x,
      y,
      dx: x - prevX,
      dy: y - prevY,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      ctrlKey: e.ctrlKey,
      button: e.button,
      pressure: (e as any).pressure ?? 1,
    };
  };

  // ── Transform oturumu yönetimi ──
  useEffect(() => {
    const tr = transformRef.current;
    if (activeTool === 'transform') {
      if (!tr.active && activeLayer) {
        const backup = document.createElement('canvas');
        backup.width = activeLayer.canvas.width;
        backup.height = activeLayer.canvas.height;
        const ctx = backup.getContext('2d');
        if (ctx) ctx.drawImage(activeLayer.canvas, 0, 0);

        tr.originalCanvas = backup;
        tr.originalX = activeLayer.x;
        tr.originalY = activeLayer.y;
        tr.originalWidth = activeLayer.canvas.width;
        tr.originalHeight = activeLayer.canvas.height;
        tr.originalType = activeLayer.type;
        tr.scaleX = 1;
        tr.scaleY = 1;
        tr.rotation = 0;
        tr.tx = 0;
        tr.ty = 0;
        tr.active = true;
        draw();
      }
    } else {
      if (tr.active) {
        tr.active = false;
        tr.originalCanvas = null;
        const canvas = canvasRef.current;
        if (canvas) canvas.style.cursor = '';
        draw();
      }
    }
  }, [activeTool, activeLayer, draw]);

  // ── Apply / Cancel olay dinleyicileri ──
  useEffect(() => {
    const handleApply = () => {
      const tr = transformRef.current;
      if (!tr.active || !activeLayer) return;

      const st = useEditorStore.getState();
      st.pushHistory('Serbest Dönüşüm');

      if (tr.originalType === 'text') {
        activeLayer.text = undefined;
      }

      tr.active = false;
      tr.originalCanvas = null;
      st.setActiveTool('move');
      st.bumpRender();
    };

    const handleCancel = () => {
      const tr = transformRef.current;
      if (!tr.active || !activeLayer || !tr.originalCanvas) return;

      const src = tr.originalCanvas;
      activeLayer.canvas.width = src.width;
      activeLayer.canvas.height = src.height;
      const ctx = activeLayer.canvas.getContext('2d');
      if (ctx) ctx.drawImage(src, 0, 0);

      activeLayer.x = tr.originalX;
      activeLayer.y = tr.originalY;
      activeLayer.type = tr.originalType;

      tr.active = false;
      tr.originalCanvas = null;

      const st = useEditorStore.getState();
      st.setActiveTool('move');
      st.bumpRender();
    };

    window.addEventListener('mireditor:apply-transform', handleApply);
    window.addEventListener('mireditor:cancel-transform', handleCancel);
    return () => {
      window.removeEventListener('mireditor:apply-transform', handleApply);
      window.removeEventListener('mireditor:cancel-transform', handleCancel);
    };
  }, [activeLayer]);

  const updateTransformPreview = () => {
    const tr = transformRef.current;
    if (!tr.active || !activeLayer || !tr.originalCanvas) return;

    const src = tr.originalCanvas;
    const rad = tr.rotation;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));

    const origW = src.width * tr.scaleX;
    const origH = src.height * tr.scaleY;

    const newW = Math.max(1, Math.round(Math.abs(origW) * cos + Math.abs(origH) * sin));
    const newH = Math.max(1, Math.round(Math.abs(origW) * sin + Math.abs(origH) * cos));

    activeLayer.canvas.width = newW;
    activeLayer.canvas.height = newH;

    const ctx = activeLayer.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, newW, newH);
      ctx.translate(newW / 2, newH / 2);
      ctx.rotate(rad);
      ctx.drawImage(src, -origW / 2, -origH / 2, origW, origH);
    }

    activeLayer.x = tr.originalX + tr.tx;
    activeLayer.y = tr.originalY + tr.ty;

    if (tr.originalType === 'text') {
      activeLayer.type = 'raster';
    }

    useEditorStore.getState().bumpRender();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || !doc) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* sentetik olaylar için yok say */
    }
    const d = dragRef.current;
    d.down = true;
    d.lastSX = e.nativeEvent.offsetX;
    d.lastSY = e.nativeEvent.offsetY;
    const docPt = screenToDoc(d.lastSX, d.lastSY);
    d.lastDocX = docPt.x;
    d.lastDocY = docPt.y;

    const tool = useEditorStore.getState().activeTool;
    const wantPan = d.spaceDown || tool === 'hand' || e.button === 1;

    if (wantPan) {
      d.panning = true;
      return;
    }

    if (tool === 'transform') {
      let handle = getHoverHandle(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
      if (!handle) {
        handle = 'rotate'; // Bounding box dışı tıklamalarda varsayılan döndürme yap
      }
      const tr = transformRef.current;
      tr.handle = handle;
      tr.startMouseX = docPt.x;
      tr.startMouseY = docPt.y;
      tr.startScaleX = tr.scaleX;
      tr.startScaleY = tr.scaleY;
      tr.startRotation = tr.rotation;
      tr.startTx = tr.tx;
      tr.startTy = tr.ty;
      return;
    }

    if (tool === 'zoom') {
      zoomAt(d.lastSX, d.lastSY, e.altKey ? 1 / 1.4 : 1.4);
      return;
    }
    const p = makePointer(e, d.lastDocX, d.lastDocY);
    getTool(tool).onDown?.(p, { composite: compositeRef.current });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const sx = e.nativeEvent.offsetX;
    const sy = e.nativeEvent.offsetY;
    const docPt = screenToDoc(sx, sy);
    if (onCursor) onCursor(docPt.x, docPt.y);

    const tool = useEditorStore.getState().activeTool;

    if (tool === 'transform') {
      const tr = transformRef.current;
      if (d.down && tr.handle) {
        const handle = tr.handle;
        const mx = docPt.x;
        const my = docPt.y;
        const smx = tr.startMouseX;
        const smy = tr.startMouseY;

        const w0 = tr.originalWidth;
        const h0 = tr.originalHeight;

        if (handle === 'move') {
          tr.tx = tr.startTx + (mx - smx);
          tr.ty = tr.startTy + (my - smy);
        } else if (handle === 'rotate') {
          const cx = tr.originalX + w0 / 2 + tr.tx;
          const cy = tr.originalY + h0 / 2 + tr.ty;
          const currentAngle = Math.atan2(my - cy, mx - cx);
          const startAngle = Math.atan2(smy - cy, smx - cx);
          const delta = currentAngle - startAngle;
          tr.rotation = tr.startRotation + delta;
        } else {
          // Resize handle
          const cx = tr.originalX + w0 / 2 + tr.startTx;
          const cy = tr.originalY + h0 / 2 + tr.startTy;
          const theta = tr.startRotation;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          const lcos = Math.cos(-theta);
          const lsin = Math.sin(-theta);

          const localMX = (mx - cx) * lcos - (my - cy) * lsin;
          const localMY = (mx - cx) * lsin + (my - cy) * lcos;

          const w_start = w0 * tr.startScaleX;
          const h_start = h0 * tr.startScaleY;

          let newW = w_start;
          let newH = h_start;

          if (handle.includes('r')) newW = localMX + w_start / 2;
          else if (handle.includes('l')) newW = w_start / 2 - localMX;

          if (handle.includes('b')) newH = localMY + h_start / 2;
          else if (handle.includes('t')) newH = h_start / 2 - localMY;

          let scaleX = newW / w0;
          let scaleY = newH / h0;

          // Oransal boyutlandırma koşulu: Ctrl tuşu basılıyken VEYA Shift tuşu basılı DEĞİLKEN oransal yap
          const constrain = e.ctrlKey || (!e.shiftKey);
          if (constrain) {
            if (handle === 'r' || handle === 'l') {
              scaleY = scaleX * (h_start / w_start);
            } else if (handle === 't' || handle === 'b') {
              scaleX = scaleY * (w_start / h_start);
            } else {
              const s = Math.max(0.01, (Math.abs(scaleX) + Math.abs(scaleY)) / 2);
              scaleX = Math.sign(scaleX) * s;
              scaleY = Math.sign(scaleY) * s;
            }
          }

          if (Math.abs(scaleX) < 0.01) scaleX = 0.01 * Math.sign(scaleX || 1);
          if (Math.abs(scaleY) < 0.01) scaleY = 0.01 * Math.sign(scaleY || 1);

          // Karşı köşeyi sabit tutmak için merkez kaydırma hesabı
          let fx = 0;
          let fy = 0;
          if (handle === 'br') { fx = -w_start / 2; fy = -h_start / 2; }
          else if (handle === 'bl') { fx = w_start / 2; fy = -h_start / 2; }
          else if (handle === 'tr') { fx = -w_start / 2; fy = h_start / 2; }
          else if (handle === 'tl') { fx = w_start / 2; fy = h_start / 2; }
          else if (handle === 'r') { fx = -w_start / 2; fy = 0; }
          else if (handle === 'l') { fx = w_start / 2; fy = 0; }
          else if (handle === 'b') { fx = 0; fy = -h_start / 2; }
          else if (handle === 't') { fx = 0; fy = h_start / 2; }

          const wAnchorX = cx + (fx * cos - fy * sin);
          const wAnchorY = cy + (fx * sin + fy * cos);

          const newAlx = fx * (scaleX / tr.startScaleX);
          const newAly = fy * (scaleY / tr.startScaleY);

          const newCX = wAnchorX - (newAlx * cos - newAly * sin);
          const newCY = wAnchorY - (newAlx * sin + newAly * cos);

          tr.scaleX = scaleX;
          tr.scaleY = scaleY;
          tr.tx = newCX - (tr.originalX + w0 / 2);
          tr.ty = newCY - (tr.originalY + h0 / 2);
        }

        updateTransformPreview();
      } else {
        const hover = getHoverHandle(sx, sy);
        const canvas = canvasRef.current;
        if (canvas) {
          if (hover === 'rotate') canvas.style.cursor = 'crosshair';
          else if (hover === 'move') canvas.style.cursor = 'move';
          else if (hover === 'tl' || hover === 'br') canvas.style.cursor = 'nwse-resize';
          else if (hover === 'tr' || hover === 'bl') canvas.style.cursor = 'nesw-resize';
          else if (hover === 't' || hover === 'b') canvas.style.cursor = 'ns-resize';
          else if (hover === 'l' || hover === 'r') canvas.style.cursor = 'ew-resize';
          else canvas.style.cursor = 'default';
        }
      }
      d.lastDocX = docPt.x;
      d.lastDocY = docPt.y;
      return;
    }

    if (!d.down) return;

    if (d.panning) {
      const v = useEditorStore.getState().view;
      useEditorStore.getState().setView({ panX: v.panX + (sx - d.lastSX), panY: v.panY + (sy - d.lastSY) });
      d.lastSX = sx;
      d.lastSY = sy;
      return;
    }

    const p = makePointer(e, d.lastDocX, d.lastDocY);
    getTool(tool).onMove?.(p, { composite: compositeRef.current });
    d.lastDocX = docPt.x;
    d.lastDocY = docPt.y;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const tool = useEditorStore.getState().activeTool;

    if (tool === 'transform') {
      d.down = false;
      transformRef.current.handle = null;
      return;
    }

    if (d.down && !d.panning) {
      const p = makePointer(e, d.lastDocX, d.lastDocY);
      getTool(tool).onUp?.(p, { composite: compositeRef.current });
    }
    d.down = false;
    d.panning = false;
  };

  function zoomAt(sx: number, sy: number, factor: number) {
    const v = useEditorStore.getState().view;
    const newZoom = Math.max(0.02, Math.min(32, v.zoom * factor));
    // İmleç altındaki belge noktası sabit kalsın
    const docX = (sx - v.panX) / v.zoom;
    const docY = (sy - v.panY) / v.zoom;
    const panX = sx - docX * newZoom;
    const panY = sy - docY * newZoom;
    useEditorStore.getState().setView({ zoom: newZoom, panX, panY });
  }

  const onWheel = (e: React.WheelEvent) => {
    if (!doc) return;
    if (e.ctrlKey || e.altKey || e.metaKey) {
      zoomAt(e.nativeEvent.offsetX, e.nativeEvent.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    } else {
      const v = useEditorStore.getState().view;
      if (e.shiftKey) {
        useEditorStore.getState().setView({ panX: v.panX - e.deltaY });
      } else {
        useEditorStore.getState().setView({ panX: v.panX - e.deltaX, panY: v.panY - e.deltaY });
      }
    }
  };
  
  const onDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!doc) return;
    const { x, y } = screenToDoc(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    const st = useEditorStore.getState();

    let targetLayer: Layer | null = null;

    // Üstteki katmandan başlayarak ara
    const ordered = [...doc.layers].reverse();
    for (const layer of ordered) {
      if (layer.type === 'text') {
        const lx = Math.round(x - layer.x);
        const ly = Math.round(y - layer.y);
        if (lx >= 0 && lx < layer.canvas.width && ly >= 0 && ly < layer.canvas.height) {
          try {
            const ctx = layer.canvas.getContext('2d');
            if (ctx) {
              const alpha = ctx.getImageData(lx, ly, 1, 1).data[3];
              if (alpha > 5) {
                targetLayer = layer;
                break;
              }
            }
          } catch (err) {
            console.error(err);
          }
        }
      }
    }

    // Seçili katman metin katmanıysa ve başka bir metin katmanına tıklanmadıysa onu seç
    if (!targetLayer) {
      const active = doc.layers.find((l) => l.id === doc.activeLayerId);
      if (active && active.type === 'text') {
        targetLayer = active;
      }
    }

    if (targetLayer && targetLayer.text) {
      window.dispatchEvent(new CustomEvent('mireditor:edit-text', { detail: { layerId: targetLayer.id } }));
    }
  };

  // ── Dışarıdan "sığdır" komutu (Navigator) ──
  useEffect(() => {
    const onFit = () => fitToScreen();
    window.addEventListener('mireditor:fit', onFit);
    return () => window.removeEventListener('mireditor:fit', onFit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Space ile geçici pan ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement)?.matches?.('input, textarea')) {
        dragRef.current.spaceDown = true;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') dragRef.current.spaceDown = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const cursor =
    activeTool === 'hand'
      ? 'grab'
      : activeTool === 'zoom'
      ? 'zoom-in'
      : getTool(activeTool).cursor;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden relative bg-[#181818]">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDoubleClick}
        onWheel={onWheel}
        style={{ cursor, touchAction: 'none', display: 'block' }}
      />
    </div>
  );
}
