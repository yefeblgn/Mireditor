# Mireditor

AI destekli, katmanlı, GPU hızlandırmalı profesyonel görüntü editörü — masaüstü (Electron) + web (Vite/React).

## Mimari Özet

```
Mireditor/                     # Kök depo
├─ backend/                    # Opsiyonel Node/Express + MySQL API (local-first)
│  ├─ server.js                # /api/health, auth endpoint'leri (geliştirilebilir)
│  ├─ .env.example             # DB / PORT ayarları
│  └─ package.json
└─ Mireditor/                  # Vite + React 19 + Electron 40 uygulaması
   ├─ main.electron.js         # Electron ana süreç: splash, boot, dosya IPC, son projeler
   ├─ preload-splash.js, splash.html
   ├─ index.html, vite.config.ts, tailwind/postcss config
   ├─ electron-builder.json
   └─ src/
      ├─ main.tsx, App.tsx     # Giriş noktası + görünüm yönlendirme (auth/dashboard/editor)
      ├─ pages/                # AuthPage, DashboardPage, EditorPage
      ├─ store/useAuthStore.ts # Oturum (zustand + persist)
      └─ editor/               # ── Editör çekirdeği ──
         ├─ model/             # Document & Layer modeli, tipler, id üretici
         ├─ store/             # useEditorStore (belge, araçlar, görünüm, geçmiş)
         ├─ render/            # Compositor (Canvas2D blend), metin rasterize
         ├─ tools/             # Fırça, kalem, silgi, kova, damlalık, taşı, seçim,
         │                     #   şekil, gradyan, metin, kırpma, klon, kement
         ├─ filters/           # Ayarlamalar + filtreler (pixelOps, canvasOps, registry)
         ├─ panels/            # Toolbar, Layers, Color, Navigator, History,
         │                     #   Adjustments, ToolOptionsBar, FilterDialog, NewDocument
         ├─ ai/                # AIProvider, OpenRouter, çevrimdışı ops, AIPanel
         ├─ io/                # .gef serileştirme + dosya servisi (Electron/tarayıcı)
         ├─ components/        # CanvasViewport (zoom/pan/cetvel/etkileşim)
         ├─ ui/icons.tsx       # SVG araç/aksiyon ikonları
         └─ shortcuts.ts       # Klavye kısayolları
```

## Geliştirme

```bash
cd Mireditor
npm install
npm run dev            # Vite (tarayıcı) → http://localhost:5173
npm run electron       # Electron kabuğu (dev sunucu açıkken)
npm run dev-desktop    # Backend + Vite + Electron birlikte (concurrently)
npm run typecheck      # tsc --noEmit
npm run build          # Üretim derlemesi (dist/)
npm run build-exe      # Windows NSIS kurulumu (release/)
```

Backend opsiyoneldir; çalışmazsa uygulama **çevrimdışı modda** tam çalışır
(projeler diske `.gef` olarak kaydedilir, son projeler yerelde tutulur).

```bash
cd backend && cp .env.example .env && npm install && npm start   # http://localhost:3000/api/health
```

## Editör Özellikleri

- **Katmanlar:** görünürlük, opaklık, 16 blend modu, sürükle-bırak sıralama, çoğalt,
  aşağı birleştir, düzleştir, kilit, küçük resim.
- **Araçlar:** taşı, dikdörtgen/kement seçim, fırça (yumuşak/sert), kalem, silgi,
  kova (flood fill), damlalık, metin, şekil (dikdörtgen/elips/çizgi), gradyan,
  klon damgası, kırpma, yakınlaştır, el.
- **Ayarlamalar:** parlaklık/kontrast, ton/doygunluk, düzeyler, renk dengesi,
  posterleştir, eşik, tersine çevir, gri tonlama, sepya.
- **Filtreler:** Gauss bulanıklığı (GPU `ctx.filter`), keskinleştirme, pikselleştirme,
  gürültü, vinyet — canlı önizlemeli diyalog.
- **Geçmiş:** anlık görüntü tabanlı geri al/yinele (Ctrl+Z / Ctrl+Shift+Z), geçmiş paneli.
- **Görünüm:** imleç altında zoom (Ctrl/Alt+tekerlek), pan (Space/el), sığdır, %100,
  marching-ants seçim, şeffaflık satranç deseni.
- **Dosya:** Yeni (şablonlar), `.gef` aç/kaydet, görüntü içe aktar, PNG/JPG/WebP dışa aktar.

## `.gef` Dosya Formatı

`.gef` = JSON manifest + gömülü katman PNG'leri:

```json
{
  "format": "mireditor",
  "version": 1,
  "name": "Adsız-1",
  "width": 1920, "height": 1080, "dpi": 72, "colorMode": "RGB",
  "activeLayerId": "layer_...",
  "layers": [
    { "id": "...", "name": "Arkaplan", "type": "raster",
      "visible": true, "opacity": 1, "blendMode": "normal",
      "locked": true, "x": 0, "y": 0,
      "data": "data:image/png;base64,..." }
  ]
}
```

Serileştirme: `src/editor/io/gefFormat.ts`.

## AI Stüdyo (opsiyonel, bring-your-own-key)

Editör üst barındaki **AI Stüdyo** panelinden:

- **Metinden Görüntü** — OpenRouter (görüntü-çıkışlı model) ile prompt'tan yeni katman.
- **Generative Fill** — seçili bölge + prompt ile AI doldurma (OpenRouter).
- **Arkaplan Kaldır** — çevrimdışı sezgisel kenar-bazlı saydamlaştırma.
- **Büyüt & İyileştir** — çevrimdışı yüksek kaliteli 2×/3×/4× ölçekleme.

OpenRouter API anahtarı panel içindeki ⚙ ayarlarından girilir ve yalnızca yerelde
(`localStorage`) saklanır. Anahtar yoksa AI üretim özellikleri zarifçe devre dışı kalır;
çevrimdışı özellikler (arkaplan kaldır, büyüt) her zaman çalışır.

Sağlayıcı soyutlaması `src/editor/ai/types.ts` (`AIProvider`) ile genişletilebilir —
başka bir servis eklemek için yeni bir provider implementasyonu yazmanız yeterlidir.

## Kısayollar

`V` taşı · `M` seçim · `L` kement · `B` fırça · `N` kalem · `E` silgi · `G` kova ·
`I` damlalık · `T` metin · `C` kırpma · `U` şekil · `R` gradyan · `S` klon ·
`Z` zoom · `H` el · `X` renk değiştir · `[`/`]` fırça boyutu ·
`Ctrl+Z`/`Ctrl+Shift+Z` geri/yinele · `Ctrl+A` tümünü seç · `Ctrl+D` seçimi kaldır ·
`Del` seçimi sil · `Ctrl+S` kaydet · `Ctrl+Shift+S` farklı kaydet · `Ctrl+O` aç.
