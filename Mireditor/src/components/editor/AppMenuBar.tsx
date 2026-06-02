import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../../editor/store/useEditorStore';
import type { MirDocument } from '../../editor/model/types';
import type { ExportFormat } from '../../editor/io/fileService';

// ─── Tip Tanımları ────────────────────────────────────────────────────────────

export interface MenuItem {
  label?: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
  submenu?: MenuItem[];
}

export interface AppMenuBarProps {
  doc: MirDocument | null;
  zoom: number;
  dirty: boolean;
  onBack: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: (saveAs?: boolean) => void;
  onImport: () => void;
  onExport: (format: ExportFormat) => void;
  onSaveCloud: () => void;
  onToggleAI: () => void;
  showAI: boolean;
  onShowShortcuts: () => void;
  onShowAbout: () => void;
  onShowPlugins: () => void;
  onEditingNameChange: (v: boolean) => void;
  editingName: boolean;
  onRename: (name: string) => void;
  busy: string;
}

// ─── Dropdown Menü ────────────────────────────────────────────────────────────

function DropdownMenu({ items, onClose }: { items: MenuItem[]; onClose: () => void }) {
  return (
    <div className="min-w-[200px] bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg shadow-2xl shadow-black/70 py-1 z-[500]">
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="my-1 h-px bg-[#2a2a2a]" />;
        }
        if (item.submenu) {
          return (
            <SubMenuItem key={i} item={item} onClose={onClose} />
          );
        }
        return (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => { if (!item.disabled) { item.action?.(); onClose(); } }}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-[11px] transition-colors ${
              item.disabled ? 'text-[#444] cursor-default' : 'text-[#ccc] hover:bg-[#2a2a2a] hover:text-white'
            }`}
          >
            <span>{item.label ?? ''}</span>
            {item.shortcut && (
              <span className="text-[#444] text-[9px] ml-6 font-mono">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SubMenuItem({ item, onClose }: { item: MenuItem; onClose: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px] text-[#ccc] hover:bg-[#2a2a2a] hover:text-white cursor-default">
        <span>{item.label ?? ''}</span>
        <span className="text-[#555] text-[9px] ml-6">▶</span>
      </div>
      {open && item.submenu && (
        <div className="absolute left-full top-0 ml-0.5">
          <DropdownMenu items={item.submenu} onClose={onClose} />
        </div>
      )}
    </div>
  );
}

// ─── Menü Butonu ─────────────────────────────────────────────────────────────

function MenuButton({
  label,
  items,
  activeMenu,
  menuId,
  onActivate,
  onClose,
}: {
  label: string;
  items: MenuItem[];
  activeMenu: string | null;
  menuId: string;
  onActivate: (id: string) => void;
  onClose: () => void;
}) {
  const isOpen = activeMenu === menuId;
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => onActivate(isOpen ? '' : menuId)}
        onMouseEnter={() => { if (activeMenu && activeMenu !== menuId) onActivate(menuId); }}
        className={`px-3 py-1 text-[11px] rounded transition-colors font-medium tracking-wide ${
          isOpen ? 'bg-[#2a2a2a] text-white' : 'text-[#999] hover:text-white hover:bg-[#1e1e1e]'
        }`}
      >
        {label}
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-0.5">
          <DropdownMenu items={items} onClose={onClose} />
        </div>
      )}
    </div>
  );
}

// ─── AppMenuBar ───────────────────────────────────────────────────────────────

export function AppMenuBar({
  doc, zoom, dirty, onBack, onNew, onOpen, onSave, onImport, onExport,
  onSaveCloud, onToggleAI, showAI, onShowShortcuts, onShowAbout,
  onShowPlugins, onEditingNameChange, editingName, onRename, busy,
}: AppMenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const mergeDown = useEditorStore((s) => s.mergeDown);
  const flattenImage = useEditorStore((s) => s.flattenImage);
  const addRasterLayer = useEditorStore((s) => s.addRasterLayer);
  const setSelection = useEditorStore((s) => s.setSelection);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const setView = useEditorStore((s) => s.setView);
  const activeLayerId = useEditorStore((s) => s.doc?.activeLayerId ?? null);
  const selection = useEditorStore((s) => s.selection);
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const rotateLayer = useEditorStore((s) => s.rotateLayer);
  const flipLayer = useEditorStore((s) => s.flipLayer);

  const closeMenu = useCallback(() => setActiveMenu(null), []);

  // Dışarı tıkla → menü kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) closeMenu();
    };
    if (activeMenu) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [activeMenu, closeMenu]);

  // ─── Menü Tanımları ───────────────────────────────────────────────────────

  const dosyaMenu: MenuItem[] = [
    { label: 'Yeni',           shortcut: 'Ctrl+N',       action: onNew },
    { label: 'Aç',             shortcut: 'Ctrl+O',       action: onOpen },
    { separator: true },
    { label: 'Kaydet',         shortcut: 'Ctrl+S',       action: () => onSave(false), disabled: !doc },
    { label: 'Farklı Kaydet',  shortcut: 'Ctrl+Shift+S', action: () => onSave(true),  disabled: !doc },
    { label: 'Buluta Kaydet',                             action: onSaveCloud,          disabled: !doc },
    { separator: true },
    { label: 'Görüntü Ekle',                              action: onImport },
    {
      label: 'Dışa Aktar', disabled: !doc,
      submenu: [
        { label: 'PNG',  action: () => onExport('png') },
        { label: 'JPEG', action: () => onExport('jpeg') },
        { label: 'WebP', action: () => onExport('webp') },
      ],
    },
    { separator: true },
    { label: '← Dashboard\'a Dön', action: onBack },
  ];

  const duzenleMenu: MenuItem[] = [
    { label: 'Geri Al',               shortcut: 'Ctrl+Z',           action: undo,  disabled: past.length === 0 },
    { label: 'İleri Al',              shortcut: 'Ctrl+Shift+Z',     action: redo,  disabled: future.length === 0 },
    { separator: true },
    { label: 'Tümünü Seç',            shortcut: 'Ctrl+A',           action: () => { /* CanvasViewport handles */ window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', ctrlKey: true, bubbles: true })); } },
    { label: 'Seçimi Kaldır',         shortcut: 'Ctrl+D',           action: () => setSelection(null) },
    { label: 'Seçimi Tersine Çevir',  shortcut: 'Ctrl+Shift+I',     action: () => { /* TODO */ }, disabled: !selection },
    { separator: true },
    { label: 'Serbest Dönüşüm',       shortcut: 'Ctrl+T',           action: () => window.dispatchEvent(new CustomEvent('mireditor:open-transform')), disabled: !activeLayerId },
  ];

  const goruntuMenu: MenuItem[] = [
    {
      label: 'Döndür',
      submenu: [
        { label: '90° Saat Yönünde',     action: () => activeLayerId && rotateLayer(activeLayerId, 90),  disabled: !activeLayerId },
        { label: '90° Saat Yönü Tersine',action: () => activeLayerId && rotateLayer(activeLayerId, -90), disabled: !activeLayerId },
        { label: '180°',                  action: () => activeLayerId && rotateLayer(activeLayerId, 180), disabled: !activeLayerId },
      ],
    },
    {
      label: 'Çevir',
      submenu: [
        { label: 'Yatay',  action: () => activeLayerId && flipLayer(activeLayerId, 'horizontal'), disabled: !activeLayerId },
        { label: 'Dikey',  action: () => activeLayerId && flipLayer(activeLayerId, 'vertical'),   disabled: !activeLayerId },
      ],
    },
    { separator: true },
    {
      label: 'Ayarlamalar',
      submenu: [
        { label: 'Parlaklık / Kontrast', action: () => {} },
        { label: 'Renk Tonu / Doygunluk', action: () => {} },
        { label: 'Düzeyler', action: () => {} },
      ],
    },
  ];

  const katmanMenu: MenuItem[] = [
    { label: 'Yeni Katman',        shortcut: 'Ctrl+Shift+N', action: () => addRasterLayer() },
    { label: 'Katmanı Çoğalt',     shortcut: 'Ctrl+J',       action: () => activeLayerId && duplicateLayer(activeLayerId), disabled: !activeLayerId },
    { label: 'Katmanı Sil',        shortcut: 'Del',          action: () => activeLayerId && removeLayer(activeLayerId), disabled: !activeLayerId },
    { separator: true },
    { label: 'Aşağıyla Birleştir', shortcut: 'Ctrl+E',       action: () => activeLayerId && mergeDown(activeLayerId), disabled: !activeLayerId },
    { label: 'Tüm Katmanları Birleştir', shortcut: 'Ctrl+Shift+E', action: flattenImage, disabled: !doc },
  ];

  const secimMenu: MenuItem[] = [
    { label: 'Tümünü Seç',    shortcut: 'Ctrl+A', action: () => { if (doc) setSelection({ x: 0, y: 0, width: doc.width, height: doc.height }); } },
    { label: 'Seçimi Kaldır', shortcut: 'Ctrl+D', action: () => setSelection(null) },
    { label: 'Tersine Çevir', shortcut: 'Ctrl+Shift+I', action: () => {}, disabled: !selection },
    { separator: true },
    { label: 'Seçim Araçları', submenu: [
      { label: 'Dikdörtgen Seçim (M)', action: () => setActiveTool('marquee') },
      { label: 'Kement (L)',            action: () => setActiveTool('lasso') },
      { label: 'Sihirli Değnek (W)',    action: () => setActiveTool('marquee') },
    ]},
  ];

  const filtreMenu: MenuItem[] = [
    { label: 'Bulanıklaştır',   action: () => {} },
    { label: 'Keskinleştir',    action: () => {} },
    { label: 'Gürültü Ekle',    action: () => {} },
    { label: 'Pikselleştir',    action: () => {} },
    { separator: true },
    { label: 'Gri Tonlama',     action: () => {} },
    { label: 'Sepya',           action: () => {} },
    { label: 'Renkleri Ters Çevir', shortcut: 'Ctrl+I', action: () => {} },
  ];

  const gorunumMenu: MenuItem[] = [
    { label: 'Yakınlaştır',      shortcut: 'Ctrl++', action: () => setView({ zoom: Math.min(zoom * 1.25, 32) }) },
    { label: 'Uzaklaştır',       shortcut: 'Ctrl+-', action: () => setView({ zoom: Math.max(zoom * 0.8, 0.02) }) },
    { label: 'Ekrana Sığdır',    shortcut: 'Ctrl+0', action: () => window.dispatchEvent(new CustomEvent('mireditor:fit')) },
    { label: '%100',             shortcut: 'Ctrl+1', action: () => setView({ zoom: 1, panX: 0, panY: 0 }) },
    { separator: true },
    { label: 'AI Stüdyo',                            action: onToggleAI },
  ];

  const eklentilerMenu: MenuItem[] = [
    { label: 'Eklentileri Yönet', action: onShowPlugins },
  ];

  const yardimMenu: MenuItem[] = [
    { label: 'Klavye Kısayolları', shortcut: 'F1', action: onShowShortcuts },
    { separator: true },
    { label: 'Hakkında', action: onShowAbout },
  ];

  const MENUS = [
    { id: 'dosya',     label: 'Dosya',     items: dosyaMenu     },
    { id: 'duzenle',   label: 'Düzenle',   items: duzenleMenu   },
    { id: 'goruntu',   label: 'Görüntü',   items: goruntuMenu   },
    { id: 'katman',    label: 'Katman',    items: katmanMenu    },
    { id: 'secim',     label: 'Seçim',     items: secimMenu     },
    { id: 'filtre',    label: 'Filtre',    items: filtreMenu    },
    { id: 'gorunum',   label: 'Görünüm',   items: gorunumMenu   },
    { id: 'eklentiler',label: 'Eklentiler',items: eklentilerMenu},
    { id: 'yardim',    label: 'Yardım',    items: yardimMenu    },
  ];

  return (
    <div ref={barRef} className="relative z-50 h-8 bg-[#0d0d0d] border-b border-[#1a1a1a] flex items-center px-2 gap-0.5 flex-shrink-0 select-none">
      {/* Menü butonları */}
      {MENUS.map((m) => (
        <MenuButton
          key={m.id}
          label={m.label}
          items={m.items}
          menuId={m.id}
          activeMenu={activeMenu}
          onActivate={setActiveMenu}
          onClose={closeMenu}
        />
      ))}

      <div className="w-px h-4 bg-[#222] mx-1" />

      {/* Proje adı (çift tıkla ile düzenle) */}
      <div className="flex-1 flex items-center justify-center">
        {editingName ? (
          <input
            autoFocus
            defaultValue={doc?.name ?? ''}
            onBlur={(e) => { onRename(e.target.value || 'Adsız-1'); onEditingNameChange(false); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { onRename((e.target as HTMLInputElement).value || 'Adsız-1'); onEditingNameChange(false); }
              if (e.key === 'Escape') onEditingNameChange(false);
            }}
            className="bg-[#141414] border border-[#3b82f6] rounded px-2 py-0.5 text-[11px] text-white text-center outline-none w-40"
          />
        ) : (
          <button
            onDoubleClick={() => onEditingNameChange(true)}
            className="text-[11px] text-[#bbb] font-medium tracking-wide hover:text-white transition-colors"
            title="Yeniden adlandırmak için çift tıklayın"
          >
            {doc?.name ?? 'Adsız'}
            {dirty && <span className="text-[#3b82f6] ml-1">●</span>}
            <span className="text-[#444] ml-2 font-mono">
              {doc ? `${doc.width}×${doc.height}` : ''}{doc ? ` · ${Math.round(zoom * 100)}%` : ''}
            </span>
          </button>
        )}
      </div>

      {/* Sağ: busy + AI butonu */}
      {busy && <span className="text-[9px] text-[#3b82f6] mr-1">{busy}</span>}
      <button
        onClick={onToggleAI}
        className={`flex items-center gap-1 px-2.5 py-1 rounded text-[10px] uppercase tracking-wider font-semibold transition-colors ${
          showAI ? 'bg-[#3b82f6] text-white' : 'bg-[#3b82f6]/10 text-blue-400 hover:bg-[#3b82f6]/20 border border-[#3b82f6]/30'
        }`}
      >
        ✦ AI
      </button>
    </div>
  );
}
