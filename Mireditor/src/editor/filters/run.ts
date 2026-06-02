import { get2d, getActiveLayer } from '../model/document';
import { useEditorStore } from '../store/useEditorStore';
import type { FilterDef, Region } from './index';

export interface ActiveTarget {
  canvas: HTMLCanvasElement;
  region: Region;
}

/** Aktif katman + (varsa seçim ile sınırlı) bölgeyi döndürür. */
export function getActiveRegion(): ActiveTarget | null {
  const st = useEditorStore.getState();
  const layer = getActiveLayer(st.doc);
  if (!layer || layer.locked) return null;
  const canvas = layer.canvas;
  const sel = st.selection;
  let region: Region;
  if (sel && sel.width > 1 && sel.height > 1) {
    const x = Math.max(0, Math.floor(sel.x - layer.x));
    const y = Math.max(0, Math.floor(sel.y - layer.y));
    const w = Math.min(canvas.width - x, Math.ceil(sel.width));
    const h = Math.min(canvas.height - y, Math.ceil(sel.height));
    if (w <= 0 || h <= 0) return null;
    region = { x, y, w, h };
  } else {
    region = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  }
  return { canvas, region };
}

/** Parametresiz filtreyi doğrudan uygular (geçmişe kaydederek). */
export function applyFilterDirect(def: FilterDef, values: Record<string, number> = {}): void {
  const target = getActiveRegion();
  if (!target) return;
  const st = useEditorStore.getState();
  st.pushHistory(def.label);
  def.apply(target.canvas, target.region, values);
  st.bumpRender();
}

/** Önizleme için aktif katmanın bölge yedeğini alır. */
export function backupRegion(target: ActiveTarget): ImageData {
  return get2d(target.canvas).getImageData(0, 0, target.canvas.width, target.canvas.height);
}

export function restoreRegion(target: ActiveTarget, backup: ImageData): void {
  get2d(target.canvas).putImageData(backup, 0, 0);
}
