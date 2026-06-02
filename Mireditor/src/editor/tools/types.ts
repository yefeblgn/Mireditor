import type { ToolId } from '../model/types';

export interface PointerInfo {
  /** Belge koordinatında konum. */
  x: number;
  y: number;
  /** Bir önceki noktadan belge koordinatında fark. */
  dx: number;
  dy: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  button: number;
  pressure: number;
}

export interface ToolEnv {
  /** Belge çözünürlüğünde güncel kompozit (eyedropper vb. örnekleme için). */
  composite: HTMLCanvasElement;
}

export interface Tool {
  id: ToolId;
  /** CSS cursor değeri. */
  cursor: string;
  onDown?(p: PointerInfo, env: ToolEnv): void;
  onMove?(p: PointerInfo, env: ToolEnv): void;
  onUp?(p: PointerInfo, env: ToolEnv): void;
}
