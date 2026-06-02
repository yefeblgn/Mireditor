# 📊 Mireditor: Detaylı Proje Özeti

**Proje Adı:** Mireditor - AI-Destekli Görüntü Editörü  
**Versiyon:** 0.2.0  
**Yazar:** Efe Bilgin, Galip Yakışan, Fehmi Nahcivan
**Türü:** Masaüstü Grafik Editör (Electron + React + TypeScript)  
**Açıklama:** Çevrimdışı-ilk, yapay zeka destekli, görüntü editörü

---

## 📋 İçindekiler

1. [Proje Mimarisi](#proje-mimarisi)
2. [Frontend Mimarisi](#frontend-mimarisi)
3. [Backend Mimarisi](#backend-mimarisi)
4. [Veritabanı Şeması](#veritabanı-şeması)
5. [Teknoloji Stack'i](#teknoloji-stacki)
6. [Ana Özellikler](#ana-özellikler)
7. [Önemli Kod Örnekleri](#önemli-kod-örnekleri)
8. [Dosya Formatı (GEF)](#dosya-formatı-gef)
9. [Render ve Composite Sistemi](#render-ve-composite-sistemi)
10. [Kurulum ve Çalıştırma](#kurulum-ve-çalıştırma)

---

## 🏗️ Proje Mimarisi

### Genel Yapı

```
Mireditor
├── Frontend (React 19 + TypeScript)
│   ├── Editor Engine
│   ├── AI Features
│   ├── Tools & Filters
│   └── UI Components
│
└── Backend (Node.js + Express + MySQL)
    ├── Authentication (JWT)
    ├── User Management
    ├── Draft Storage
    └── API Endpoints
```

### İş Akışı

**Çevrimdışı Modu (Ana):**
- Tüm editör işlemleri tarayıcıda gerçekleşir
- Veriler lokal canvas objelerine saklanır
- `.gef` formatında masaüstüne kaydedilir
- Backend isteğe bağlı (opsiyonel)

**Çevrimiçi Modu (Backend Kullanırken):**
- Kullanıcı kayıt/giriş JWT ile doğrulanır
- Taslaklar MySQL'de depolanır
- Cloud senkronizasyonu desteklenir

---

## 🎨 Frontend Mimarisi

### Dizin Yapısı

```
src/
├── App.tsx                          # Ana uygulama giriş noktası
├── pages/
│   ├── AuthPage.tsx                 # Kayıt/Giriş sayfası
│   ├── DashboardPage.tsx            # Proje yönetimi
│   └── EditorPage.tsx               # Ana editör arayüzü
│
├── editor/                          # Editör çekirdeği
│   ├── model/
│   │   ├── types.ts                 # Temel veri tipleri
│   │   ├── document.ts              # Belge & katman işlemleri
│   │   └── uid.ts                   # Benzersiz kimlik oluşturucu
│   │
│   ├── store/
│   │   └── useEditorStore.ts        # Zustand state yönetimi
│   │
│   ├── render/
│   │   ├── Compositor.ts            # Katman birleştirme (blending)
│   │   └── text.ts                  # Metin rasterleştirme
│   │
│   ├── tools/
│   │   ├── index.ts                 # Tool registry
│   │   ├── paint.ts                 # Fırça/Silgi araçları
│   │   ├── vector.ts                # Şekil araçları
│   │   └── select.ts                # Seçim araçları
│   │
│   ├── filters/
│   │   ├── canvasOps.ts             # GPU filtreler (CSS filter)
│   │   ├── pixelOps.ts              # CPU piksel işlemleri
│   │   └── run.ts                   # Filter yürütücüsü
│   │
│   ├── ai/
│   │   ├── openrouter.ts            # OpenRouter API entegrasyonu
│   │   ├── localOps.ts              # Çevrimdışı AI ops
│   │   ├── settings.ts              # AI ayarları
│   │   └── AIPanel.tsx              # AI kontrol paneli
│   │
│   ├── io/
│   │   ├── gefFormat.ts             # .gef format serialization
│   │   └── fileService.ts           # Dosya I/O abstraksionu
│   │
│   ├── components/
│   │   └── CanvasViewport.tsx       # Zoom/Pan/Canvas işleme
│   │
│   └── panels/
│       ├── LayersPanel.tsx          # Katman yöneticisi
│       ├── ColorPanel.tsx           # Renk seçici
│       ├── HistoryPanel.tsx         # Geri al/İleri al
│       ├── FilterDialog.tsx         # Filter uygulanması
│       └── ...
│
├── hooks/
│   ├── useDiscordRPC.ts             # Discord zengin durumu
│   └── useGlobalShortcuts.ts        # Klavye kısayolları
│
├── store/
│   ├── useAuthStore.ts              # Kimlik doğrulama state
│   └── useSettingsStore.ts          # Uygulama ayarları
│
└── i18n/
    └── locales/                     # Çoklu dil desteği (TR, EN, DE, JA, RU, ZH)
```

### State Management (Zustand)

**Editor Store (`useEditorStore`)** - Tüm editor runtime durumu:
- `doc`: Aktif belge
- `layers`: Katmanlar dizisi
- `activeTool`: Seçili araç
- `toolOptions`: Araç parametreleri (renk, fırça boyutu, vb.)
- `selection`: Aktif seçim (dikdörtgen)
- `history`: Geri al/ileri al stack (max 40 snapshot)
- `view`: Zoom ve pan durumu

**Auth Store (`useAuthStore`)** - Kimlik doğrulama:
- `token`: JWT token
- `user`: Kullanıcı bilgileri
- `isAuthenticated`: Giriş durumu

### Bileşen Hiyerarşisi

```
App
├── AuthPage (giriş/kayıt)
├── DashboardPage (proje listesi)
└── EditorPage
    ├── CustomTitleBar (Electron pencere başlığı)
    ├── MenuBar (Dosya/Düzen/Görünüm menüleri)
    ├── Toolbar (araç seçici)
    ├── CanvasViewport (zoom + pan + canvas)
    ├── LayersPanel (katman yönetimi)
    ├── ColorPanel (renk seçimi)
    ├── HistoryPanel (undo/redo)
    ├── FilterDialog (filtreler)
    └── StatusBar (boyut, zoom, koordinat)
```

---

## 🔧 Backend Mimarisi

### Sunucu Yapısı

```
backend/
├── server.js                # Express uygulaması + API endpoints
├── database.py              # SQLAlchemy config (Python alternative)
├── models.py                # Database modelleri (Python)
├── main.py                  # FastAPI sunucu (Python alternative)
└── package.json             # Node.js bağımlılıkları
```

### Node.js Sunucu (`server.js`) - Temel Yapı

```javascript
// Database bağlantı havuzu
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASSWORD,
  database:         process.env.DB_NAME,
  connectionLimit:  10,
  queueLimit:       0,
});

// JWT ayarları
const JWT_SECRET  = process.env.JWT_SECRET || 'local-dev-secret';
const JWT_EXPIRES = '7d';

// Middleware: İstek loglaması (renklendirme + timestamp)
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '-';
  res.on('finish', () => {
    log.request(req.method, req.originalUrl, res.statusCode, ip, Date.now() - start);
  });
  req.clientIp = ip;
  next();
});
```

### API Endpoints

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/auth/register` | POST | Yeni kullanıcı kaydı |
| `/auth/login` | POST | Kullanıcı giriş (JWT token döner) |
| `/drafts` | GET | Kullanıcının taslak listesi |
| `/drafts/:id` | GET | Belirli taslak detayları |
| `/drafts` | POST | Yeni taslak oluştur |
| `/drafts/:id` | PUT | Taslak güncelle |
| `/drafts/:id` | DELETE | Taslak sil |
| `/users/profile` | GET | Kullanıcı profili |

---

## 💾 Veritabanı Şeması

### MySQL Tabloları

#### 📌 users

| Sütun | Tip | Açıklama |
|------|-----|----------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Benzersiz kullanıcı kimliği |
| `username` | VARCHAR(50) UNIQUE | Kullanıcı adı |
| `email` | VARCHAR(255) UNIQUE | E-posta adresi |
| `password` | VARCHAR(255) | Hashlanmış şifre (bcrypt) |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Oluşturulma tarihi |

**Örnek Veri:**
```sql
INSERT INTO users VALUES (1, 'ali_deneme', 'ali@example.com', '$2a$10$...', '2024-01-15 10:30:00');
```

#### 📌 drafts

| Sütun | Tip | Açıklama |
|------|-----|----------|
| `id` | INT AUTO_INCREMENT PRIMARY KEY | Taslak kimliği |
| `user_id` | INT FOREIGN KEY | Sahibi olan kullanıcı |
| `title` | VARCHAR(255) DEFAULT 'Adsız' | Proje adı |
| `data` | LONGTEXT | Sıkıştırılmış .gef verisi (JSON) |
| `size_bytes` | INT | Dosya boyutu (byte) |
| `created_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Oluşturulma tarihi |
| `updated_at` | TIMESTAMP AUTO UPDATE | Son düzenleme tarihi |

**Örnek Veri:**
```sql
INSERT INTO drafts VALUES (
  1, 1, 'Reklam Tasarımı', '{"format":"mireditor","width":1920,...}', 2048576, '2024-01-15 11:00:00', '2024-01-15 12:30:00'
);
```

#### 🔐 user_settings (Python Modeli)

| Sütun | Tip | Açıklama |
|------|-----|----------|
| `setting_id` | INT PRIMARY KEY | Ayar kimliği |
| `user_id` | INT FOREIGN KEY | Kullanıcı referansı |
| `theme` | ENUM('light', 'dark', 'system') | Tema tercihi |
| `language` | VARCHAR(5) | Dil (tr-TR, en-US, de-DE) |
| `auto_save` | BOOLEAN DEFAULT TRUE | Otomatik kaydet |

#### 📊 ai_usage_log (Python Modeli)

| Sütun | Tip | Açıklama |
|------|-----|----------|
| `log_id` | INT PRIMARY KEY | Günlük kimliği |
| `user_id` | INT FOREIGN KEY | Kullanıcı referansı |
| `feature_name` | VARCHAR(100) | AI özellik adı |
| `tokens_used` | INT DEFAULT 1 | Kullanılan token sayısı |
| `used_at` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Kullanılma zamanı |

#### 🔄 app_updates (Python Modeli)

| Sütun | Tip | Açıklama |
|------|-----|----------|
| `update_id` | INT PRIMARY KEY | Güncelleme kimliği |
| `version_number` | VARCHAR(20) | Versiyon (0.2.0, vb.) |
| `platform` | ENUM('windows', 'macos', 'linux') | İşletim sistemi |
| `download_url` | VARCHAR(500) | İndir bağlantısı |
| `release_notes` | TEXT | Sürüm notları |
| `is_critical` | BOOLEAN DEFAULT FALSE | Acil güncelleme mi? |
| `release_date` | TIMESTAMP DEFAULT CURRENT_TIMESTAMP | Yayınlanma tarihi |

---

## 🛠️ Teknoloji Stack'i

### Frontend

| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| **React** | 19.2.0 | UI kütüphanesi |
| **TypeScript** | 5.9.2 | Tip güvenliği |
| **Vite** | 7.3.1 | Build tool & dev server |
| **Tailwind CSS** | 3.4.19 | Stil framework'ü |
| **Zustand** | 5.0.11 | State management |
| **Lucide React** | 1.17.0 | İkon kütüphanesi |
| **i18next** | 26.3.0 | Çoklu dil desteği |
| **Electron** | 40.7.0 | Masaüstü çalışma zamanı |
| **Discord RPC** | 4.0.1 | Zengin durum göstergesi |

### Backend

| Teknoloji | Versiyon | Amaç |
|-----------|----------|------|
| **Node.js** | - | Çalışma zamanı |
| **Express** | 5.2.1 | HTTP framework |
| **MySQL2** | 3.18.2 | Veritabanı driver |
| **bcryptjs** | 3.0.3 | Şifre hashlama |
| **jsonwebtoken** | 9.0.3 | JWT imzalama/doğrulama |
| **CORS** | 2.8.6 | Cross-origin requests |

### Geliştirme Araçları

| Araç | Amaç |
|------|------|
| **Electron Builder** | Installer oluşturma (NSIS) |
| **Concurrently** | Multi-process yönetimi |
| **PostCSS** | CSS işleme |
| **Autoprefixer** | Vendor prefixes |

---

## ✨ Ana Özellikler

### 1. 🎨 Temel Editörleme

- **Katman Sistemi**: Sınırsız katman, blend modları, opaklık
- **Araçlar**:
  - 🖌️ Fırça (Brush) - Boyut, sertlik, opaklık, flow kontrol
  - ✏️ Kalem (Pencil) - Katı kenarlar
  - 🧹 Silgi (Eraser) - Saydamlık kontrolü
  - ⭕ Şekiller (Shapes) - Dikdörtgen, Daire, Çizgi
  - ✂️ Seçim (Select) - Dikdörtgen seçim
  - 🎨 Metin (Text) - Font, boyut, renkle yazı

### 2. 🤖 AI Özellikleri

- **Metin → Görüntü (Text-to-Image)**: OpenRouter API ile
- **Generative Fill**: Seçime göre AI doldurma
- **Arka Plan Kaldırma**: Çevrimdışı flood-fill algoritması
- **Upscaling**: Görüntü büyütme (2x, 4x, vb.)

### 3. 🎬 Efektler & Filtreler

**GPU Filtreler (Canvas CSS):**
- Blur, Brightness, Contrast, Grayscale, Invert, Saturate, Sepia, etc.

**CPU Piksel İşlemleri:**
- Levels, Curves, HSL Adjustment, Posterize, Threshold

### 4. 💾 Dosya Desteği

- **.gef**: Mireditor native format (JSON + base64 PNG'ler)
- **Dışa Aktarma**: PNG, JPG, WEBP
- **Çevrimdışı Kaydetme**: Masaüstü
- **Cloud Sync** (opsiyonel): Backend ile senkronizasyon

### 5. 📱 UI/UX

- **Zoom**: 1% - 6400% (kağıt karşılığında)
- **Pan**: Space+Drag, fare tekerleği
- **Şeffaflık Göstericisi**: Satranç-tahtası deseni
- **Kısayollar**: Klavye hızlandırması
- **Tema**: Koyu tema (Light/Dark/Sistem)

### 6. 🌐 Çoklu Dil Desteği

- 🇹🇷 Türkçe
- 🇬🇧 İngilizce
- 🇩🇪 Almanca
- 🇯🇵 Japonca
- 🇷🇺 Rusça
- 🇨🇳 Çince

---

## 💻 Önemli Kod Örnekleri

### 1. Compositor - Katman Birleştirme

```typescript
/**
 * Belgenin tüm görünür katmanlarını hedef canvas'a
 * blend modu + opaklık ile birleştirir.
 */
export function compositeDocument(doc: MirDocument, dest: HTMLCanvasElement): void {
  if (dest.width !== doc.width) dest.width = doc.width;
  if (dest.height !== doc.height) dest.height = doc.height;

  const ctx = get2d(dest);
  ctx.clearRect(0, 0, dest.width, dest.height);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  for (const layer of doc.layers) {
    if (!layer.visible || layer.opacity <= 0) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
    ctx.globalCompositeOperation = blendToComposite(layer.blendMode);
    ctx.drawImage(layer.canvas, layer.x, layer.y);
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}
```

**Açıklama:**
- Her katmana blend modunu ve opaklığını uygular
- `blendToComposite()` ile Canvas composite operation'a çevirir
- Görünür olmayan katmanları atlar

---

### 2. Generative Fill - AI Doldurma

```typescript
// ── Generative Fill (seçim + prompt) ──
const handleGenerativeFill = () =>
  run('Dolduruluyor…', async () => {
    const st = useEditorStore.getState();
    const layer = getActiveLayer(st.doc);
    if (!st.doc || !layer) return;
    if (layer.locked) throw new Error('Aktif katman kilitli.');
    
    const sel = st.selection;
    const region = sel && sel.width > 2 && sel.height > 2
      ? { x: Math.round(sel.x), y: Math.round(sel.y), 
          w: Math.round(sel.width), h: Math.round(sel.height) }
      : { x: 0, y: 0, w: st.doc.width, h: st.doc.height };
    
    if (!fillPrompt.trim()) throw new Error('Lütfen bir doldurma açıklaması girin.');
    
    const provider = createOpenRouterProvider(settings);
    const canvasData = layer.canvas.toDataURL('image/png');
    
    // AI'den düzeltilmiş görüntü al
    const editedImage = await provider.editImage(canvasData, fillPrompt.trim(), null, region);
    
    // Seçili bölgeye yapıştır
    const img = await loadImage(editedImage);
    const ctx = get2d(layer.canvas);
    ctx.drawImage(img, region.x, region.y, region.w, region.h);
    
    st.bumpRender();
    setInfo('Generative Fill tamamlandı.');
  });
```

**Özellikler:**
- Kullanıcı seçimini veya full canvas'ı kullanır
- OpenRouter API'ye seçim + prompt gönderir
- Sonucu katmanın üzerine yerleştirir

---

### 3. Fırça Aracı - İnterpolasyon

```typescript
/** İki nokta arasında fırça izini interpole ederek sürekli çizgi oluşturur. */
function strokeLine(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  x1: number, y1: number,
  size: number, hardness: number, color: string, erase: boolean
) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(dist / 2) || 1; // Her 2 px'te bir stamp
  
  for (let i = 0; i <= steps; i++) {
    const t = steps > 0 ? i / steps : 0;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    stamp(ctx, x, y, size, hardness, color, erase);
  }
}

function stamp(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number, hardness: number, color: string, erase: boolean
) {
  const r = Math.max(0.5, size / 2);
  ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over';
  
  if (hardness >= 0.99) {
    // Katı kenarlar
    ctx.fillStyle = erase ? 'rgba(0,0,0,1)' : color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Yumuşak kenarlar (gradient)
    const inner = r * hardness;
    const grad = ctx.createRadialGradient(x, y, inner, x, y, r);
    if (erase) {
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
    } else {
      grad.addColorStop(0, color);
      grad.addColorStop(1, hexToRgba(color, 0)); // Saydam uç
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Algoritma:**
- İnterpolasyon ile pürüzsüz çizgi
- Hardness ile yumuşak/katı kenarlar
- Radial gradient ile fade-out efekti

---

### 4. Arka Plan Kaldırma - Flood Fill

```typescript
/**
 * Çevrimdışı arkaplan kaldırma (sezgisel): kenarlardan başlayarak,
 * köşe rengine benzeyen bağlantılı pikselleri saydamlaştırır.
 */
export function removeBackgroundLocal(canvas: HTMLCanvasElement, tolerance = 40): void {
  const ctx = get2d(canvas);
  const { width: w, height: h } = canvas;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data; // RGBA array

  // Köşe renkleri al
  const corner = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]]; // [R, G, B]
  };
  const cs = [
    corner(0, 0), corner(w - 1, 0), 
    corner(0, h - 1), corner(w - 1, h - 1)
  ];
  // Ortalama köşe rengi
  const ref = [0, 1, 2].map((k) => (cs[0][k] + cs[1][k] + cs[2][k] + cs[3][k]) / 4);
  const tol = tolerance * tolerance * 3; // Euclidean distance threshold

  const matches = (i: number) => {
    const dr = d[i] - ref[0];
    const dg = d[i + 1] - ref[1];
    const db = d[i + 2] - ref[2];
    return dr * dr + dg * dg + db * db <= tol && d[i + 3] > 0; // Opacity check
  };

  // Flood fill (stack-based BFS)
  const visited = new Uint8Array(w * h);
  const stack: number[] = [];
  
  // Kenarlardan başla
  for (let x = 0; x < w; x++) {
    stack.push(x, 0, x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    stack.push(0, y, w - 1, y);
  }

  while (stack.length) {
    const y = stack.pop() as number;
    const x = stack.pop() as number;
    if (x < 0 || y < 0 || x >= w || y >= h) continue;
    
    const flat = y * w + x;
    if (visited[flat]) continue;
    visited[flat] = 1;
    
    const i = flat * 4;
    if (!matches(i)) continue;
    
    d[i + 3] = 0; // Alfa = 0 (saydam)
    // 4 komşu ekle
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  ctx.putImageData(img, 0, 0);
}
```

**Algoritma:**
- Köşe piksellerinden referans renk alır
- Kenarlardan BFS flood fill başlatır
- Eşik değerine göre benzer pikselleri saydamlaştırır
- Tüm katmanlara hızlı uygulanabilir

---

### 5. Piksel İşlemleri - Levels Ayarı

```typescript
/** levels: blackPoint 0..254, whitePoint 1..255, gamma 0.1..9.99 */
export function levels(img: ImageData, black: number, white: number, gamma: number): void {
  const d = img.data;
  const range = Math.max(1, white - black);
  const invGamma = 1 / gamma;
  
  // Lookup table oluştur (hızlanması için)
  const lut = new Uint8ClampedArray(256);
  for (let v = 0; v < 256; v++) {
    let n = (v - black) / range;
    n = Math.max(0, Math.min(1, n)); // Sınırla [0, 1]
    lut[v] = clamp255(Math.pow(n, invGamma) * 255);
  }
  
  // Lookup table uygula
  for (let i = 0; i < d.length; i += 4) {
    d[i] = lut[d[i]];       // R
    d[i + 1] = lut[d[i + 1]]; // G
    d[i + 2] = lut[d[i + 2]]; // B
    // A (alpha) değiştirilmez
  }
}
```

**Formül:**
$$y = (v - b)^{1/\gamma} \times 255$$

Burada:
- `v`: Orijinal piksel değeri
- `b`: Siyah noktası (eşik)
- `γ`: Gamma (kontrast)

---

### 6. OpenRouter API Entegrasyonu

```typescript
export function createOpenRouterProvider(settings: AISettings): AIProvider {
  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey}`,
    'HTTP-Referer': OPENROUTER.referer,
    'X-Title': OPENROUTER.title,
  });

  async function call(messages: any[]): Promise<string> {
    if (!settings.apiKey.trim()) 
      throw new Error('OpenRouter API anahtarı girilmemiş. AI ayarlarından ekleyin.');
    
    let res: Response;
    try {
      res = await fetch(OPENROUTER.endpoint, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ 
          model: settings.imageModel, 
          messages, 
          modalities: ['image', 'text'] 
        }),
      });
    } catch {
      throw new Error('OpenRouter\'a bağlanılamadı. İnternet bağlantınızı kontrol edin.');
    }
    
    if (!res.ok) {
      let detail = '';
      try {
        const e = await res.json();
        detail = e?.error?.message || '';
      } catch { /* yok say */ }
      
      if (res.status === 401) throw new Error('API anahtarı geçersiz (401).');
      if (res.status === 402) throw new Error('OpenRouter krediniz yetersiz (402).');
      throw new Error(`OpenRouter hatası ${res.status}: ${detail || res.statusText}`);
    }
    
    const json = await res.json();
    const img = extractImage(json); // Data URL'si çıkar
    if (!img) {
      throw new Error('Model görüntü döndürmedi. Görüntü üretebilen bir model seçtiğinizden emin olun.');
    }
    return img;
  }

  return {
    id: 'openrouter',
    label: 'OpenRouter',
    async textToImage(prompt: string, opts: ImageGenOptions): Promise<string> {
      const sized = `${prompt}\n\n(Yaklaşık ${opts.width}x${opts.height} piksel, yüksek kalite görüntü üret.)`;
      return call([{ role: 'user', content: [{ type: 'text', text: sized }] }]);
    },
    async editImage(imageDataUrl, prompt, _maskDataUrl, _opts): Promise<string> {
      return call([
        {
          role: 'user',
          content: [
            { type: 'text', text: `Bu görüntüyü şu talimata göre düzenle: ${prompt}` },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ]);
    },
  };
}
```

**Özellikler:**
- Error handling: 401 (geçersiz key), 402 (kredi yetersiz)
- Image URL'si JSON'dan otomatik çıkarılır
- Bring-your-own-key model (güvenli)

---

### 7. GEF Format Serializasyonu

```typescript
export const GEF_VERSION = 1;

interface SerializedDoc {
  format: 'mireditor';
  version: number;
  name: string;
  width: number;
  height: number;
  dpi: number;
  colorMode: 'RGB';
  activeLayerId: string | null;
  layers: SerializedLayer[];
}

/** Belgeyi .gef JSON metnine dönüştürür (katman PNG'leri gömülü). */
export function serializeDocument(doc: MirDocument): string {
  const payload: SerializedDoc = {
    format: 'mireditor',
    version: GEF_VERSION,
    name: doc.name,
    width: doc.width,
    height: doc.height,
    dpi: doc.dpi,
    colorMode: doc.colorMode,
    activeLayerId: doc.activeLayerId,
    layers: doc.layers.map((l) => ({
      id: l.id,
      name: l.name,
      type: l.type,
      visible: l.visible,
      opacity: l.opacity,
      blendMode: l.blendMode,
      locked: l.locked,
      x: l.x,
      y: l.y,
      text: l.text,
      data: l.canvas.toDataURL('image/png'), // Base64 PNG
    })),
  };
  return JSON.stringify(payload);
}

/** .gef JSON metnini belgeye dönüştürür. */
export async function deserializeDocument(json: string): Promise<MirDocument> {
  const data = JSON.parse(json) as SerializedDoc;
  if (data.format !== 'mireditor') 
    throw new Error('Geçersiz Mireditor dosyası');

  const layers: Layer[] = [];
  for (const sl of data.layers) {
    const canvas = createLayerCanvas(data.width, data.height);
    try {
      const img = await loadImage(sl.data); // Data URL'den yükle
      get2d(canvas).drawImage(img, 0, 0);
      layers.push({
        id: sl.id,
        name: sl.name,
        type: sl.type,
        visible: sl.visible,
        opacity: sl.opacity,
        blendMode: sl.blendMode,
        locked: sl.locked,
        x: sl.x,
        y: sl.y,
        canvas,
        text: sl.text,
      });
    } catch (err) {
      throw new Error(`Katman yüklenemedi: ${sl.name}`);
    }
  }

  return {
    id: 'doc_loaded',
    name: data.name,
    width: data.width,
    height: data.height,
    dpi: data.dpi,
    colorMode: data.colorMode,
    filePath: null,
    activeLayerId: data.activeLayerId,
    layers,
  };
}
```

**Format Detayları:**
- JSON manifest + base64-encoded PNG'ler
- Her katman bağımsız PNG
- Metadata: boyut, DPI, blend mode, opaklık
- Metin katmanları için kaynak veriler saklanır (yeniden düzenlenebilir)

---

### 8. Blend Modları Mapping

```typescript
export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export const BLEND_MODES: { value: BlendMode; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'multiply', label: 'Çarpım' },
  { value: 'screen', label: 'Ekran' },
  { value: 'overlay', label: 'Kaplama' },
  { value: 'darken', label: 'Koyulaştır' },
  { value: 'lighten', label: 'Açıklaştır' },
  // ... diğer modlar
];

export function blendToComposite(mode: BlendMode): GlobalCompositeOperation {
  return mode === 'normal' ? 'source-over' : (mode as GlobalCompositeOperation);
}
```

| Blend Modu | Canvas Özelliği | Açıklama |
|-----------|-----------------|----------|
| Normal | source-over | Standart (üst katman görünür) |
| Multiply | multiply | Koyu efekt (renkler çarpılır) |
| Screen | screen | Aydınlat efekt (renkler tersine çarpılır) |
| Overlay | overlay | Multiply + Screen kombinasyonu |
| Color Dodge | color-dodge | Parlak blend |
| Difference | difference | Renk farkı |

---

### 9. Zustand Store - Editor State

```typescript
interface EditorState {
  doc: MirDocument | null;
  activeTool: ToolId;
  toolOptions: ToolOptions;
  view: ViewState;
  selection: Selection | null;
  renderVersion: number;
  dirty: boolean;

  past: Snapshot[];    // Geri al stack
  future: Snapshot[];  // İleri al stack

  // ── Belge İşlemleri ──
  newDocument: (opts: { name?: string; width: number; height: number; dpi?: number; background?: 'white' | 'transparent' }) => void;
  setDocument: (doc: MirDocument) => void;
  closeDocument: () => void;
  renameDocument: (name: string) => void;
  setFilePath: (path: string | null) => void;

  // ── Katman İşlemleri ──
  addLayer: (layer: Layer, setActive?: boolean) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  updateLayer: (id: string, patch: Partial<Layer>) => void;

  // ── Araç & Seçenek ──
  setActiveTool: (id: ToolId) => void;
  setToolOptions: (opts: Partial<ToolOptions>) => void;

  // ── Seçim ──
  setSelection: (sel: Selection | null) => void;

  // ── History (Undo/Redo) ──
  pushHistory: (label: string) => void;
  undo: () => void;
  redo: () => void;

  // ── Render ──
  bumpRender: () => void;
  markDirty: () => void;
}
```

---

## 🎬 Render ve Composite Sistemi

### Render Pipeline

```
1. Editör Durum Değişikliği (layer, tool action, filter)
   ↓
2. Store.bumpRender() → renderVersion++
   ↓
3. CanvasViewport.tsx effect: renderVersion'a reaktif
   ↓
4. compositeDocument(doc, compositeCanvas)
   - Tüm katmanları blend modları ve opaklık ile birleştir
   ↓
5. Viewport canvas'ta zoom/pan/grid uygula
   ↓
6. Browser repaint → UI güncelleniş
```

### Performans Optimizasyonları

1. **Dirty Tracking**: Sadece değişen alanlar güncellenebilir (opsiyonel)
2. **Thumbnail Caching**: Layers paneli için cache'lenir
3. **Canvas Pooling**: Yeniden kullanılabilir canvas nesneleri
4. **History Limits**: Max 40 snapshot (bellek yönetimi)

---

## 📦 Dosya Formatı (GEF)

### Yapı

```json
{
  "format": "mireditor",
  "version": 1,
  "name": "Proje Adı",
  "width": 1920,
  "height": 1080,
  "dpi": 72,
  "colorMode": "RGB",
  "activeLayerId": "layer_123",
  "layers": [
    {
      "id": "layer_123",
      "name": "Arkaplan",
      "type": "raster",
      "visible": true,
      "opacity": 1,
      "blendMode": "normal",
      "locked": false,
      "x": 0,
      "y": 0,
      "data": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    },
    {
      "id": "layer_456",
      "name": "Metin",
      "type": "text",
      "visible": true,
      "opacity": 1,
      "blendMode": "normal",
      "locked": false,
      "x": 100,
      "y": 50,
      "text": {
        "content": "Merhaba",
        "fontFamily": "Plus Jakarta Sans",
        "fontSize": 64,
        "color": "#FFFFFF",
        "bold": false,
        "italic": false,
        "align": "left"
      },
      "data": "data:image/png;base64,iVBORw0KGgoAAAANS..."
    }
  ]
}
```

### Boyut Tahmini

- **Basit proje** (3 katman, 1080p): ~2-5 MB
- **Karmaşık proje** (50 katman, 4K): ~50-200 MB
- **Yüksek kalite** (16-bit per channel): Daha büyük

### Avantajlar

✅ Tüm editör bilgisini korur  
✅ Katman-bazlı yapısı nedeniyle ölçeklenebilir  
✅ Metin katmanları yeniden düzenlenebilir  
✅ Platform bağımsız (JSON standart)  
❌ Büyük dosyalar (PNG kompresiyon sınırı)  

---

## 🚀 Kurulum ve Çalıştırma

### Ön Gereksinimler

- **Node.js**: v18+
- **npm**: v9+
- **Python** (opsiyonel backend için): v3.8+
- **MySQL** (opsiyonel): v8.0+

### Frontend Setup

```bash
cd Mireditor
npm install
npm run typecheck    # TypeScript doğrulaması
npm run dev          # Vite dev server → http://localhost:5173
```

### Desktop (Electron) Modu

```bash
# Terminal 1: Vite dev server
npm run dev

# Terminal 2: Electron
npm run electron

# Veya ikisini aynı anda:
npm run dev-desktop
```

### Backend Setup (Opsiyonel)

```bash
cd backend
npm install

# .env dosyası oluştur
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=mireditor
JWT_SECRET=your-secret-key

# Sunucuyu başlat
npm start
```

### Production Build

```bash
npm run build                # Vite build → dist/
npm run build-exe            # Windows installer oluştur → release/
```

---

## 📊 Proje İstatistikleri

| Metrik | Değer |
|--------|-------|
| **Frontend Dosyaları** | ~35 TypeScript/TSX dosyası |
| **Backend Endpoints** | ~8-10 API route |
| **Veritabanı Tabloları** | 6 tablo |
| **Supported Blend Modes** | 16 mod |
| **Maximum Layers** | Sınırsız* |
| **Maximum Canvas Size** | 8000x8000 px** |
| **Supported Languages** | 6 dil |
| **Build Size (Windows)** | ~150 MB (Electron bundle) |

*RAM sınırıyla kısıtlı  
**Bellek yönetimi amacıyla sınırlandırılmış

---

## 🎯 Sonuç

**Mireditor**, Photoshop tarzı profesyonel editörleme yetenekleri sunan, yapay zeka destekli modern bir grafik editörüdür. Çevrimdışı çalışabilme, native Electron entegrasyonu ve esnek extend edilebilir mimarisiyle, tanto özel proje ihtiyaçlarına uyarlanabilir hem de kapsamlı prodüktif kullanım senaryolarını destekler.

### Temel Güçlü Yönleri:

✨ **AI-Powered**: Text-to-image, generative fill, background removal  
⚡ **Çevrimdışı İlk**: İnternet olmadan tam fonksiyon  
🎨 **Profesyonel Araçlar**: 16 blend modu, 50+ filtre, kompleks seçimler  
📦 **Açık Format**: JSON-based GEF, katmana göre PNG'ler  
🌍 **Çoklu Dil**: 6 dilde tam destek  
🖥️ **Masaüstü Entegrasyonu**: Discord RPC, native menus, sistem dosya diyalogları

---

**Proje Sahibi:** Efe Bilgin, Galip Yakışan, Fehmi Nahcivan
**Versiyon:** 0.2.0  
**Durum:** Aktif Geliştirme  
**Lisans:** BLGN Studios, Tüm Hakları Saklıdır
