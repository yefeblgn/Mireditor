import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';

interface Template {
  name: string;
  width: number;
  height: number;
  dpi: number;
  category: string;
  desc: string;
}

const TEMPLATES: Template[] = [
  // Sosyal Medya
  { category: 'Sosyal Medya', name: 'Instagram Kare',   width: 1080, height: 1080, dpi: 72,  desc: '1080×1080' },
  { category: 'Sosyal Medya', name: 'Instagram Story',  width: 1080, height: 1920, dpi: 72,  desc: '1080×1920' },
  { category: 'Sosyal Medya', name: 'Twitter/X Banner', width: 1500, height: 500,  dpi: 72,  desc: '1500×500' },
  { category: 'Sosyal Medya', name: 'Facebook Kapak',   width: 851,  height: 315,  dpi: 72,  desc: '851×315' },
  { category: 'Sosyal Medya', name: 'LinkedIn Banner',  width: 1584, height: 396,  dpi: 72,  desc: '1584×396' },
  // Web
  { category: 'Web',          name: 'Full HD',          width: 1920, height: 1080, dpi: 72,  desc: '1920×1080' },
  { category: 'Web',          name: '2K',               width: 2560, height: 1440, dpi: 72,  desc: '2560×1440' },
  { category: 'Web',          name: 'Web Banner',       width: 1200, height: 628,  dpi: 72,  desc: '1200×628' },
  { category: 'Web',          name: 'Favicon',          width: 512,  height: 512,  dpi: 72,  desc: '512×512' },
  // Video
  { category: 'Video',        name: 'HD Video',         width: 1920, height: 1080, dpi: 72,  desc: '1920×1080' },
  { category: 'Video',        name: '4K Ultra HD',      width: 3840, height: 2160, dpi: 72,  desc: '3840×2160' },
  { category: 'Video',        name: 'YouTube Banner',   width: 2560, height: 1440, dpi: 72,  desc: '2560×1440' },
  { category: 'Video',        name: 'YouTube Thumbnail',width: 1280, height: 720,  dpi: 72,  desc: '1280×720' },
  // Baskı
  { category: 'Baskı',        name: 'A4 Dikey',         width: 2480, height: 3508, dpi: 300, desc: '2480×3508 · 300dpi' },
  { category: 'Baskı',        name: 'A4 Yatay',         width: 3508, height: 2480, dpi: 300, desc: '3508×2480 · 300dpi' },
  { category: 'Baskı',        name: 'A3 Dikey',         width: 3508, height: 4960, dpi: 300, desc: '3508×4960 · 300dpi' },
  { category: 'Baskı',        name: 'Kartvizit',        width: 1050, height: 600,  dpi: 300, desc: '1050×600 · 300dpi' },
  { category: 'Baskı',        name: 'Poster A2',        width: 4961, height: 7016, dpi: 300, desc: '4961×7016 · 300dpi' },
];

const CATEGORIES = Array.from(new Set(TEMPLATES.map((t) => t.category)));

export function TemplatesDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: () => void }) {
  const newDocument = useEditorStore((s) => s.newDocument);
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const filtered = TEMPLATES.filter((t) => t.category === activeCategory);

  const create = (tpl: Template) => {
    newDocument({ name: tpl.name, width: tpl.width, height: tpl.height, dpi: tpl.dpi, background: 'white' });
    onClose();
    onCreated?.();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[680px] max-h-[75vh] bg-[#141414] border border-[#252525] rounded-xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col animate-modal-scale">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-white text-sm font-semibold">Şablondan Oluştur</h2>
            <p className="text-[#555] text-[10px] mt-0.5">Hazır boyutlardan birini seçin</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Kategori sidebar */}
          <div className="w-44 border-r border-[#1e1e1e] py-3 flex flex-col gap-0.5 flex-shrink-0">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-2.5 text-xs transition-colors ${
                  activeCategory === cat
                    ? 'bg-[#1e1e1e] text-white font-medium border-l-2 border-[#3b82f6]'
                    : 'text-[#888] hover:text-[#ccc] hover:bg-[#181818] border-l-2 border-transparent'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Şablon grid */}
          <div className="flex-1 p-5 overflow-y-auto">
            <div className="grid grid-cols-3 gap-3">
              {filtered.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => create(tpl)}
                  className="group bg-[#1a1a1a] hover:bg-[#222] border border-[#252525] hover:border-[#3b82f6]/40 rounded-lg p-4 text-left transition-all"
                >
                  {/* Önizleme kutusu */}
                  <div className="w-full mb-3 rounded overflow-hidden bg-[#0f0f0f] flex items-center justify-center"
                    style={{ aspectRatio: `${Math.min(tpl.width, 200)} / ${Math.min(tpl.height * (200 / Math.max(tpl.width, tpl.height)), 120)}`, maxHeight: 80 }}>
                    <div
                      className="bg-[#2a2a2a] rounded-sm border border-[#333]"
                      style={{
                        width: `${Math.min(100, (tpl.width / Math.max(tpl.width, tpl.height)) * 90)}%`,
                        paddingBottom: `${(tpl.height / tpl.width) * Math.min(100, (tpl.width / Math.max(tpl.width, tpl.height)) * 90)}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] text-white font-medium group-hover:text-[#3b82f6] transition-colors">{tpl.name}</p>
                  <p className="text-[9px] text-[#555] mt-0.5 font-mono">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
