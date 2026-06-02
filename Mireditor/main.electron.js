const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// Windows GPU heap corruption fix (Electron 40 + Windows)
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

// ─── Config ───
const VITE_URL = 'http://localhost:5173';
const API_URL = app.isPackaged ? 'https://manici.yefeblgn.net/mireditor/api' : 'http://localhost:3000/api';
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
// maxAttempts: null ise sonsuz bekler (zorunlu servis, ör. Vite arayüzü).
// Sayı ise o kadar denedikten sonra false döner (opsiyonel servis — çevrimdışı mod).
async function waitForService(name, url, progressStart, progressEnd, maxAttempts = null) {
  let attempt = 0;

  while (true) {
    splashStatus(`${name} kontrol ediliyor...`);
    const ok = await checkUrl(url);

    if (ok) {
      splashProgress(progressEnd);
      return true;
    }

    attempt++;

    // Opsiyonel servis: deneme limiti aşıldıysa çevrimdışı devam et
    if (maxAttempts !== null && attempt >= maxAttempts) {
      splashStatus(`${name} bulunamadı — çevrimdışı mod`, 'warn');
      splashProgress(progressEnd);
      await sleep(500);
      return false;
    }

    // Bağlantı başarısız — retry
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

// ─── Versiyon kontrolü (Backend API) ───
function checkForUpdate() {
  return new Promise((resolve) => {
    try {
      const url = `${API_URL}/check-update?current_version=${APP_VERSION}&platform=windows`;
      const request = net.request({ url, method: 'GET' });
      let body = '';
      let done = false;

      const timer = setTimeout(() => {
        if (!done) {
          done = true;
          request.abort();
          resolve(null); // Timeout — güncelleme kontrolü atlanır
        }
      }, 5000);

      request.on('response', (response) => {
        response.on('data', (chunk) => {
          body += chunk.toString();
        });
        response.on('end', () => {
          if (!done) {
            done = true;
            clearTimeout(timer);
            try {
              resolve(JSON.parse(body));
            } catch {
              resolve(null);
            }
          }
        });
      });

      request.on('error', () => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          resolve(null);
        }
      });

      request.end();
    } catch {
      resolve(null);
    }
  });
}

let pendingUpdate = null; // Non-critical güncelleme sonra gösterilecek

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

  registerFileHandlers();
}

// ─── Son Projeler (local store) ───
function recentsPath() {
  return path.join(app.getPath('userData'), 'recents.json');
}
function readRecents() {
  try {
    return JSON.parse(fs.readFileSync(recentsPath(), 'utf8'));
  } catch {
    return [];
  }
}
function writeRecents(list) {
  try {
    fs.writeFileSync(recentsPath(), JSON.stringify(list.slice(0, 20)));
  } catch (e) {
    console.error('recents yazılamadı:', e);
  }
}
function addRecentEntry(entry) {
  const list = readRecents().filter((r) => r.path !== entry.path);
  list.unshift(entry);
  writeRecents(list);
}

let fileHandlersRegistered = false;

// ─── Dosya İşlemleri IPC ───
function registerFileHandlers() {
  if (fileHandlersRegistered) return;
  fileHandlersRegistered = true;

  // Proje kaydet
  ipcMain.handle('project:save', async (_e, payload) => {
    let target = payload.currentPath;
    if (!target) {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Projeyi Kaydet',
        defaultPath: `${payload.suggestedName || 'Adsiz'}.gef`,
        filters: [{ name: 'Mireditor Projesi', extensions: ['gef'] }],
      });
      if (result.canceled || !result.filePath) return null;
      target = result.filePath;
    }
    try {
      fs.writeFileSync(target, payload.json, 'utf8');
      const stat = fs.statSync(target);
      addRecentEntry({
        path: target,
        name: payload.suggestedName || 'Adsiz',
        thumbnail: payload.thumbnail || '',
        modified: Date.now(),
        sizeKb: Math.round(stat.size / 1024),
      });
      return target;
    } catch (err) {
      console.error('project:save hatası:', err);
      return null;
    }
  });

  // Proje aç (dialog)
  ipcMain.handle('project:open', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Proje Aç',
      filters: [{ name: 'Mireditor Projesi', extensions: ['gef'] }],
      properties: ['openFile'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    const p = result.filePaths[0];
    try {
      const json = fs.readFileSync(p, 'utf8');
      addRecentEntry({ path: p, name: path.basename(p, '.gef'), thumbnail: '', modified: Date.now(), sizeKb: Math.round(fs.statSync(p).size / 1024) });
      return { json, path: p };
    } catch (err) {
      console.error('project:open hatası:', err);
      return null;
    }
  });

  // Belirli yoldan aç
  ipcMain.handle('project:openPath', async (_e, p) => {
    try {
      const json = fs.readFileSync(p, 'utf8');
      return { json, path: p };
    } catch (err) {
      console.error('project:openPath hatası:', err);
      return null;
    }
  });

  // Görüntü dışa aktar
  ipcMain.handle('export:image', async (_e, payload) => {
    const ext = payload.format === 'jpeg' ? 'jpg' : payload.format;
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Görüntüyü Dışa Aktar',
      defaultPath: `${payload.suggestedName || 'mireditor'}.${ext}`,
      filters: [{ name: payload.format.toUpperCase(), extensions: [ext] }],
    });
    if (result.canceled || !result.filePath) return false;
    try {
      const base64 = payload.dataUrl.replace(/^data:image\/\w+;base64,/, '');
      fs.writeFileSync(result.filePath, Buffer.from(base64, 'base64'));
      return true;
    } catch (err) {
      console.error('export:image hatası:', err);
      return false;
    }
  });

  // Son projeler
  ipcMain.handle('recents:list', () => readRecents());
  ipcMain.handle('recents:add', (_e, entry) => {
    addRecentEntry(entry);
    return true;
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
  // Sunucu opsiyonel — local-first. Birkaç deneme sonra çevrimdışı moda geç.
  await waitForService('Sunucu', `${API_URL}/health`, 35, 60, 2);

  // AŞAMA 3: Oturum kontrolü
  splashProgress(60);
  splashStatus('Oturum kontrol ediliyor...');
  checkAuthState();
  await sleep(400);
  splashProgress(70);

  // AŞAMA 4: Versiyon kontrolü
  splashProgress(70);
  splashStatus('Güncelleme kontrol ediliyor...');

  const updateInfo = await checkForUpdate();

  if (updateInfo && updateInfo.update_available) {
    if (updateInfo.is_critical) {
      splashStatus(`Kritik güncelleme: v${updateInfo.latest_version}`);
      splashProgress(75);
      await sleep(1000);

      const response = await dialog.showMessageBox(splashWindow, {
        type: 'warning',
        title: 'Kritik Güncelleme Gerekli',
        message: `Mireditor v${updateInfo.latest_version} kritik bir güncelleme içeriyor.\n\nGüncel sürümü indirmeden devam edemezsiniz.`,
        detail: updateInfo.release_notes || '',
        buttons: ['Güncellemeyi İndir', 'Uygulamayı Kapat'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (response.response === 0) {
        // İndirme URL'sini tarayıcıda aç
        const downloadUrl = updateInfo.download_url || `https://github.com/yefeblgn/Mireditor/releases/latest`;
        shell.openExternal(downloadUrl);
      }
      // Her iki durumda da uygulamayı kapat
      app.quit();
      return;
    } else {
      pendingUpdate = updateInfo;
    }
  }
  splashProgress(80);

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
      // Vite yükleme hatası — tekrar dene
      splashStatus('Arayüz yeniden yükleniyor...');
      await sleep(2000);
      if (!app.isPackaged) {
        mainWindow.loadURL(VITE_URL);
      }
    });
  });

  splashProgress(90);
  splashStatus('Hazırlanıyor...');
  await sleep(600);
  splashProgress(95);

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

  // ─── Non-critical güncelleme bildirimi (splash kapandıktan sonra) ───
  if (pendingUpdate) {
    await sleep(2000); // Kullanıcı arayüzü görsün önce
    const response = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Güncelleme Mevcut',
      message: `Mireditor v${pendingUpdate.latest_version} yayınlandı!`,
      detail: `Mevcut sürüm: v${APP_VERSION}\n\n${pendingUpdate.release_notes || 'Yeni özellikler ve hata düzeltmeleri.'}`,
      buttons: ['Şimdi İndir', 'Sonra Hatırlat'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (response.response === 0) {
      const downloadUrl = pendingUpdate.download_url || `https://github.com/yefeblgn/Mireditor/releases/latest`;
      shell.openExternal(downloadUrl);
    }
    pendingUpdate = null;
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
