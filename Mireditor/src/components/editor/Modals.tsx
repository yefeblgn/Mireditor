import React, { useState, useEffect } from 'react';
import { X, Keyboard, Info, Monitor, Smartphone, FileImage, Layout, Star, Film, Hash } from 'lucide-react';
import { ProjectConfig } from '../../store/useEditorStore';

// ── Size presets ──
const SIZE_PRESETS = [
  { name: 'Instagram Post', width: 1080, height: 1080, category: 'social', icon: <Hash size={14} /> },
  { name: 'Instagram Story', width: 1080, height: 1920, category: 'social', icon: <Smartphone size={14} /> },
  { name: 'Facebook Kapak', width: 820, height: 312, category: 'social', icon: <Layout size={14} /> },
  { name: 'Twitter/X Başlık', width: 1500, height: 500, category: 'social', icon: <Layout size={14} /> },
  { name: 'YouTube Küçük Resim', width: 1280, height: 720, category: 'video', icon: <Film size={14} /> },
  { name: 'Full HD', width: 1920, height: 1080, category: 'screen', icon: <Monitor size={14} /> },
  { name: '4K UHD', width: 3840, height: 2160, category: 'screen', icon: <Monitor size={14} /> },
  { name: 'A4 (300dpi)', width: 2480, height: 3508, category: 'print', icon: <FileImage size={14} /> },
  { name: 'A3 (300dpi)', width: 3508, height: 4961, category: 'print', icon: <FileImage size={14} /> },
  { name: 'Letter (300dpi)', width: 2550, height: 3300, category: 'print', icon: <FileImage size={14} /> },
  { name: 'Logo', width: 500, height: 500, category: 'other', icon: <Star size={14} /> },
  { name: 'Web Banner', width: 728, height: 90, category: 'other', icon: <Layout size={14} /> },
];

// ── New Project Modal ──
export function NewProjectModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (config: ProjectConfig) => void;
}) {
  const [title, setTitle] = useState('Untitled-1');
  const [width, setWidth] = useState(1920);
  const [height, setHeight] = useState(1080);
  const [bg, setBg] = useState('#ffffff');
  const [bgType, setBgType] = useState<'white' | 'transparent' | 'custom'>('white');
  const [category, setCategory] = useState<string>('all');

  const handlePreset = (preset: typeof SIZE_PRESETS[0]) => {
    setWidth(preset.width);
    setHeight(preset.height);
    setTitle(preset.name);
  };

  const handleCreate = () => {
    const finalBg = bgType === 'white' ? '#ffffff' : bgType === 'transparent' ? 'transparent' : bg;
    onCreate({ title, width, height, backgroundColor: finalBg });
  };

  const filtered = category === 'all' ? SIZE_PRESETS : SIZE_PRESETS.filter((p) => p.category === category);

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center animate-modal-in" style={{ cursor: 'default' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[640px] max-h-[80vh] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold tracking-wide">Yeni Proje Oluştur</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors" style={{ cursor: 'default' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[65vh]">
          {/* Title */}
          <div className="mb-5">
            <label className="text-[#888] text-[10px] font-bold uppercase tracking-[2px] block mb-2">Proje Adı</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#111] text-white text-sm border border-[#2a2a2a] rounded-lg px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-colors"
              placeholder="Proje adı..."
            />
          </div>

          {/* Size inputs */}
          <div className="flex gap-4 mb-5">
            <div className="flex-1">
              <label className="text-[#888] text-[10px] font-bold uppercase tracking-[2px] block mb-2">Genişlik (px)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#111] text-white text-sm border border-[#2a2a2a] rounded-lg px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div className="flex items-end pb-2.5 text-[#555]">×</div>
            <div className="flex-1">
              <label className="text-[#888] text-[10px] font-bold uppercase tracking-[2px] block mb-2">Yükseklik (px)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Math.max(1, Number(e.target.value)))}
                className="w-full bg-[#111] text-white text-sm border border-[#2a2a2a] rounded-lg px-4 py-2.5 outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
          </div>

          {/* Background */}
          <div className="mb-5">
            <label className="text-[#888] text-[10px] font-bold uppercase tracking-[2px] block mb-2">Arka Plan</label>
            <div className="flex gap-2">
              <button
                onClick={() => { setBgType('white'); setBg('#ffffff'); }}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  bgType === 'white'
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-blue-400'
                    : 'border-[#2a2a2a] text-[#888] hover:border-[#444]'
                }`}
                style={{ cursor: 'default' }}
              >
                Beyaz
              </button>
              <button
                onClick={() => setBgType('transparent')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                  bgType === 'transparent'
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-blue-400'
                    : 'border-[#2a2a2a] text-[#888] hover:border-[#444]'
                }`}
                style={{ cursor: 'default' }}
              >
                Şeffaf
              </button>
              <button
                onClick={() => setBgType('custom')}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-colors flex items-center gap-2 ${
                  bgType === 'custom'
                    ? 'border-[#3b82f6] bg-[#3b82f6]/10 text-blue-400'
                    : 'border-[#2a2a2a] text-[#888] hover:border-[#444]'
                }`}
                style={{ cursor: 'default' }}
              >
                Özel
              </button>
              {bgType === 'custom' && (
                <input
                  type="color"
                  value={bg}
                  onChange={(e) => setBg(e.target.value)}
                  className="w-8 h-8 border border-[#333] rounded cursor-pointer"
                  style={{ cursor: 'pointer' }}
                />
              )}
            </div>
          </div>

          {/* Presets */}
          <div className="mb-5">
            <label className="text-[#888] text-[10px] font-bold uppercase tracking-[2px] block mb-2">Boyut Şablonları</label>
            <div className="flex gap-1.5 mb-3">
              {['all', 'social', 'screen', 'print', 'video', 'other'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-2.5 py-1 text-[10px] rounded-md transition-colors ${
                    category === cat
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#666] hover:text-white hover:bg-[#252525]'
                  }`}
                  style={{ cursor: 'default' }}
                >
                  {cat === 'all' ? 'Tümü' : cat === 'social' ? 'Sosyal' : cat === 'screen' ? 'Ekran' : cat === 'print' ? 'Baskı' : cat === 'video' ? 'Video' : 'Diğer'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {filtered.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePreset(preset)}
                  className={`p-2.5 rounded-lg border transition-all text-left group ${
                    width === preset.width && height === preset.height
                      ? 'border-[#3b82f6] bg-[#3b82f6]/10'
                      : 'border-[#2a2a2a] hover:border-[#444] hover:bg-[#1a1a1a]'
                  }`}
                  style={{ cursor: 'default' }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[#666] group-hover:text-[#999]">{preset.icon}</span>
                    <span className="text-[11px] text-[#ccc] font-medium truncate">{preset.name}</span>
                  </div>
                  <span className="text-[10px] text-[#555]">{preset.width} × {preset.height}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            className="w-full py-3 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-bold uppercase tracking-[2px] rounded-lg transition-colors"
            style={{ cursor: 'default' }}
          >
            Oluştur
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shortcuts Modal ──
export function ShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    { category: 'Genel', items: [
      { key: 'Ctrl+N', desc: 'Yeni Proje' },
      { key: 'Ctrl+O', desc: 'Aç' },
      { key: 'Ctrl+S', desc: 'Kaydet' },
      { key: 'Ctrl+Shift+S', desc: 'Farklı Kaydet' },
      { key: 'Ctrl+Z', desc: 'Geri Al' },
      { key: 'Ctrl+Shift+Z / Ctrl+Y', desc: 'Yinele' },
    ]},
    { category: 'Düzenleme', items: [
      { key: 'Ctrl+C', desc: 'Kopyala' },
      { key: 'Ctrl+X', desc: 'Kes' },
      { key: 'Ctrl+V', desc: 'Yapıştır' },
      { key: 'Ctrl+A', desc: 'Tümünü Seç' },
      { key: 'Ctrl+D', desc: 'Seçimi Kaldır' },
      { key: 'Ctrl+T', desc: 'Serbest Dönüştür' },
      { key: 'Delete', desc: 'Sil' },
    ]},
    { category: 'Katman', items: [
      { key: 'Ctrl+Shift+N', desc: 'Yeni Katman' },
      { key: 'Ctrl+E', desc: 'Aşağı Birleştir' },
      { key: 'Ctrl+Shift+E', desc: 'Düzleştir' },
      { key: 'Ctrl+G', desc: 'Grupla' },
      { key: 'Ctrl+Shift+G', desc: 'Grubu Çöz' },
    ]},
    { category: 'Araçlar', items: [
      { key: 'V', desc: 'Taşı' },
      { key: 'M', desc: 'Seçim' },
      { key: 'L', desc: 'Kement' },
      { key: 'W', desc: 'Sihirli Değnek' },
      { key: 'C', desc: 'Kırpma' },
      { key: 'I', desc: 'Damlalık' },
      { key: 'B', desc: 'Fırça' },
      { key: 'E', desc: 'Silgi' },
      { key: 'G', desc: 'Dolgu' },
      { key: 'T', desc: 'Metin' },
      { key: 'P', desc: 'Kalem Aracı' },
      { key: 'U', desc: 'Şekil' },
      { key: 'H', desc: 'El' },
      { key: 'Z', desc: 'Yakınlaştır' },
      { key: 'Space', desc: 'El Aracı (basılı tut)' },
    ]},
    { category: 'Görünüm', items: [
      { key: 'Ctrl++', desc: 'Yakınlaştır' },
      { key: 'Ctrl+-', desc: 'Uzaklaştır' },
      { key: 'Ctrl+0', desc: 'Ekrana Sığdır' },
      { key: 'Ctrl+1', desc: 'Gerçek Boyut' },
    ]},
    { category: 'Fırça', items: [
      { key: '[', desc: 'Fırça Küçült' },
      { key: ']', desc: 'Fırça Büyüt' },
      { key: 'X', desc: 'Renkleri Değiştir' },
      { key: 'D', desc: 'Varsayılan Renkler' },
    ]},
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center animate-modal-in" style={{ cursor: 'default' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[560px] max-h-[80vh] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <div className="flex items-center gap-2">
            <Keyboard size={16} className="text-[#3b82f6]" />
            <h2 className="text-white text-sm font-semibold">Klavye Kısayolları</h2>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors" style={{ cursor: 'default' }}>
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[65vh] space-y-5">
          {shortcuts.map((group) => (
            <div key={group.category}>
              <h3 className="text-[#666] text-[10px] font-bold uppercase tracking-[2px] mb-2">{group.category}</h3>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1.5 px-3 rounded hover:bg-[#1a1a1a] transition-colors">
                    <span className="text-[#ccc] text-xs">{item.desc}</span>
                    <kbd className="bg-[#222] text-[#888] text-[10px] px-2 py-0.5 rounded border border-[#333] font-mono">{item.key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── About Modal ──
export function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center animate-modal-in" style={{ cursor: 'default' }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[380px] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        <div className="p-8 text-center">
          <img src="./assets/icon-nobg.png" alt="Mireditor" className="w-16 h-16 mx-auto mb-4 opacity-80" draggable={false} />
          <h2 className="text-white text-lg font-bold mb-1">Mireditor</h2>
          <p className="text-[#666] text-xs mb-4">Graphics Engine v0.0.4</p>
          <p className="text-[#555] text-[10px] mb-6">
            Profesyonel görsel düzenleme aracı.
            <br />Tasarım: Efe Bilgin
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[#252525] text-[#ccc] text-xs rounded-lg hover:bg-[#333] transition-colors"
            style={{ cursor: 'default' }}
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
