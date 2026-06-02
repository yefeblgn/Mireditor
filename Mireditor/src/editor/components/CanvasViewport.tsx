import React, { useEffect, useRef, useCallback } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { compositeDocument, getCheckerPattern } from '../render/Compositor';
import { getTool } from '../tools';
import type { PointerInfo } from '../tools/types';

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
  }, [doc]);

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

    if (!d.down) return;

    if (d.panning) {
      const v = useEditorStore.getState().view;
      useEditorStore.getState().setView({ panX: v.panX + (sx - d.lastSX), panY: v.panY + (sy - d.lastSY) });
      d.lastSX = sx;
      d.lastSY = sy;
      return;
    }

    const tool = useEditorStore.getState().activeTool;
    const p = makePointer(e, d.lastDocX, d.lastDocY);
    getTool(tool).onMove?.(p, { composite: compositeRef.current });
    d.lastDocX = docPt.x;
    d.lastDocY = docPt.y;
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.down && !d.panning) {
      const tool = useEditorStore.getState().activeTool;
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
        onWheel={onWheel}
        style={{ cursor, touchAction: 'none', display: 'block' }}
      />
    </div>
  );
}
