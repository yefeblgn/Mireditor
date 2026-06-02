import React, { useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { createLayer, get2d, getActiveLayer } from '../model/document';
import { UI } from '../ui/icons';
import { loadAISettings, saveAISettings, SUGGESTED_IMAGE_MODELS } from './settings';
import { createOpenRouterProvider } from './openrouter';
import { removeBackgroundLocal, upscaleDocument } from './localOps';
import type { AISettings } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Görüntü yüklenemedi'));
    img.src = src;
  });
}

export function AIPanel({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AISettings>(() => loadAISettings());
  const [showSettings, setShowSettings] = useState(!settings.apiKey);
  const [prompt, setPrompt] = useState('');
  const [fillPrompt, setFillPrompt] = useState('');
  const [tolerance, setTolerance] = useState(40);
  const [factor, setFactor] = useState(2);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const persist = (patch: Partial<AISettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAISettings(next);
  };

  const run = async (label: string, fn: () => Promise<void> | void) => {
    setBusy(label);
    setError('');
    setInfo('');
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message || 'Bir hata oluştu.');
    } finally {
      setBusy('');
    }
  };

  // ── Metinden Görüntü ──
  const handleTextToImage = () =>
    run('Görüntü üretiliyor…', async () => {
      const st = useEditorStore.getState();
      if (!st.doc) return;
      if (!prompt.trim()) throw new Error('Lütfen bir açıklama (prompt) girin.');
      const provider = createOpenRouterProvider(settings);
      const dataUrl = await provider.textToImage(prompt.trim(), { width: st.doc.width, height: st.doc.height });
      const img = await loadImage(dataUrl);
      const layer = createLayer({ name: 'AI Görüntü', width: st.doc.width, height: st.doc.height });
      const ctx = get2d(layer.canvas);
      const scale = Math.min(st.doc.width / img.width, st.doc.height / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      ctx.drawImage(img, (st.doc.width - dw) / 2, (st.doc.height - dh) / 2, dw, dh);
      st.addLayer(layer, true);
      setInfo('Görüntü yeni katman olarak eklendi.');
    });

  // ── Generative Fill (seçim + prompt) ──
  const handleGenerativeFill = () =>
    run('Dolduruluyor…', async () => {
      const st = useEditorStore.getState();
      const layer = getActiveLayer(st.doc);
      if (!st.doc || !layer) return;
      if (layer.locked) throw new Error('Aktif katman kilitli.');
      const sel = st.selection;
      const region = sel && sel.width > 2 && sel.height > 2
        ? { x: Math.round(sel.x), y: Math.round(sel.y), w: Math.round(sel.width), h: Math.round(sel.height) }
        : { x: 0, y: 0, w: st.doc.width, h: st.doc.height };
      if (!fillPrompt.trim()) throw new Error('Lütfen bir doldurma açıklaması girin.');

      // Kaynak bölgeyi PNG olarak çıkar
      const tmp = document.createElement('canvas');
      tmp.width = region.w;
      tmp.height = region.h;
      get2d(tmp).drawImage(layer.canvas, region.x - layer.x, region.y - layer.y, region.w, region.h, 0, 0, region.w, region.h);
      const srcUrl = tmp.toDataURL('image/png');

      const provider = createOpenRouterProvider(settings);
      const resultUrl = await provider.editImage(srcUrl, fillPrompt.trim(), null, { width: region.w, height: region.h });
      const img = await loadImage(resultUrl);

      st.pushHistory('AI Doldurma');
      const ctx = get2d(layer.canvas);
      ctx.save();
      ctx.beginPath();
      ctx.rect(region.x - layer.x, region.y - layer.y, region.w, region.h);
      ctx.clip();
      ctx.drawImage(img, region.x - layer.x, region.y - layer.y, region.w, region.h);
      ctx.restore();
      st.bumpRender();
      setInfo('Bölge AI ile dolduruldu.');
    });

  // ── Arkaplan Kaldır (çevrimdışı) ──
  const handleRemoveBg = () =>
    run('Arkaplan kaldırılıyor…', async () => {
      const st = useEditorStore.getState();
      const layer = getActiveLayer(st.doc);
      if (!layer) return;
      if (layer.locked) throw new Error('Aktif katman kilitli.');
      st.pushHistory('Arkaplan Kaldır');
      removeBackgroundLocal(layer.canvas, tolerance);
      st.bumpRender();
      setInfo('Arkaplan kaldırıldı (çevrimdışı sezgisel).');
    });

  // ── Büyüt (çevrimdışı) ──
  const handleUpscale = () =>
    run('Büyütülüyor…', async () => {
      const st = useEditorStore.getState();
      if (!st.doc) return;
      st.pushHistory('AI Büyüt');
      const up = upscaleDocument(st.doc, factor);
      useEditorStore.setState({ doc: up, renderVersion: st.renderVersion + 1, dirty: true });
      window.dispatchEvent(new CustomEvent('mireditor:fit'));
      setInfo(`Belge ${factor}× büyütüldü (${up.width}×${up.height}).`);
    });

  const disabled = busy !== '';

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1a1a1a] sticky top-0 bg-[#111] z-10">
        <span className="flex items-center gap-1.5 text-[10px] text-blue-400 font-bold uppercase tracking-[2px]">
          {UI.sparkles} AI Stüdyo
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSettings((v) => !v)} className="text-[#666] hover:text-white text-xs px-1" title="AI Ayarları">
            ⚙
          </button>
          <button onClick={onClose} className="text-[#555] hover:text-white text-xs px-1">
            ✕
          </button>
        </div>
      </div>

      {/* Ayarlar */}
      {showSettings && (
        <div className="p-3 space-y-3 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div>
            <label className="block text-[9px] text-[#666] uppercase tracking-wider mb-1.5">OpenRouter API Anahtarı</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => persist({ apiKey: e.target.value })}
              placeholder="sk-or-..."
              className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#3b82f6]"
            />
            <p className="text-[8px] text-[#444] mt-1">Anahtar yalnızca bu cihazda saklanır. openrouter.ai üzerinden alınır.</p>
          </div>
          <div>
            <label className="block text-[9px] text-[#666] uppercase tracking-wider mb-1.5">Görüntü Modeli</label>
            <input
              list="ai-models"
              value={settings.imageModel}
              onChange={(e) => persist({ imageModel: e.target.value })}
              className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#3b82f6]"
            />
            <datalist id="ai-models">
              {SUGGESTED_IMAGE_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
        </div>
      )}

      <div className="p-3 space-y-4">
        {/* Metinden Görüntü */}
        <AICard title="Metinden Görüntü" badge="OpenRouter">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Örn: gün batımında dağ manzarası, sinematik..."
            rows={3}
            className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#3b82f6] resize-none"
          />
          <PrimaryBtn disabled={disabled} onClick={handleTextToImage}>
            Görüntü Üret
          </PrimaryBtn>
        </AICard>

        {/* Generative Fill */}
        <AICard title="Generative Fill" badge="OpenRouter">
          <p className="text-[9px] text-[#555]">Bir bölge seçin (yoksa tüm katman) ve doldurma açıklaması girin.</p>
          <textarea
            value={fillPrompt}
            onChange={(e) => setFillPrompt(e.target.value)}
            placeholder="Örn: seçili alanı çiçeklerle doldur"
            rows={2}
            className="w-full bg-[#141414] border border-[#262626] rounded px-2 py-1.5 text-[11px] text-white outline-none focus:border-[#3b82f6] resize-none"
          />
          <PrimaryBtn disabled={disabled} onClick={handleGenerativeFill}>
            Bölgeyi Doldur
          </PrimaryBtn>
        </AICard>

        {/* Arkaplan Kaldır */}
        <AICard title="Arkaplan Kaldır" badge="Çevrimdışı">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[#666] uppercase">Tolerans</span>
            <input type="range" min={5} max={120} value={tolerance} onChange={(e) => setTolerance(Number(e.target.value))} className="flex-1 accent-[#3b82f6]" />
            <span className="text-[10px] text-[#999] w-6 text-right">{tolerance}</span>
          </div>
          <PrimaryBtn disabled={disabled} onClick={handleRemoveBg}>
            Arkaplanı Kaldır
          </PrimaryBtn>
        </AICard>

        {/* Upscale */}
        <AICard title="Büyüt & İyileştir" badge="Çevrimdışı">
          <div className="flex items-center gap-2">
            {[2, 3, 4].map((f) => (
              <button
                key={f}
                onClick={() => setFactor(f)}
                className={`flex-1 py-1.5 rounded text-[10px] ${factor === f ? 'bg-[#3b82f6] text-white' : 'bg-[#1a1a1a] text-[#888] hover:text-white'}`}
              >
                {f}×
              </button>
            ))}
          </div>
          <PrimaryBtn disabled={disabled} onClick={handleUpscale}>
            Belgeyi Büyüt
          </PrimaryBtn>
        </AICard>

        {/* Durum */}
        {busy && (
          <div className="flex items-center gap-2 text-[11px] text-[#3b82f6]">
            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-20" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {busy}
          </div>
        )}
        {error && <div className="text-[10px] text-red-400 bg-red-900/20 border border-red-900/40 rounded p-2">{error}</div>}
        {info && !busy && <div className="text-[10px] text-green-400 bg-green-900/20 border border-green-900/40 rounded p-2">{info}</div>}
      </div>
    </div>
  );
}

function AICard({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#141414] border border-[#222] rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] text-white font-semibold">{title}</h4>
        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase tracking-wider ${badge === 'Çevrimdışı' ? 'bg-[#1f2a1f] text-green-400' : 'bg-[#1d2333] text-blue-400'}`}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-1.5 rounded text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        disabled ? 'bg-[#1a1a1a] text-[#444] cursor-not-allowed' : 'bg-[#3b82f6] text-white hover:bg-blue-600'
      }`}
    >
      {children}
    </button>
  );
}
