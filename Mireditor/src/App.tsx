import React, { useState, useEffect } from 'react';
import { CustomTitleBar } from './components/CustomTitleBar';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { useAuthStore } from './store/useAuthStore';
import { ProjectConfig } from './store/useEditorStore';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

type AppView = 'auth' | 'loading' | 'dashboard' | 'editor';

// ─── Shutdown Overlay ───
function ShutdownOverlay() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-shutdown-in">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
      <div className="relative flex flex-col items-center gap-4 animate-shutdown-content">
        <img
          src="./assets/icon-nobg.png"
          alt="M"
          className="w-12 h-12 opacity-40"
          draggable={false}
        />
        <div className="flex items-center gap-3">
          <svg className="animate-spin w-3.5 h-3.5 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
            <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="text-[#888] text-[10px] uppercase tracking-[3px] font-medium">
            Veriler kaydediliyor...
          </span>
        </div>
        <p className="text-[#333] text-[8px] uppercase tracking-[2px] mt-1">
          Uygulama güvenle kapatılıyor
        </p>
      </div>
    </div>
  );
}

function LoadingScreen({ text = 'Yükleniyor...' }: { text?: string }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0f0f0f]">
      <img
        src="./assets/icon-nobg.png"
        alt="M"
        className="w-12 h-12 opacity-60 mb-6"
        draggable={false}
      />
      <div className="flex items-center gap-3">
        <svg className="animate-spin w-4 h-4 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-[#555] text-[10px] uppercase tracking-[3px] font-medium">
          {text}
        </span>
      </div>
    </div>
  );
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const [view, setView] = useState<AppView>(
    isAuthenticated ? 'loading' : 'auth'
  );
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [projectConfig, setProjectConfig] = useState<ProjectConfig | null>(null);

  // Shutdown IPC dinle
  useEffect(() => {
    if (ipcRenderer) {
      const handler = () => setIsShuttingDown(true);
      ipcRenderer.on('app-shutdown', handler);
      return () => ipcRenderer.removeListener('app-shutdown', handler);
    }
  }, []);

  // Auth durumu değiştiğinde view'ı güncelle
  useEffect(() => {
    if (!isAuthenticated) {
      setView('auth');
    }
  }, [isAuthenticated]);

  // isAuthenticated ise ve view loading ise, dashboard'a geç
  useEffect(() => {
    if (isAuthenticated && view === 'loading') {
      // Minimum preloading süresi — data fetch sırasında görünsün
      const timer = setTimeout(() => {
        setView('dashboard');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, view]);

  const handleLoginSuccess = () => {
    // Login sonrası önce preloading göster
    setView('loading');
  };

  const handleOpenEditor = (config?: ProjectConfig) => {
    if (config) setProjectConfig(config);
    else setProjectConfig({ title: 'Untitled-1', width: 1920, height: 1080, backgroundColor: '#ffffff' });
    setView('loading');
    setTimeout(() => setView('editor'), 600);
  };

  const handleBackToDashboard = () => {
    setView('loading');
    setTimeout(() => setView('dashboard'), 400);
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#0f0f0f]">
      {isShuttingDown && <ShutdownOverlay />}
      <CustomTitleBar />
      <div className="flex-1 overflow-hidden">
        {view === 'auth' && <AuthPage onSuccess={handleLoginSuccess} />}
        {view === 'loading' && <LoadingScreen text="Veriler yükleniyor..." />}
        {view === 'dashboard' && (
          <DashboardPage onOpenEditor={handleOpenEditor} />
        )}
        {view === 'editor' && (
          <EditorPage onBack={handleBackToDashboard} projectConfig={projectConfig || undefined} />
        )}
      </div>
    </div>
  );
}

export default App;
