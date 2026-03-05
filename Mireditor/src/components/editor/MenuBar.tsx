import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileImage, FolderOpen, Save, SaveAll, Download, FileText,
  Undo2, Redo2, Scissors, Copy, ClipboardPaste, Trash2,
  SquareCheck, SquareSlash, FlipHorizontal2, FlipVertical2,
  RotateCcw, RotateCw, RefreshCw, SunMedium, Contrast, Palette,
  BarChart3, TrendingUp, Layers, FolderPlus, CopyPlus, Trash,
  Merge, Minimize2, Group, Ungroup, Settings,
  CheckSquare, XSquare, Replace, Droplets, Sparkles, Grid3x3,
  Volume2, Puzzle, ZoomIn, ZoomOut, Maximize, MonitorSmartphone,
  Ruler, LayoutGrid, Info, Keyboard, Image,
  ChevronRight,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import { exportCanvasPNG, getCanvasJSON } from './Canvas';
import jsPDF from 'jspdf';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

// ── Menu item type ──
interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

export function EditorMenuBar({ onBack }: { onBack: () => void }) {
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const menuBarRef = useRef<HTMLDivElement>(null);

  const store = useEditorStore();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
        setOpenSub(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Actions ──
  const doUndo = useCallback(() => {
    const json = store.undo();
    if (json && store.canvas) {
      store.canvas.loadFromJSON(json).then(() => store.canvas.requestRenderAll());
    }
  }, [store]);

  const doRedo = useCallback(() => {
    const json = store.redo();
    if (json && store.canvas) {
      store.canvas.loadFromJSON(json).then(() => store.canvas.requestRenderAll());
    }
  }, [store]);

  const doExportPNG = useCallback(async () => {
    const dataUrl = exportCanvasPNG(store.canvas, store.canvasWidth, store.canvasHeight);
    if (!dataUrl) return;

    if (ipcRenderer) {
      const filePath = await ipcRenderer.invoke('save-file-dialog', {
        title: 'PNG Olarak Dışa Aktar',
        defaultPath: `${store.projectTitle}.png`,
        filters: [{ name: 'PNG', extensions: ['png'] }],
      });
      if (filePath) {
        const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
        await ipcRenderer.invoke('save-file-binary', { filePath, base64 });
      }
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${store.projectTitle}.png`;
      a.click();
    }
  }, [store]);

  const doExportJPEG = useCallback(async () => {
    if (!store.canvas) return;
    const workarea = store.canvas.getObjects().find((o: any) => o.customId === '__workarea__');
    if (!workarea) return;
    const dataUrl = store.canvas.toDataURL({
      format: 'jpeg',
      quality: 0.92,
      left: workarea.left || 0,
      top: workarea.top || 0,
      width: store.canvasWidth,
      height: store.canvasHeight,
    });

    if (ipcRenderer) {
      const filePath = await ipcRenderer.invoke('save-file-dialog', {
        title: 'JPEG Olarak Dışa Aktar',
        defaultPath: `${store.projectTitle}.jpg`,
        filters: [{ name: 'JPEG', extensions: ['jpg', 'jpeg'] }],
      });
      if (filePath) {
        const base64 = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
        await ipcRenderer.invoke('save-file-binary', { filePath, base64 });
      }
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${store.projectTitle}.jpg`;
      a.click();
    }
  }, [store]);

  const doExportPDF = useCallback(async () => {
    const dataUrl = exportCanvasPNG(store.canvas, store.canvasWidth, store.canvasHeight);
    if (!dataUrl) return;

    const pdf = new jsPDF({
      orientation: store.canvasWidth > store.canvasHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [store.canvasWidth, store.canvasHeight],
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, store.canvasWidth, store.canvasHeight);

    if (ipcRenderer) {
      const filePath = await ipcRenderer.invoke('save-file-dialog', {
        title: 'PDF Olarak Dışa Aktar',
        defaultPath: `${store.projectTitle}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (filePath) {
        const buffer = pdf.output('arraybuffer');
        const base64 = btoa(
          new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), ''),
        );
        await ipcRenderer.invoke('save-file-binary', { filePath, base64 });
      }
    } else {
      pdf.save(`${store.projectTitle}.pdf`);
    }
  }, [store]);

  const doSaveDraft = useCallback(async () => {
    const json = getCanvasJSON(store.canvas);
    if (!json) return;

    const draftData = JSON.stringify({
      version: '0.0.1',
      title: store.projectTitle,
      width: store.canvasWidth,
      height: store.canvasHeight,
      layers: store.layers,
      canvas: JSON.parse(json),
    });

    if (ipcRenderer) {
      const filePath = await ipcRenderer.invoke('save-file-dialog', {
        title: 'Taslak Olarak Kaydet',
        defaultPath: `${store.projectTitle}.gef`,
        filters: [{ name: 'GEF Dosyası', extensions: ['gef'] }],
      });
      if (filePath) {
        await ipcRenderer.invoke('save-file', { filePath, data: draftData });
        store.setModified(false);
      }
    }
  }, [store]);

  const doSelectAll = useCallback(() => {
    const canvas = store.canvas;
    if (!canvas) return;
    const objs = canvas.getObjects().filter(
      (o: any) => o.customId !== '__workarea__' && !o.isMarquee && o.customId !== '__grid__',
    );
    if (objs.length > 0) {
      import('fabric').then((fabricMod) => {
        const sel = new fabricMod.ActiveSelection(objs, { canvas });
        canvas.setActiveObject(sel);
        canvas.requestRenderAll();
      }).catch(() => {
        if (objs[0]) {
          canvas.setActiveObject(objs[0]);
          canvas.requestRenderAll();
        }
      });
    }
  }, [store]);

  const doDeselect = useCallback(() => {
    store.canvas?.discardActiveObject();
    store.canvas?.requestRenderAll();
  }, [store]);

  const doDelete = useCallback(() => {
    const canvas = store.canvas;
    if (!canvas) return;
    const active = canvas.getActiveObject();
    if (active) {
      if (active.type === 'activeselection') {
        (active as any).forEachObject((o: any) => canvas.remove(o));
      } else {
        canvas.remove(active);
      }
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
  }, [store]);

  const doFlipH = useCallback(() => {
    const obj = store.canvas?.getActiveObject();
    if (obj) {
      obj.set('flipX', !obj.flipX);
      store.canvas.requestRenderAll();
    }
  }, [store]);

  const doFlipV = useCallback(() => {
    const obj = store.canvas?.getActiveObject();
    if (obj) {
      obj.set('flipY', !obj.flipY);
      store.canvas.requestRenderAll();
    }
  }, [store]);

  const doRotate = useCallback((deg: number) => {
    const obj = store.canvas?.getActiveObject();
    if (obj) {
      obj.rotate((obj.angle || 0) + deg);
      store.canvas.requestRenderAll();
    }
  }, [store]);

  // ── Menu definitions ──
  const menus: Record<string, MenuItem[]> = {
    Dosya: [
      { label: 'Yeni', shortcut: 'Ctrl+N', action: onBack },
      { label: 'Aç', shortcut: 'Ctrl+O', action: async () => {
        if (ipcRenderer) {
          const fp = await ipcRenderer.invoke('open-file-dialog');
          if (fp) { /* load file */ }
        }
      }},
      { label: 'Kaydet', shortcut: 'Ctrl+S', action: doSaveDraft },
      { label: 'Farklı Kaydet', shortcut: 'Ctrl+Shift+S', action: doSaveDraft },
      { label: 'Taslak Olarak Kaydet', action: doSaveDraft },
      { label: '', separator: true },
      { label: 'Dışa Aktar', submenu: [
        { label: 'PNG olarak', action: doExportPNG },
        { label: 'JPEG olarak', action: doExportJPEG },
        { label: 'PDF olarak', action: doExportPDF },
      ]},
      { label: '', separator: true },
      { label: 'Dashboard\'a Dön', action: onBack },
    ],
    Düzenle: [
      { label: 'Geri Al', shortcut: 'Ctrl+Z', action: doUndo, disabled: !store.canUndo() },
      { label: 'Yinele', shortcut: 'Ctrl+Shift+Z', action: doRedo, disabled: !store.canRedo() },
      { label: '', separator: true },
      { label: 'Kes', shortcut: 'Ctrl+X', action: () => {
        const canvas = store.canvas;
        if (!canvas) return;
        const obj = canvas.getActiveObject();
        if (obj) {
          obj.clone().then((c: any) => store.setClipboardData(c));
          canvas.remove(obj);
          canvas.requestRenderAll();
        }
      }},
      { label: 'Kopyala', shortcut: 'Ctrl+C', action: () => {
        const obj = store.canvas?.getActiveObject();
        if (obj) obj.clone().then((c: any) => store.setClipboardData(c));
      }},
      { label: 'Yapıştır', shortcut: 'Ctrl+V', action: () => {
        const data = store.clipboardData;
        const canvas = store.canvas;
        if (!data || !canvas) return;
        data.clone().then((c: any) => {
          c.set({ left: (c.left || 0) + 20, top: (c.top || 0) + 20 });
          canvas.add(c);
          canvas.setActiveObject(c);
          canvas.requestRenderAll();
        });
      }},
      { label: 'Sil', shortcut: 'Del', action: doDelete },
      { label: '', separator: true },
      { label: 'Tümünü Seç', shortcut: 'Ctrl+A', action: doSelectAll },
      { label: 'Seçimi Kaldır', shortcut: 'Ctrl+D', action: doDeselect },
      { label: '', separator: true },
      { label: 'Serbest Dönüştür', shortcut: 'Ctrl+T', action: () => {
        const obj = store.canvas?.getActiveObject();
        if (obj) {
          obj.set({ hasControls: true, hasBorders: true });
          store.canvas.requestRenderAll();
        }
      }},
    ],
    Görüntü: [
      { label: 'Döndür', submenu: [
        { label: '90° Saat Yönünde', action: () => doRotate(90) },
        { label: '90° Saat Yönü Tersi', action: () => doRotate(-90) },
        { label: '180°', action: () => doRotate(180) },
      ]},
      { label: 'Yatay Çevir', action: doFlipH },
      { label: 'Dikey Çevir', action: doFlipV },
      { label: '', separator: true },
      { label: 'Ayarlar', submenu: [
        { label: 'Parlaklık / Kontrast', action: () => applyFilter('brightness') },
        { label: 'Ton / Doygunluk', action: () => applyFilter('saturation') },
        { label: 'Renk Dengesi', action: () => applyFilter('hue') },
        { label: 'Bulanıklaştır', action: () => applyFilter('blur') },
        { label: 'Ters Çevir', action: () => applyFilter('invert') },
        { label: 'Gri Tonlama', action: () => applyFilter('grayscale') },
        { label: 'Sepya', action: () => applyFilter('sepia') },
      ]},
    ],
    Katman: [
      { label: 'Yeni Katman', shortcut: 'Ctrl+Shift+N', action: () => store.addLayer() },
      { label: 'Katmanı Çoğalt', action: () => {
        if (store.activeLayerId) store.duplicateLayer(store.activeLayerId);
      }},
      { label: 'Katmanı Sil', action: () => {
        if (store.activeLayerId) store.removeLayer(store.activeLayerId);
      }},
      { label: '', separator: true },
      { label: 'Aşağı Birleştir', shortcut: 'Ctrl+E', action: () => {
        if (store.activeLayerId) store.mergeDown(store.activeLayerId);
      }},
      { label: 'Düzleştir', shortcut: 'Ctrl+Shift+E', action: () => store.flattenLayers() },
      { label: '', separator: true },
      { label: 'Grup Oluştur', shortcut: 'Ctrl+G', action: () => store.addGroup() },
    ],
    Seçim: [
      { label: 'Tümü', shortcut: 'Ctrl+A', action: doSelectAll },
      { label: 'Hiçbiri', shortcut: 'Ctrl+D', action: doDeselect },
      { label: 'Seçimi Tersine Çevir', shortcut: 'Ctrl+Shift+I', action: () => {
        // Toggle selection
      }},
    ],
    Filtre: [
      { label: 'Bulanıklaştır', submenu: [
        { label: 'Gauss Bulanıklığı', action: () => applyFilter('blur') },
      ]},
      { label: 'Keskinleştir', submenu: [
        { label: 'Keskinleştir', action: () => applyFilter('sharpen') },
      ]},
      { label: '', separator: true },
      { label: 'Gürültü', submenu: [
        { label: 'Gürültü Ekle', action: () => applyFilter('noise') },
      ]},
      { label: '', separator: true },
      { label: 'Pikselleştir', action: () => applyFilter('pixelate') },
      { label: 'Gri Tonlama', action: () => applyFilter('grayscale') },
      { label: 'Sepya', action: () => applyFilter('sepia') },
      { label: 'Renkleri Ters Çevir', action: () => applyFilter('invert') },
    ],
    Görünüm: [
      { label: 'Yakınlaştır', shortcut: 'Ctrl++', action: () => zoomCanvas(1.25) },
      { label: 'Uzaklaştır', shortcut: 'Ctrl+-', action: () => zoomCanvas(0.8) },
      { label: 'Ekrana Sığdır', shortcut: 'Ctrl+0', action: () => {
        /* handled by canvas */ 
      }},
      { label: 'Gerçek Boyut', shortcut: 'Ctrl+1', action: () => zoomCanvas(1, true) },
      { label: '', separator: true },
      { label: store.showGrid ? 'Kılavuzu Gizle' : 'Kılavuzu Göster', action: () => store.toggleGrid() },
      { label: store.showRulers ? 'Cetveli Gizle' : 'Cetveli Göster', action: () => store.toggleRulers() },
    ],
    Yardım: [
      { label: 'Klavye Kısayolları', action: () => {
        (window as any).__showShortcutsModal?.();
      }},
      { label: 'Hakkında', action: () => {
        (window as any).__showAboutModal?.();
      }},
    ],
  };

  const applyFilter = (type: string) => {
    const canvas = store.canvas;
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;

    // For image objects, apply Fabric.js filters
    if (obj.type === 'image') {
      const img = obj as any;
      const fabric = (window as any).fabric || {};
      switch (type) {
        case 'grayscale':
          img.filters = [...(img.filters || []), new fabric.filters.Grayscale()];
          break;
        case 'sepia':
          img.filters = [...(img.filters || []), new fabric.filters.Sepia()];
          break;
        case 'invert':
          img.filters = [...(img.filters || []), new fabric.filters.Invert()];
          break;
        case 'blur':
          img.filters = [...(img.filters || []), new fabric.filters.Blur({ blur: 0.5 })];
          break;
        case 'brightness':
          img.filters = [...(img.filters || []), new fabric.filters.Brightness({ brightness: 0.1 })];
          break;
        case 'contrast':
          img.filters = [...(img.filters || []), new fabric.filters.Contrast({ contrast: 0.1 })];
          break;
        case 'saturation':
          img.filters = [...(img.filters || []), new fabric.filters.Saturation({ saturation: 0.5 })];
          break;
        case 'pixelate':
          img.filters = [...(img.filters || []), new fabric.filters.Pixelate({ blocksize: 4 })];
          break;
        case 'sharpen':
          img.filters = [...(img.filters || []), new fabric.filters.Convolute({
            matrix: [0, -1, 0, -1, 5, -1, 0, -1, 0],
          })];
          break;
        case 'noise':
          img.filters = [...(img.filters || []), new fabric.filters.Noise({ noise: 100 })];
          break;
      }
      img.applyFilters();
      canvas.requestRenderAll();
      return;
    }

    // For non-image objects, adjust properties
    switch (type) {
      case 'grayscale':
      case 'sepia':
      case 'invert':
        // These only work on images
        break;
    }
  };

  const zoomCanvas = (factor: number, absolute = false) => {
    const canvas = store.canvas;
    if (!canvas) return;
    const newZoom = absolute ? factor : Math.max(0.01, Math.min(64, canvas.getZoom() * factor));
    const center = canvas.getCenter();
    canvas.zoomToPoint(new (window as any).fabric.Point(center.left, center.top), newZoom);
    store.setZoom(Math.round(newZoom * 100));
    canvas.requestRenderAll();
  };

  const handleMenuClick = (menu: string) => {
    setOpenMenu(openMenu === menu ? null : menu);
    setOpenSub(null);
  };

  const handleMenuHover = (menu: string) => {
    if (openMenu) {
      setOpenMenu(menu);
      setOpenSub(null);
    }
  };

  const handleItemClick = (item: MenuItem) => {
    if (item.disabled) return;
    if (item.submenu) return;
    item.action?.();
    setOpenMenu(null);
    setOpenSub(null);
  };

  return (
    <div
      ref={menuBarRef}
      className="h-7 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-2 select-none flex-shrink-0"
      style={{ cursor: 'default' }}
    >
      {Object.entries(menus).map(([name, items]) => (
        <div key={name} className="relative">
          <button
            onClick={() => handleMenuClick(name)}
            onMouseEnter={() => handleMenuHover(name)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors
              ${openMenu === name
                ? 'bg-[#3b82f6] text-white'
                : 'text-[#999] hover:text-white hover:bg-[#252525]'
              }`}
            style={{ cursor: 'default' }}
          >
            {name}
          </button>

          {/* Dropdown */}
          {openMenu === name && (
            <div className="absolute top-full left-0 mt-px bg-[#222] border border-[#3a3a3a] rounded-lg shadow-xl shadow-black/50 py-1 min-w-[220px] z-[200]">
              {items.map((item, i) =>
                item.separator ? (
                  <div key={`sep-${i}`} className="h-px bg-[#333] my-1 mx-2" />
                ) : (
                  <div key={item.label} className="relative">
                    <button
                      onClick={() => handleItemClick(item)}
                      onMouseEnter={() => {
                        if (item.submenu) setOpenSub(item.label);
                        else setOpenSub(null);
                      }}
                      disabled={item.disabled}
                      className={`w-full text-left px-3 py-1.5 text-[11px] flex items-center justify-between gap-4 transition-colors
                        ${item.disabled
                          ? 'text-[#555] cursor-not-allowed'
                          : 'text-[#ccc] hover:bg-[#3b82f6] hover:text-white'
                        }`}
                      style={{ cursor: item.disabled ? 'not-allowed' : 'default' }}
                    >
                      <span>{item.label}</span>
                      <span className="flex items-center gap-1">
                        {item.shortcut && (
                          <span className="text-[10px] text-[#666]">{item.shortcut}</span>
                        )}
                        {item.submenu && <ChevronRight size={12} className="text-[#666]" />}
                      </span>
                    </button>

                    {/* Submenu */}
                    {item.submenu && openSub === item.label && (
                      <div className="absolute left-full top-0 ml-px bg-[#222] border border-[#3a3a3a] rounded-lg shadow-xl shadow-black/50 py-1 min-w-[180px] z-[201]">
                        {item.submenu.map((sub) => (
                          <button
                            key={sub.label}
                            onClick={() => {
                              sub.action?.();
                              setOpenMenu(null);
                              setOpenSub(null);
                            }}
                            className="w-full text-left px-3 py-1.5 text-[11px] text-[#ccc] hover:bg-[#3b82f6] hover:text-white transition-colors"
                            style={{ cursor: 'default' }}
                          >
                            {sub.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      ))}

      {/* Right side: project title */}
      <div className="ml-auto flex items-center gap-3">
        <span className="text-[10px] text-[#555] font-medium">
          {store.projectTitle}
          {store.isModified && ' •'}
        </span>
        <span className="text-[10px] text-blue-400/60 font-medium">
          {store.canvasWidth} × {store.canvasHeight}
        </span>
      </div>
    </div>
  );
}
