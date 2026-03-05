const { app, BrowserWindow, ipcMain, dialog, net, shell } = require('electron');
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
