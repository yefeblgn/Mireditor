import type { ToolId } from '../model/types';
import type { Tool } from './types';
import { brushTool, pencilTool, eraserTool, eyedropperTool, bucketTool } from './paint';
import { moveTool, marqueeTool, handTool, zoomTool } from './select';
import { textTool, cropTool, shapeTool, gradientTool, cloneTool, lassoTool } from './vector';

const REGISTRY: Record<ToolId, Tool> = {
  move: moveTool,
  marquee: marqueeTool,
  lasso: lassoTool,
  brush: brushTool,
  pencil: pencilTool,
  eraser: eraserTool,
  bucket: bucketTool,
  eyedropper: eyedropperTool,
  text: textTool,
  crop: cropTool,
  shape: shapeTool,
  gradient: gradientTool,
  clone: cloneTool,
  zoom: zoomTool,
  hand: handTool,
};

export function getTool(id: ToolId): Tool {
  return REGISTRY[id] ?? brushTool;
}

export type { Tool } from './types';
