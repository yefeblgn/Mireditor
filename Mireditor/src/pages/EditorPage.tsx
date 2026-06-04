import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useEditorStore } from '../editor/store/useEditorStore';
import { useEditorShortcuts } from '../editor/shortcuts';
import { CanvasViewport } from '../editor/components/CanvasViewport';
import { Toolbar } from '../editor/panels/Toolbar';
import { ToolOptionsBar } from '../editor/panels/ToolOptionsBar';
import { LayersPanel } from '../editor/panels/LayersPanel';
import { ColorPanel } from '../editor/panels/ColorPanel';
import { NavigatorPanel } from '../editor/panels/NavigatorPanel';
import { HistoryPanel } from '../editor/panels/HistoryPanel';
import { AdjustmentsPanel } from '../editor/panels/AdjustmentsPanel';
import { NewDocumentDialog } from '../editor/panels/NewDocumentDialog';
import { TextEditorModal } from '../editor/panels/TextEditorModal';
import { AIPanel } from '../editor/ai/AIPanel';
import { createLayer, get2d } from '../editor/model/document';
import { addRecent, exportImage, openProject, saveProject, type ExportFormat } from '../editor/io/fileService';
import { flattenDocument, makeThumbnail } from '../editor/render/Compositor';
import { AppMenuBar } from '../components/editor/AppMenuBar';
import { PluginsPanel } from '../components/editor/PluginsPanel';
import { ShortcutsModal } from '../components/editor/Modals';
import { serializeDocument, deserializeDocument } from '../editor/io/gefFormat';
import { API } from '../config/api';

interface EditorPageProps {
  onBack: () => void;
}

type RightTab = 'layers' | 'history' | 'color' | 'adjust';

export function EditorPage({ onBack }: EditorPageProps) {
  const { user } = useAuthStore();
  const doc = useEditorStore((s) => s.doc);
  const zoom = useEditorStore((s) => s.view.zoom);
  const dirty = useEditorStore((s) => s.dirty);
  const renderVersion = useEditorStore((s) => s.renderVersion);
  const newDocument = useEditorStore((s) => s.newDocument);
  const renameDocument = useEditorStore((s) => s.renameDocument);
  const addLayer = useEditorStore((s) => s.addLayer);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const markClean = useEditorStore((s) => s.markClean);

  const [tab, setTab] = useState<RightTab>('layers');
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [busy, setBusy] = useState('');
  const [cursor, setCursorPos] = useState({ x: 0, y: 0 });
  const [editingName, setEditingName] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const fileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{ active: boolean; startX: number; startW: number }>({ active: false, startX: 0, startW: 288 });
  const [draggingFile, setDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const [editingTextLayerId, setEditingTextLayerId] = useState<string | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryJson, setRecoveryJson] = useState<string | null>(null);

  useEditorShortcuts();

  // Belge yoksa varsayılan belge oluştur
  useEffect(() => {
    if (!doc) newDocument({ name: 'Adsız-1', width: 1920, height: 1080, background: 'white' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Açılışta otomatik kurtarma kontrolü
  useEffect(() => {
    const active = localStorage.getItem('mireditor-recovery-active');
    const backup = localStorage.getItem('mireditor-recovery-backup');
    if (active === 'true' && backup) {
      setRecoveryJson(backup);
      setShowRecovery(true);
    }
  }, []);

  // Arka planda otomatik yedekleme (Autosave)
  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(() => {
      try {
        const { serializeDocument } = require('../editor/io/gefFormat');
        const json = serializeDocument(doc);
        localStorage.setItem('mireditor-recovery-backup', json);
        localStorage.setItem('mireditor-recovery-active', 'true');
      } catch (err) {
        console.error('Autosave error:', err);
      }
    }, 6000); // 6 saniye değişiklik yapılmazsa otomatik kaydet
    return () => clearTimeout(t);
  }, [doc, renderVersion]);

  // Kaydedildiğinde veya temiz kapatıldığında kurtarmayı pasif et
  useEffect(() => {
    const dirtyVal = useEditorStore.getState().dirty;
    if (!dirtyVal) {
      localStorage.setItem('mireditor-recovery-active', 'false');
    }
  }, [dirty]);

  // Ctrl+S / Ctrl+O / Ctrl+R engel / F1
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (ctrl && (k === 'r' || k === 'w')) { e.preventDefault(); return; }
      if (ctrl && k === 's') { e.preventDefault(); handleSave(e.shiftKey); return; }
      if (ctrl && k === 'o') { e.preventDefault(); handleOpenProject(); return; }
      if (e.key === 'F1') { e.preventDefault(); setShowShortcuts(true); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // Toolbar renk swatchına tıklanınca Renk sekmesine geç
  useEffect(() => {
    const colorHandler = () => setTab('color');
    const tabHandler = (e: Event) => {
      const tab = (e as CustomEvent).detail as RightTab;
      if (tab) setTab(tab);
    };
    window.addEventListener('mireditor:color-click', colorHandler);
    window.addEventListener('mireditor:switch-tab', tabHandler);
    return () => {
      window.removeEventListener('mireditor:color-click', colorHandler);
      window.removeEventListener('mireditor:switch-tab', tabHandler);
    };
  }, []);

  // Transform modunu etkinleştir
  useEffect(() => {
    const handler = () => useEditorStore.getState().setActiveTool('transform');
    window.addEventListener('mireditor:open-transform', handler);
    return () => window.removeEventListener('mireditor:open-transform', handler);
  }, []);

  // Metin düzenleme penceresini aç
  useEffect(() => {
    const handler = (e: Event) => {
      const layerId = (e as CustomEvent).detail?.layerId;
      if (layerId) setEditingTextLayerId(layerId);
    };
    window.addEventListener('mireditor:edit-text', handler);
    return () => window.removeEventListener('mireditor:edit-text', handler);
  }, []);

  // Sidebar drag resize
  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startW: sidebarWidth };
    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current.active) return;
      const dx = dragRef.current.startX - ev.clientX;
      const next = Math.max(200, Math.min(520, dragRef.current.startW + dx));
      setSidebarWidth(next);
    };
    const onUp = () => {
      dragRef.current.active = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [sidebarWidth]);

  const handleBack = async () => {
    if (doc?.filePath) {
      try {
        const thumbnail = makeThumbnail(flattenDocument(doc, '#1a1a1a'), 160, 100);
        await addRecent({ path: doc.filePath, name: doc.name, thumbnail, modified: Date.now(), sizeKb: 0 });
      } catch { /* yok say */ }
    }
    // Temiz kapatma
    localStorage.setItem('mireditor-recovery-active', 'false');
    onBack();
  };

  const handleSave = async (saveAs = false) => {
    if (!doc) return;
    setBusy('Kaydediliyor…');
    try {
      const path = await saveProject(doc, saveAs);
      if (path) setFilePath(path);
      markClean();
    } finally {
      setBusy('');
    }
  };

  const handleOpenProject = async () => {
    setBusy('Açılıyor…');
    try {
      const opened = await openProject();
      if (opened) setDocument(opened);
    } finally {
      setBusy('');
    }
  };

  const handleExport = async (format: ExportFormat) => {
    if (!doc) return;
    setBusy('Dışa aktarılıyor…');
    try {
      await exportImage(doc, format);
    } finally {
      setBusy('');
    }
  };

  const handleSaveCloud = async () => {
    if (!doc) return;
    setBusy('Buluta kaydediliyor…');
    try {
      const authToken = useAuthStore.getState().token;
      if (!authToken) throw new Error('Giriş yapmanız gerekiyor');
      const json = serializeDocument(doc);
      const res = await fetch(API.drafts.save, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ title: doc.name, data: json }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || body.message || `Sunucu hatası (${res.status})`);
      }
      setBusy('✓ Buluta kaydedildi');
      setTimeout(() => setBusy(''), 3000);
    } catch (err: any) {
      console.error('Cloud save error:', err);
      setBusy(`✗ ${err.message || 'Kayıt başarısız'}`);
      setTimeout(() => setBusy(''), 4000);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doc) return;
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(doc.width / img.width, doc.height / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const layer = createLayer({ name: file.name.replace(/\.[^.]+$/, ''), width: w, height: h });
      const ctx = get2d(layer.canvas);
      ctx.drawImage(img, 0, 0, w, h);
      layer.x = Math.round((doc.width - w) / 2);
      layer.y = Math.round((doc.height - h) / 2);
      addLayer(layer, true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounterRef.current++;
      setDraggingFile(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      dragCounterRef.current--;
      if (dragCounterRef.current === 0) {
        setDraggingFile(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    dragCounterRef.current = 0;
    setDraggingFile(false);
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/') && doc) {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(doc.width / img.width, doc.height / img.height, 1);
          const w = Math.round(img.width * scale);
          const h = Math.round(img.height * scale);
          const layer = createLayer({ name: file.name.replace(/\.[^.]+$/, ''), width: w, height: h });
          const ctx = get2d(layer.canvas);
          ctx.drawImage(img, 0, 0, w, h);
          layer.x = Math.round((doc.width - w) / 2);
          layer.y = Math.round((doc.height - h) / 2);
          addLayer(layer, true);
          URL.revokeObjectURL(img.src);
        };
        img.src = URL.createObjectURL(file);
      }
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="w-full h-full flex flex-col bg-[#090909]"
    >
      {/* PHOTOSHOP STYLE MENU BAR */}
      <AppMenuBar
        doc={doc}
        zoom={zoom}
        dirty={dirty}
        onBack={handleBack}
        onNew={() => setShowNew(true)}
        onOpen={handleOpenProject}
        onSave={handleSave}
        onImport={() => fileRef.current?.click()}
        onExport={handleExport}
        onSaveCloud={handleSaveCloud}
        onToggleAI={() => setShowAI((v) => !v)}
        showAI={showAI}
        onShowShortcuts={() => setShowShortcuts(true)}
        onShowAbout={() => (window as any).__showAboutModal?.()}
        onShowPlugins={() => setShowPlugins(true)}
        onEditingNameChange={setEditingName}
        editingName={editingName}
        onRename={renameDocument}
        busy={busy}
      />

      {/* BODY */}
      <div className="flex-1 flex overflow-hidden">
        <Toolbar />

        {/* CENTER */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <ToolOptionsBar />
          <div className="flex-1 overflow-hidden">
            <CanvasViewport onCursor={(x, y) => setCursorPos({ x: Math.round(x), y: Math.round(y) })} />
          </div>
          {/* STATUS BAR */}
          <div className="h-6 bg-[#0d0d0d] border-t border-[#1a1a1a] flex items-center px-4 justify-between flex-shrink-0">
            <span className="text-[9px] text-[#555] font-mono">X: {cursor.x}  Y: {cursor.y}</span>
            <span className="text-[9px] text-[#555] font-mono">
              {doc ? `${doc.width} × ${doc.height} px · ${doc.dpi} DPI` : ''}
            </span>
            <span className="text-[9px] text-[#555] uppercase tracking-wider">{user?.username ?? 'Misafir'}</span>
          </div>
        </div>

        {/* RIGHT SIDEBAR with resize handle */}
        <div
          className="relative bg-[#111] border-l border-[#1a1a1a] flex flex-col flex-shrink-0"
          style={{ width: sidebarWidth }}
        >
          {/* Drag Handle */}
          <div
            onMouseDown={startDrag}
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-[#3b82f6]/40 transition-colors z-10"
          />

          {showAI ? (
            <AIPanel onClose={() => setShowAI(false)} />
          ) : (
            <>
              <div className="border-b border-[#1a1a1a]">
                <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px] px-3 pt-3">Navigatör</h3>
                <NavigatorPanel />
              </div>

              {/* Tabs */}
              <div className="flex border-b border-[#1a1a1a]">
                {([
                  ['layers', 'Katmanlar'],
                  ['adjust', 'Efekt'],
                  ['color', 'Renk'],
                  ['history', 'Geçmiş'],
                ] as [RightTab, string][]).map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`flex-1 py-2 text-[9px] uppercase tracking-wider font-bold transition-colors ${
                      tab === id ? 'text-white bg-[#161616] border-b-2 border-[#3b82f6]' : 'text-[#555] hover:text-[#888]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-hidden">
                {tab === 'layers' && <LayersPanel />}
                {tab === 'adjust' && <div className="overflow-y-auto h-full"><AdjustmentsPanel /></div>}
                {tab === 'color' && <ColorPanel />}
                {tab === 'history' && <HistoryPanel />}
              </div>
            </>
          )}
        </div>
      </div>

      {/* FILE INPUT */}
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImportFile} />

      {/* MODALS */}
      {showNew && <NewDocumentDialog onClose={() => setShowNew(false)} />}
      {editingTextLayerId && <TextEditorModal layerId={editingTextLayerId} onClose={() => setEditingTextLayerId(null)} />}
      {showPlugins && <PluginsPanel onClose={() => setShowPlugins(false)} />}
      {showShortcuts && <ShortcutsModal onClose={() => setShowShortcuts(false)} />}

      {/* RECOVERY DIALOG */}
      {showRecovery && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in select-none">
          <div className="w-[380px] bg-[#151515]/95 backdrop-blur border border-[#252525] rounded-xl shadow-2xl p-5 text-white animate-modal-scale text-center">
            <div className="w-14 h-14 rounded-full bg-yellow-500/10 flex items-center justify-center text-3xl mx-auto mb-3.5 animate-pulse text-yellow-500">
              ⚠️
            </div>
            <h3 className="text-sm font-semibold tracking-wide text-yellow-500 mb-2">Projeniz Beklenmedik Şekilde Kapatıldı</h3>
            <p className="text-[#aaa] text-xs leading-relaxed mb-5">
              Uygulama son oturumda beklenmedik bir şekilde sonlandı. Otomatik kurtarma sistemimiz projenizin son durumunu yedekledi. Kurtarılan projeyi geri yüklemek ister misiniz?
            </p>
            
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  localStorage.setItem('mireditor-recovery-active', 'false');
                  setShowRecovery(false);
                }}
                className="px-4 py-2 rounded text-[11px] font-semibold text-[#888] hover:text-white bg-[#1a1a1a] hover:bg-[#222] border border-[#2a2a2a] transition-all uppercase tracking-wider"
              >
                Yoksay (Sil)
              </button>
              <button
                onClick={async () => {
                  if (recoveryJson) {
                    try {
                      setBusy('Kurtarılıyor…');
                      const recoveredDoc = await deserializeDocument(recoveryJson);
                      setDocument(recoveredDoc);
                      useEditorStore.setState({ dirty: true });
                    } catch (e) {
                      console.error('Recovery failed:', e);
                    } finally {
                      setBusy('');
                    }
                  }
                  localStorage.setItem('mireditor-recovery-active', 'false');
                  setShowRecovery(false);
                }}
                className="px-5 py-2 rounded text-[11px] font-semibold bg-yellow-500 text-black hover:bg-yellow-600 shadow-lg shadow-yellow-500/20 transition-all uppercase tracking-wider font-bold"
              >
                Projeyi Kurtar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAG OVERLAY */}
      {draggingFile && (
        <div className="fixed inset-0 z-[500] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm border-4 border-dashed border-[#3b82f6]/50 m-4 rounded-2xl pointer-events-none animate-fade-in">
          <div className="bg-[#151515] border border-[#252525] rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-3xl animate-bounce">
              🖼️
            </div>
            <p className="text-white text-base font-semibold tracking-wide">Görseli Buraya Bırakın</p>
            <p className="text-[#666] text-xs">Katman olarak eklemek için dosyayı sürükleyip bırakın</p>
          </div>
        </div>
      )}
    </div>
  );
}
