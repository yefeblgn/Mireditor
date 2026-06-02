import type { MirDocument } from '../model/types';
import { flattenDocument, makeThumbnail } from '../render/Compositor';
import { deserializeDocument, serializeDocument } from './gefFormat';

// ─── Electron tespiti ───
function getIpc(): any | null {
  try {
    const req = (window as any).require;
    if (req) return req('electron').ipcRenderer;
  } catch {
    /* tarayıcı ortamı */
  }
  return null;
}

export function isElectron(): boolean {
  return getIpc() !== null;
}

export interface RecentProject {
  path: string;
  name: string;
  thumbnail: string;
  modified: number;
  sizeKb: number;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Proje Kaydet ───
export async function saveProject(doc: MirDocument, saveAs = false): Promise<string | null> {
  const json = serializeDocument(doc);
  const ipc = getIpc();
  if (ipc) {
    const thumbnail = makeThumbnail(flattenDocument(doc, '#1a1a1a'), 160, 100);
    const path: string | null = await ipc.invoke('project:save', {
      json,
      suggestedName: doc.name,
      currentPath: saveAs ? null : doc.filePath,
      thumbnail,
      width: doc.width,
      height: doc.height,
    });
    return path;
  }
  // Tarayıcı: indir
  download(new Blob([json], { type: 'application/json' }), `${doc.name || 'mireditor'}.gef`);
  return null;
}

// ─── Proje Aç ───
export async function openProject(): Promise<MirDocument | null> {
  const ipc = getIpc();
  if (ipc) {
    const res: { json: string; path: string } | null = await ipc.invoke('project:open');
    if (!res) return null;
    const doc = await deserializeDocument(res.json);
    doc.filePath = res.path;
    return doc;
  }
  // Tarayıcı: dosya seçici
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.gef,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const text = await file.text();
      try {
        resolve(await deserializeDocument(text));
      } catch {
        resolve(null);
      }
    };
    input.click();
  });
}

/** Belirli bir yoldan proje açar (Dashboard'daki son projeler için). */
export async function openProjectByPath(path: string): Promise<MirDocument | null> {
  const ipc = getIpc();
  if (!ipc) return null;
  const res: { json: string; path: string } | null = await ipc.invoke('project:openPath', path);
  if (!res) return null;
  const doc = await deserializeDocument(res.json);
  doc.filePath = res.path;
  return doc;
}

// ─── Görüntü Dışa Aktar ───
export type ExportFormat = 'png' | 'jpeg' | 'webp';

export async function exportImage(doc: MirDocument, format: ExportFormat, quality = 0.92): Promise<void> {
  const bg = format === 'jpeg' ? '#ffffff' : undefined;
  const flat = flattenDocument(doc, bg);
  const mime = `image/${format}`;
  const dataUrl = flat.toDataURL(mime, quality);
  const ipc = getIpc();
  if (ipc) {
    await ipc.invoke('export:image', { dataUrl, format, suggestedName: doc.name });
    return;
  }
  await new Promise<void>((resolve) => {
    flat.toBlob((blob) => {
      if (blob) download(blob, `${doc.name || 'mireditor'}.${format === 'jpeg' ? 'jpg' : format}`);
      resolve();
    }, mime, quality);
  });
}

// ─── Son Projeler ───
const RECENTS_KEY = 'mireditor-recents';

export async function listRecents(): Promise<RecentProject[]> {
  const ipc = getIpc();
  if (ipc) {
    try {
      return (await ipc.invoke('recents:list')) ?? [];
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || '[]');
  } catch {
    return [];
  }
}

export async function addRecent(entry: RecentProject): Promise<void> {
  const ipc = getIpc();
  if (ipc) {
    try {
      await ipc.invoke('recents:add', entry);
    } catch {
      /* yok say */
    }
    return;
  }
  const list = await listRecents();
  const next = [entry, ...list.filter((r) => r.path !== entry.path)].slice(0, 20);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
}
