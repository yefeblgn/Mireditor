import React from 'react';

// Electron IPC erişimi
const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

export function CustomTitleBar() {
  const handleMinimize = () => ipcRenderer?.send('window-minimize');
  const handleMaximize = () => ipcRenderer?.send('window-maximize');
  const handleClose = () => ipcRenderer?.send('window-close');

  return (
    <div
      className="h-8 bg-[#0a0a0a] flex items-center justify-between pl-3 pr-0 select-none border-b border-[#1a1a1a]"
      style={{ WebkitAppRegion: 'drag' } as any}
    >
      {/* Sol: Logo + Başlık */}
      <div className="flex items-center gap-2">
        <img
          src="./assets/icon-nobg.png"
          alt="Mireditor"
          className="w-4 h-4"
          draggable={false}
        />
        <span className="text-[10px] text-[#666] font-bold tracking-[3px] uppercase">
          Mireditor
        </span>
      </div>

      {/* Sağ: Pencere Kontrolleri */}
      <div
        className="flex items-center h-full"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-[#666] hover:bg-[#222] hover:text-white transition-colors"
          title="Küçült"
        >
          <svg width="10" height="1" viewBox="0 0 10 1">
            <rect fill="currentColor" width="10" height="1" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-[#666] hover:bg-[#222] hover:text-white transition-colors"
          title="Büyüt"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              x="0.5"
              y="0.5"
              width="9"
              height="9"
            />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-[#666] hover:bg-red-600 hover:text-white transition-colors"
          title="Kapat"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line
              x1="0"
              y1="0"
              x2="10"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
            />
            <line
              x1="10"
              y1="0"
              x2="0"
              y2="10"
              stroke="currentColor"
              strokeWidth="1.2"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
