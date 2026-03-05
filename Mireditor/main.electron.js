const { app, BrowserWindow, ipcMain, dialog, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Windows GPU heap corruption fix (Electron 40 + Windows)
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('no-sandbox');

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

// ─── Auto Updater (electron-updater — delta indirme) ───
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.logger = null; // Splash üzerinden kendi loglarımızı gösteriyoruz

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

    // 15 saniye timeout — güncelleme kontrolü takılırsa devam et
    const timeout = setTimeout(() => {
      finish(false);
    }, 15000);

    autoUpdater.on('update-available', (info) => {
      splashStatus(`Güncelleme bulundu: v${info.version}`);
      splashProgress(72);
      autoUpdater.downloadUpdate();
    });

    autoUpdater.on('update-not-available', () => {
      splashStatus('Güncel sürüm');
      clearTimeout(timeout);
      finish(false);
    });

    autoUpdater.on('download-progress', (progress) => {
      const pct = Math.round(progress.percent);
      splashStatus(`Güncelleme indiriliyor... %${pct}`);
      // İndirme aşaması: %72 – %88 arası
      splashProgress(72 + Math.round(pct * 0.16));
    });

    autoUpdater.on('update-downloaded', () => {
      clearTimeout(timeout);
      splashStatus('Güncelleme uygulanıyor...');
      splashProgress(90);
      // Kısa bir bekleme sonra yükle ve yeniden başlat
      setTimeout(() => {
        autoUpdater.quitAndInstall(true, true);
      }, 1500);
      // resolve etmiyoruz — uygulama kapanacak
    });

    autoUpdater.on('error', (err) => {
      console.error('Auto-updater error:', err?.message || err);
      splashStatus('Güncelleme kontrol edilemedi');
      clearTimeout(timeout);
      finish(false);
    });

    splashStatus('Güncelleme kontrol ediliyor...');
    autoUpdater.checkForUpdates().catch(() => {
      clearTimeout(timeout);
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
