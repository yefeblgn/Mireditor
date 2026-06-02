// ─── Discord Rich Presence Manager ───
// Mireditor için Discord RPC entegrasyonu.
// Discord yoksa, bağlantı sağlanamazsa veya hata olursa sessizce devre dışı kalır.

const DiscordRPC = require('discord-rpc');

const CLIENT_ID = '1479144852259344566';
const RECONNECT_INTERVAL = 15000; // 15 saniye

// Tool ID -> Türkçe label mapping
const TOOL_LABELS = {
  move: 'Taşı', marquee: 'Seçim', ellipseMarquee: 'Elips Seçim',
  lasso: 'Kement', polyLasso: 'Çokgen Kement', magicWand: 'Sihirli Değnek',
  crop: 'Kırp', eyedropper: 'Damlalık', cloneStamp: 'Klonla',
  brush: 'Fırça', pencil: 'Kalem', eraser: 'Silgi',
  fill: 'Dolgu', gradient: 'Gradyan', blur: 'Bulanıklaştır',
  sharpen: 'Keskinleştir', smudge: 'Leke', dodge: 'Soldur',
  burn: 'Yakma', sponge: 'Sünger', pen: 'Kalem Aracı',
  text: 'Metin', line: 'Çizgi', rectangle: 'Dikdörtgen',
  ellipse: 'Elips', polygon: 'Çokgen', hand: 'El', zoom: 'Yakınlaştır',
};

// Tool ID -> Discord asset key + tooltip mapping
// Discord Developer Portal'daki "Rich Presence → Art Assets"e yüklenen ikonlar
const TOOL_ICONS = {
  // Seçim araçları
  move:           { key: 'tool_select',  text: 'Taşı Aracı' },
  marquee:        { key: 'tool_select',  text: 'Dikdörtgen Seçim' },
  ellipseMarquee: { key: 'tool_select',  text: 'Elips Seçim' },
  lasso:          { key: 'tool_select',  text: 'Kement Aracı' },
  polyLasso:      { key: 'tool_select',  text: 'Çokgen Kement' },
  magicWand:      { key: 'tool_select',  text: 'Sihirli Değnek' },

  // Çizim araçları
  brush:          { key: 'tool_draw',    text: 'Fırça Aracı' },
  pencil:         { key: 'tool_draw',    text: 'Kalem Aracı' },
  eraser:         { key: 'tool_draw',    text: 'Silgi Aracı' },
  pen:            { key: 'tool_draw',    text: 'Kalem (Pen) Aracı' },

  // Şekil araçları
  line:           { key: 'tool_shape',   text: 'Çizgi Aracı' },
  rectangle:      { key: 'tool_shape',   text: 'Dikdörtgen Aracı' },
  ellipse:        { key: 'tool_shape',   text: 'Elips Aracı' },
  polygon:        { key: 'tool_shape',   text: 'Çokgen Aracı' },

  // Düzenleme araçları
  crop:           { key: 'tool_edit',    text: 'Kırpma Aracı' },
  eyedropper:     { key: 'tool_edit',    text: 'Damlalık Aracı' },
  fill:           { key: 'tool_edit',    text: 'Dolgu Aracı' },
  gradient:       { key: 'tool_edit',    text: 'Gradyan Aracı' },
  text:           { key: 'tool_edit',    text: 'Metin Aracı' },

  // Rötuş araçları
  cloneStamp:     { key: 'tool_retouch', text: 'Klonlama Aracı' },
  blur:           { key: 'tool_retouch', text: 'Bulanıklaştır' },
  sharpen:        { key: 'tool_retouch', text: 'Keskinleştir' },
  smudge:         { key: 'tool_retouch', text: 'Leke Aracı' },
  dodge:          { key: 'tool_retouch', text: 'Soldurma Aracı' },
  burn:           { key: 'tool_retouch', text: 'Yakma Aracı' },
  sponge:         { key: 'tool_retouch', text: 'Sünger Aracı' },

  // Navigasyon araçları
  hand:           { key: 'tool_nav',     text: 'El Aracı' },
  zoom:           { key: 'tool_nav',     text: 'Yakınlaştır' },
};

// View -> Discord asset key mapping
const VIEW_ICONS = {
  auth:      { key: 'view_auth',      text: 'Kimlik Doğrulama' },
  loading:   { key: 'view_loading',   text: 'Yükleniyor' },
  dashboard: { key: 'view_dashboard', text: 'Dashboard' },
  editor:    { key: 'view_editor',    text: 'Editör' },
};

class DiscordRPCManager {
  constructor() {
    this.client = null;
    this.connected = false;
    this.destroyed = false;
    this.reconnectTimer = null;
    this.startTimestamp = new Date();

    // Current state
    this.state = {
      view: 'loading',       // 'auth' | 'loading' | 'dashboard' | 'editor'
      projectTitle: null,     // Proje adı (editor modunda)
      activeTool: null,       // Aktif araç (editor modunda)
      canvasSize: null,       // '1920×1080' gibi
      isIdle: false,          // Boşta mı
      fileName: null,         // Açık dosya adı
    };
  }

  // ── Bağlantıyı başlat ──
  async connect() {
    if (this.destroyed) return;
    if (this.connected) return;

    try {
      this.client = new DiscordRPC.Client({ transport: 'ipc' });

      this.client.on('ready', () => {
        console.log('[Discord RPC] Bağlantı kuruldu:', this.client.user?.username);
        this.connected = true;
        this.startTimestamp = new Date();
        this.updatePresence();
      });

      this.client.on('disconnected', () => {
        console.log('[Discord RPC] Bağlantı kesildi');
        this.connected = false;
        this.scheduleReconnect();
      });

      await this.client.login({ clientId: CLIENT_ID });
    } catch (err) {
      // Discord kapalı veya bağlantı sağlanamıyor — sessizce yoksay
      console.log('[Discord RPC] Bağlanamadı (Discord kapalı olabilir):', err.message || err);
      this.connected = false;
      this.scheduleReconnect();
    }
  }

  // ── Yeniden bağlanma zamanlayıcısı ──
  scheduleReconnect() {
    if (this.destroyed) return;
    if (this.reconnectTimer) return; // Zaten zamanlanmış
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, RECONNECT_INTERVAL);
  }

  // ── State güncelle ve presence'ı yenile ──
  setState(updates) {
    Object.assign(this.state, updates);
    this.updatePresence();
  }

  // ── Discord presence'ı güncelle ──
  updatePresence() {
    if (!this.connected || !this.client) return;

    try {
      const activity = this.buildActivity();
      this.client.setActivity(activity).catch((err) => {
        console.log('[Discord RPC] Activity güncelleme hatası:', err.message);
      });
    } catch (err) {
      console.log('[Discord RPC] Presence oluşturma hatası:', err.message);
    }
  }

  // ── Activity objesi oluştur ──
  buildActivity() {
    const { view, projectTitle, activeTool, canvasSize, isIdle, fileName } = this.state;

    const activity = {
      startTimestamp: this.startTimestamp,
      instance: false,
      largeImageKey: 'mireditor_logo',
      largeImageText: 'Mireditor - Graphics Engine',
    };

    // View'a göre varsayılan small icon
    const viewIcon = VIEW_ICONS[view] || VIEW_ICONS.loading;

    switch (view) {
      case 'auth':
        activity.details = 'Giriş Ekranında';
        activity.state = 'Oturum açılıyor...';
        activity.smallImageKey = viewIcon.key;
        activity.smallImageText = viewIcon.text;
        break;

      case 'loading':
        activity.details = 'Yükleniyor...';
        activity.state = 'Uygulama başlatılıyor';
        activity.smallImageKey = viewIcon.key;
        activity.smallImageText = viewIcon.text;
        break;

      case 'dashboard':
        activity.details = 'Dashboard';
        activity.state = isIdle ? 'Boşta' : 'Proje seçiyor...';
        activity.smallImageKey = viewIcon.key;
        activity.smallImageText = viewIcon.text;
        break;

      case 'editor': {
        // Details: Proje adı
        const title = projectTitle || 'Adsız Proje';
        activity.details = fileName
          ? `${fileName}`
          : `${title}`;

        // State: Aktif araç bilgisi
        if (isIdle) {
          activity.state = 'Boşta';
          activity.smallImageKey = viewIcon.key;
          activity.smallImageText = 'Editör — Boşta';
        } else if (activeTool) {
          const toolName = TOOL_LABELS[activeTool] || activeTool;
          activity.state = `${toolName} aracini kullaniyor`;
          if (canvasSize) {
            activity.state += ` | ${canvasSize}`;
          }
          // Tool'a özel small icon
          const toolIcon = TOOL_ICONS[activeTool];
          if (toolIcon) {
            activity.smallImageKey = toolIcon.key;
            activity.smallImageText = toolIcon.text;
          } else {
            activity.smallImageKey = viewIcon.key;
            activity.smallImageText = `Araç: ${toolName}`;
          }
        } else {
          activity.state = 'Düzenliyor...';
          activity.smallImageKey = viewIcon.key;
          activity.smallImageText = 'Editör';
        }
        break;
      }

      default:
        activity.details = 'Mireditor';
        activity.state = 'Açık';
        activity.smallImageKey = 'mireditor_logo';
        activity.smallImageText = 'Mireditor';
        break;
    }

    return activity;
  }

  // ── Bağlantıyı kapat ──
  async destroy() {
    this.destroyed = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      try {
        await this.client.clearActivity();
        await this.client.destroy();
      } catch (err) {
        // Sessizce yoksay — kapanırken hata önemli değil
      }
      this.client = null;
      this.connected = false;
    }
  }
}

module.exports = { DiscordRPCManager };
