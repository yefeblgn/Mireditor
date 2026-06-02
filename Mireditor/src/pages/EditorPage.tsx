import React, { useEffect, useRef, useState } from 'react';
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
import { AIPanel } from '../editor/ai/AIPanel';
import { createLayer, get2d } from '../editor/model/document';
import { exportImage, openProject, saveProject, type ExportFormat } from '../editor/io/fileService';
import { UI } from '../editor/ui/icons';

interface EditorPageProps {
  onBack: () => void;
}

type RightTab = 'layers' | 'history' | 'color' | 'adjust';

export function EditorPage({ onBack }: EditorPageProps) {
  const { user } = useAuthStore();
  const doc = useEditorStore((s) => s.doc);
  const zoom = useEditorStore((s) => s.view.zoom);
  const dirty = useEditorStore((s) => s.dirty);
  const newDocument = useEditorStore((s) => s.newDocument);
  const renameDocument = useEditorStore((s) => s.renameDocument);
  const addLayer = useEditorStore((s) => s.addLayer);
  const setDocument = useEditorStore((s) => s.setDocument);
  const setFilePath = useEditorStore((s) => s.setFilePath);
  const markClean = useEditorStore((s) => s.markClean);

  const [tab, setTab] = useState<RightTab>('layers');
  const [showNew, setShowNew] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [busy, setBusy] = useState('');
  const [cursor, setCursorPos] = useState({ x: 0, y: 0 });
  const [editingName, setEditingName] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEditorShortcuts();

  // Belge yoksa varsayılan bir belge oluştur
  useEffect(() => {
    if (!doc) newDocument({ name: 'Adsız-1', width: 1920, height: 1080, background: 'white' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dosya kısayolları (Ctrl+S / Ctrl+Shift+S / Ctrl+O)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') {
        e.preventDefault();
        handleSave(e.shiftKey);
      } else if (k === 'o') {
        e.preventDefault();
        handleOpenProject();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

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
    setShowExport(false);
    setBusy('Dışa aktarılıyor…');
    try {
      await exportImage(doc, format);
    } finally {
      setBusy('');
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !doc) return;
    const img = new Image();
    img.onload = () => {
      const layer = createLayer({ name: file.name.replace(/\.[^.]+$/, ''), width: doc.width, height: doc.height });
      const ctx = get2d(layer.canvas);
      // Görüntüyü belgeye sığacak şekilde ortala
      const scale = Math.min(doc.width / img.width, doc.height / img.height, 1);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (doc.width - w) / 2, (doc.height - h) / 2, w, h);
      addLayer(layer, true);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#090909]">
      {/* TOP BAR */}
      <div className="h-9 bg-[#0d0d0d] border-b border-[#1a1a1a] flex items-center px-3 gap-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="px-2.5 py-1 rounded text-[10px] text-[#888] hover:text-white hover:bg-[#1a1a1a] uppercase tracking-wider transition-colors"
        >
          ← Panel
        </button>
        <div className="w-px h-4 bg-[#222]" />

        <TopBtn label="Yeni" onClick={() => setShowNew(true)} />
        <TopBtn label="Aç" onClick={handleOpenProject} />
        <TopBtn label="Kaydet" onClick={() => handleSave(false)} />
        <TopBtn label="Farklı Kaydet" onClick={() => handleSave(true)} />
        <TopBtn label="Görüntü Ekle" onClick={() => fileRef.current?.click()} />
        <div className="relative">
          <TopBtn label="Dışa Aktar ▾" onClick={() => setShowExport((v) => !v)} />
          {showExport && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowExport(false)} />
              <div className="absolute left-0 top-8 z-50 w-32 bg-[#181818] border border-[#2a2a2a] rounded-lg shadow-2xl shadow-black/60 py-1">
                {(['png', 'jpeg', 'webp'] as ExportFormat[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => handleExport(f)}
                    className="w-full text-left px-3 py-1.5 text-[10px] text-[#bbb] hover:bg-[#222] hover:text-white uppercase tracking-wider"
                  >
                    {f === 'jpeg' ? 'JPG' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        {busy && <span className="text-[9px] text-[#3b82f6] ml-1">{busy}</span>}
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImportFile} />

        <div className="flex-1 flex items-center justify-center">
          {editingName ? (
            <input
              autoFocus
              defaultValue={doc?.name ?? ''}
              onBlur={(e) => {
                renameDocument(e.target.value || 'Adsız-1');
                setEditingName(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  renameDocument((e.target as HTMLInputElement).value || 'Adsız-1');
                  setEditingName(false);
                }
              }}
              className="bg-[#141414] border border-[#3b82f6] rounded px-2 py-0.5 text-[11px] text-white text-center outline-none"
            />
          ) : (
            <button
              onDoubleClick={() => setEditingName(true)}
              className="text-[11px] text-[#bbb] font-medium tracking-wide"
              title="Yeniden adlandırmak için çift tıklayın"
            >
              {doc?.name ?? 'Adsız'}
              {dirty && <span className="text-[#3b82f6] ml-1">●</span>}
              <span className="text-[#555] ml-2">
                {doc ? `${doc.width}×${doc.height}` : ''} · {Math.round(zoom * 100)}%
              </span>
            </button>
          )}
        </div>

        <button
          onClick={() => setShowAI((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded text-[10px] uppercase tracking-wider font-semibold transition-colors ${
            showAI ? 'bg-[#3b82f6] text-white' : 'bg-[#3b82f6]/10 text-blue-400 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30'
          }`}
        >
          {UI.sparkles} AI Stüdyo
        </button>
      </div>

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
            <span className="text-[9px] text-[#555] font-mono">
              X: {cursor.x} Y: {cursor.y}
            </span>
            <span className="text-[9px] text-[#555] font-mono">
              {doc ? `${doc.width} × ${doc.height} px · ${doc.dpi} DPI` : ''}
            </span>
            <span className="text-[9px] text-[#555] uppercase tracking-wider">
              {user?.username ?? 'Misafir'}
            </span>
          </div>
        </div>

        {/* RIGHT */}
        <div className="w-72 bg-[#111] border-l border-[#1a1a1a] flex flex-col flex-shrink-0">
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

      {showNew && <NewDocumentDialog onClose={() => setShowNew(false)} />}
    </div>
  );
}

function TopBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded text-[10px] text-[#999] hover:text-white hover:bg-[#1a1a1a] uppercase tracking-wider transition-colors"
    >
      {label}
    </button>
  );
}
