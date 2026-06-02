const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { DiscordRPCManager } = require('./discord-rpc-manager');

// ─── Discord Rich Presence ───
let discordRPC = null;

// Windows GPU heap corruption fix (Electron 40 + Windows)
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

// ─── Windows Firewall Rule (runtime fallback) ───
function ensureFirewallRule() {
  if (process.platform !== 'win32' || !app.isPackaged) return;
  try {
    const exePath = app.getPath('exe');
    // Silently add firewall rules if not already present
    execSync(`netsh advfirewall firewall add rule name="Mireditor" dir=in action=allow program="${exePath}" enable=yes profile=any`, { stdio: 'ignore' });
    execSync(`netsh advfirewall firewall add rule name="Mireditor Outbound" dir=out action=allow program="${exePath}" enable=yes profile=any`, { stdio: 'ignore' });
  } catch {
    // May fail without admin — installer already handles this
  }
}

// ─── Config ───
const VITE_URL = 'http://localhost:5173';
const API_URL = app.isPackaged ? 'https://manici.yefeblgn.net/mireditor/api' : 'http://localhost:8000';
const RETRY_DELAYS = [4, 8, 12, 16, 20, 24, 28, 32, 36]; // saniye
const APP_VERSION = '0.0.1';

let mainWindow;
let splashWindow;
let isShuttingDown = false;

// ─── Splash'a durum mesajı gönder ───
function splashStatus(text, type = 'info') {
  // type: 'info' | 'warn' | 'error' | 'success' | 'retry'
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-status', { text, type });
  }
}

function splashProgress(percent) {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-progress', { percent });
  }
}

function splashReady() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('splash-ready');
  }
}

// ─── HTTP health check (Electron net modülü) ───
function checkUrl(url, timeout = 3000) {
  return new Promise((resolve) => {
    try {
      const request = net.request({ url, method: 'GET' });
      let done = false;

      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          request.abort();
          resolve(false);
        }
      }, timeout);

      request.on('response', (response) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(response.statusCode >= 200 && response.statusCode < 500);
        }
      });

      request.on('error', () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(false);
        }
      });

      request.end();
    } catch {
      resolve(false);
    }
  });
}

// ─── Retry ile servis kontrolü ───
async function waitForService(name, url, progressStart, progressEnd) {
  let attempt = 0;

  while (true) {
    splashStatus(`${name} kontrol ediliyor...`);
    const ok = await checkUrl(url);

    if (ok) {
      splashProgress(progressEnd);
      return true;
    }

    // Bağlantı başarısız — retry
    attempt++;
    const retryDelay = RETRY_DELAYS[Math.min(attempt - 1, RETRY_DELAYS.length - 1)];

    // Sadece geri sayımı güncelle
    for (let sec = retryDelay; sec > 0; sec--) {
      splashStatus(`${name} bekleniyor... ${sec}sn`);
      await sleep(1000);
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Auth durumunu kontrol et (localStorage okuma) ───
function checkAuthState() {
  try {
    splashStatus('Oturum bilgileri kontrol ediliyor...', 'info');
    return true;
  } catch {
    return false;
  }
}

// ─── Auto Updater (electron-updater — tam otomatik) ───
autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = null; // Splash üzerinden kendi loglarımızı gösteriyoruz

// Splash'a detaylı update log gönder
function updateLog(message, type = 'info') {
  splashStatus(message, type);
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.webContents.send('update-log', { message, type, time: new Date().toLocaleTimeString('tr-TR') });
  }
}

function checkAndApplyUpdates() {
  return new Promise((resolve) => {
    // Dev modda güncelleme çalışmaz
    if (!app.isPackaged) {
      resolve(false);
      return;
    }

    let settled = false;
    const finish = (val) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };

    // 15 saniye timeout — sadece ilk kontrol aşaması için
    // İndirme başlarsa timeout iptal edilir, indirme için ayrı 5 dk timeout verilir
    let checkTimeout = setTimeout(() => {
      updateLog('Güncelleme kontrol zaman aşımı, devam ediliyor...', 'warn');
      finish(false);
    }, 15000);

    let downloadTimeout = null;

    autoUpdater.on('checking-for-update', () => {
      updateLog('Güncelleme sunucusu kontrol ediliyor...', 'info');
    });

    autoUpdater.on('update-available', (info) => {
      // Kontrol timeout'unu iptal et — indirme başlayacak
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      updateLog(`Yeni surum bulundu: v${info.version}`, 'success');
      if (info.releaseNotes) {
        const notes = typeof info.releaseNotes === 'string'
          ? info.releaseNotes
          : info.releaseNotes.map(n => n.note || n).join(', ');
        updateLog(`Degisiklikler: ${notes.substring(0, 200)}`, 'info');
      }
      updateLog('Otomatik indirme baslatiliyor...', 'info');
      splashProgress(72);
      // İndirme için 5 dakika timeout
      downloadTimeout = setTimeout(() => {
        updateLog('Indirme zaman asimi, devam ediliyor...', 'warn');
        finish(false);
      }, 5 * 60 * 1000);
    });

    autoUpdater.on('update-not-available', (info) => {
      updateLog(`Guncel surum: v${info.version}`, 'success');
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      finish(false);
    });

    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent);
      const speed = (progress.bytesPerSecond / 1024 / 1024).toFixed(1);
      const transferred = (progress.transferred / 1024 / 1024).toFixed(1);
      const total = (progress.total / 1024 / 1024).toFixed(1);
      splashStatus(`Guncelleme indiriliyor... %${pct}`, 'info');
      updateLog(`Indiriliyor: ${transferred}MB / ${total}MB (${speed} MB/s) - %${pct}`, 'info');
      // İndirme aşaması: %72 – %90 arası
      splashProgress(72 + Math.round(pct * 0.18));
    });

    autoUpdater.on('update-downloaded', (info) => {
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      if (downloadTimeout) { clearTimeout(downloadTimeout); downloadTimeout = null; }
      updateLog(`v${info.version} indirildi, yukleniyor...`, 'success');
      splashStatus('Guncelleme uygulaniyor, yeniden baslatilacak...', 'success');
      splashProgress(95);
      // 2 saniye bekle (kullanıcı logu görsün) sonra yükle ve yeniden başlat
      setTimeout(() => {
        try {
          autoUpdater.quitAndInstall(false, true);
        } catch (e) {
          console.error('quitAndInstall failed, trying force:', e);
          autoUpdater.quitAndInstall(true, true);
        }
      }, 2500);
      // resolve etmiyoruz — uygulama kapanacak
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err);
      // Kullanıcıya temiz mesaj göster, stack trace basma
      const rawMsg = err?.message || 'Bilinmeyen hata';
      let cleanMsg = 'Guncelleme kontrol edilemedi';
      if (rawMsg.includes('net::ERR') || rawMsg.includes('ENOTFOUND') || rawMsg.includes('ECONNREFUSED')) {
        cleanMsg = 'Guncelleme sunucusuna ulasilamiyor';
      } else if (rawMsg.includes('404') || rawMsg.includes('Not Found') || rawMsg.includes('HttpError')) {
        cleanMsg = 'Henuz yayinlanmis guncelleme yok';
      } else if (rawMsg.includes('ETIMEDOUT') || rawMsg.includes('timeout')) {
        cleanMsg = 'Guncelleme kontrolu zaman asimina ugradi';
      } else if (rawMsg.includes('ERR_CONNECTION') || rawMsg.includes('socket')) {
        cleanMsg = 'Baglanti hatasi, guncelleme atlaniyor';
      }
      updateLog(cleanMsg, 'warn');
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      if (downloadTimeout) { clearTimeout(downloadTimeout); downloadTimeout = null; }
      finish(false);
    });

    updateLog('Guncelleme kontrol ediliyor...', 'info');
    splashStatus('Guncelleme kontrol ediliyor...');
    autoUpdater.checkForUpdates().catch((err) => {
      console.error('Auto-updater check failed:', err);
      const rawMsg = err?.message || String(err);
      let cleanMsg = 'Guncelleme kontrol edilemedi';
      if (rawMsg.includes('404') || rawMsg.includes('Not Found')) {
        cleanMsg = 'Henuz yayinlanmis guncelleme yok';
      } else if (rawMsg.includes('net::ERR') || rawMsg.includes('ENOTFOUND')) {
        cleanMsg = 'Guncelleme sunucusuna ulasilamiyor';
      }
      updateLog(cleanMsg, 'warn');
      if (checkTimeout) { clearTimeout(checkTimeout); checkTimeout = null; }
      finish(false);
    });
  });
}

// ─── Splash Window ───
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: false,
    backgroundColor: '#0f0f0f',
    resizable: false,
    movable: true,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload-splash.js'),
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.setMenu(null);
}

// ─── Main Window ───
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    show: false,
    backgroundColor: '#0f0f0f',
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // IPC: Pencere kontrolleri
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (!mainWindow) return;
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  });
  ipcMain.on('window-close', () => gracefulShutdown());

  // Alt+F4 veya taskbar'dan kapatma
  mainWindow.on('close', (e) => {
    if (!isShuttingDown) {
      e.preventDefault();
      gracefulShutdown();
    }
  });

  // IPC: Save file dialog
  ipcMain.handle('save-file-dialog', async (_event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: options?.title || 'Kaydet',
      defaultPath: options?.defaultPath || 'untitled',
      filters: options?.filters || [{ name: 'All Files', extensions: ['*'] }],
    });
    return result.canceled ? null : result.filePath;
  });

  // IPC: Save file (text)
  ipcMain.handle('save-file', async (_event, { filePath, data }) => {
    fs.writeFileSync(filePath, data, 'utf-8');
    return true;
  });

  // IPC: Save file (binary/base64)
  ipcMain.handle('save-file-binary', async (_event, { filePath, base64 }) => {
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    return true;
  });

  // IPC: Read file (text)
  ipcMain.handle('read-file', async (_event, { filePath }) => {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error('read-file error:', err);
      return null;
    }
  });

  // IPC: List local drafts from user's drafts folder
  ipcMain.handle('list-local-drafts', async () => {
    try {
      const draftsDir = path.join(app.getPath('userData'), 'drafts');
      if (!fs.existsSync(draftsDir)) {
        fs.mkdirSync(draftsDir, { recursive: true });
        return [];
      }
      const files = fs.readdirSync(draftsDir).filter(f => f.endsWith('.gef'));
      const drafts = files.map(f => {
        const fp = path.join(draftsDir, f);
        const stat = fs.statSync(fp);
        let title = f.replace('.gef', '');
        try {
          const raw = fs.readFileSync(fp, 'utf-8');
          const parsed = JSON.parse(raw);
          if (parsed.title) title = parsed.title;
        } catch {}
        return {
          fileName: f,
          filePath: fp,
          title,
          lastModified: stat.mtime.toISOString(),
          sizeKB: Math.round(stat.size / 1024),
        };
      });
      // Sort by last modified descending
      drafts.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
      return drafts;
    } catch (err) {
      console.error('list-local-drafts error:', err);
      return [];
    }
  });

  // IPC: Save draft to local drafts folder
  ipcMain.handle('save-local-draft', async (_event, { fileName, data }) => {
    try {
      const draftsDir = path.join(app.getPath('userData'), 'drafts');
      if (!fs.existsSync(draftsDir)) fs.mkdirSync(draftsDir, { recursive: true });
      const fp = path.join(draftsDir, fileName.endsWith('.gef') ? fileName : `${fileName}.gef`);
      fs.writeFileSync(fp, data, 'utf-8');
      return fp;
    } catch (err) {
      console.error('save-local-draft error:', err);
      return null;
    }
  });

  // IPC: Delete local draft
  ipcMain.handle('delete-local-draft', async (_event, { filePath }) => {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return true;
    } catch (err) {
      console.error('delete-local-draft error:', err);
      return false;
    }
  });

  // IPC: Get drafts directory path
  ipcMain.handle('get-drafts-dir', async () => {
    return path.join(app.getPath('userData'), 'drafts');
  });

  // IPC: Discord RPC state update
  ipcMain.on('discord-rpc-update', (_event, state) => {
    if (discordRPC) {
      discordRPC.setState(state);
    }
  });

  // IPC: Dosya Seçme Dialog (.gef uzantısı)
  ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Proje Aç - Mireditor',
      filters: [
        { name: 'Mireditor Proje Dosyası', extensions: ['gef'] },
        { name: 'Tüm Dosyalar', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
}

// ─── Graceful Shutdown ───
function gracefulShutdown() {
  if (isShuttingDown || !mainWindow || mainWindow.isDestroyed()) return;
  isShuttingDown = true;

  // Renderer'a kapanış overlay'ini göster
  try {
    mainWindow.webContents.send('app-shutdown');
  } catch (e) {
    // webContents erişilemezse direkt kapat
  }

  // Discord RPC'yi kapat
  if (discordRPC) {
    discordRPC.destroy().catch(() => {});
    discordRPC = null;
  }

  // 2 saniye sonra force close
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.quit();
  }, 2000);
}

// ─── Boot Sequence ───
async function bootSequence() {
  // AŞAMA 0: Windows Firewall kuralını ekle
  ensureFirewallRule();

  // AŞAMA 0.5: Discord RPC başlat
  discordRPC = new DiscordRPCManager();
  discordRPC.connect();
  discordRPC.setState({ view: 'loading' });

  // AŞAMA 1: Başlatılıyor
  splashProgress(0);
  splashStatus('Başlatılıyor...');
  await sleep(600);

  // AŞAMA 2: Bağlantılar
  splashProgress(10);
  if (!app.isPackaged) {
    await waitForService('Arayüz', VITE_URL, 10, 35);
  } else {
    splashProgress(35);
  }

  splashProgress(35);
  await waitForService('Sunucu', `${API_URL}/health`, 35, 60);

  // AŞAMA 3: Oturum kontrolü
  splashProgress(60);
  splashStatus('Oturum kontrol ediliyor...');
  checkAuthState();
  await sleep(400);
  splashProgress(70);

  // AŞAMA 4: Delta güncelleme (electron-updater)
  // Güncelleme varsa indirir ve otomatik yeniden başlatır.
  // Güncelleme yoksa veya hata olursa devam eder.
  splashProgress(70);
  await checkAndApplyUpdates();
  splashProgress(90);

  // AŞAMA 5: Arayüz yükleme
  splashStatus('Arayüz yükleniyor...');

  // Main window'a URL'yi yükle
  if (!app.isPackaged) {
    mainWindow.loadURL(VITE_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  // Main window'un yüklenmesini bekle
  await new Promise((resolve) => {
    mainWindow.webContents.once('did-finish-load', () => {
      resolve();
    });
    mainWindow.webContents.on('did-fail-load', async (_e, code, desc) => {
      console.error('Main window load failed:', code, desc);
      splashStatus('Arayüz yeniden yükleniyor...');
      await sleep(2000);
      if (!app.isPackaged) {
        mainWindow.loadURL(VITE_URL);
      }
    });
  });

  splashProgress(95);
  splashStatus('Hazırlanıyor...');
  await sleep(600);

  splashStatus('Açılıyor...');
  splashProgress(100);
  splashReady();
  await sleep(600);

  // Splash'ı kapat, main'i göster
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ─── App Ready ───
app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();

  // Splash DOM hazır olduktan sonra boot sequence'ı başlat
  splashWindow.webContents.once('did-finish-load', () => {
    bootSequence().catch((err) => {
      console.error('Boot sequence error:', err);
      splashStatus(`Kritik hata: ${err.message}`, 'error');
    });
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
