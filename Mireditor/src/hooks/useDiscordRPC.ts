import { useEffect, useRef } from 'react';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

/**
 * Discord RPC state'ini renderer'dan main process'e gönderir.
 * Electron dışında (web) çalışırken sessizce hiçbir şey yapmaz.
 */
export function useDiscordRPC(state: {
  view: string;
  projectTitle?: string;
  activeTool?: string;
  canvasSize?: string;
  isIdle?: boolean;
  fileName?: string;
}) {
  const lastSent = useRef<string>('');

  useEffect(() => {
    if (!ipcRenderer) return;

    // Aynı state tekrar gönderilmesin (performans)
    const key = JSON.stringify(state);
    if (key === lastSent.current) return;
    lastSent.current = key;

    ipcRenderer.send('discord-rpc-update', state);
  }, [state]);
}
