import React from 'react';
import {
  MousePointer2, Square, Circle, Lasso, Wand2, Crop, Pipette,
  Stamp, Paintbrush, Pencil, Eraser, PaintBucket, Blend, Droplets,
  Sparkles, Sun, Flame, PenTool, Type, Minus as LineIcon, RectangleHorizontal,
  CircleDot, Pentagon, Hand, ZoomIn, ArrowUpDown,
} from 'lucide-react';
import { useEditorStore, ToolType } from '../../store/useEditorStore';

interface ToolDef {
  id: ToolType;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const TOOLS: ToolDef[] = [
  { id: 'move', label: 'Taşı', shortcut: 'V', icon: <MousePointer2 size={16} /> },
  { id: 'marquee', label: 'Dikdörtgen Seçim', shortcut: 'M', icon: <Square size={16} strokeDasharray="3 3" /> },
  { id: 'lasso', label: 'Kement', shortcut: 'L', icon: <Lasso size={16} /> },
  { id: 'magicWand', label: 'Sihirli Değnek', shortcut: 'W', icon: <Wand2 size={16} /> },
  { id: 'crop', label: 'Kırp', shortcut: 'C', icon: <Crop size={16} /> },
  { id: 'eyedropper', label: 'Damlalık', shortcut: 'I', icon: <Pipette size={16} /> },
  { id: 'cloneStamp', label: 'Klonla', shortcut: 'S', icon: <Stamp size={16} /> },
  { id: 'brush', label: 'Fırça', shortcut: 'B', icon: <Paintbrush size={16} /> },
  { id: 'pencil', label: 'Kalem', shortcut: 'N', icon: <Pencil size={16} /> },
  { id: 'eraser', label: 'Silgi', shortcut: 'E', icon: <Eraser size={16} /> },
  { id: 'fill', label: 'Boya Kovası', shortcut: 'G', icon: <PaintBucket size={16} /> },
  { id: 'gradient', label: 'Gradyan', shortcut: 'G', icon: <Blend size={16} /> },
  { id: 'blur', label: 'Bulanıklaştır', shortcut: 'R', icon: <Droplets size={16} /> },
  { id: 'sharpen', label: 'Keskinleştir', shortcut: 'R', icon: <Sparkles size={16} /> },
  { id: 'dodge', label: 'Soldur', shortcut: 'O', icon: <Sun size={16} /> },
  { id: 'burn', label: 'Yakma', shortcut: 'O', icon: <Flame size={16} /> },
  { id: 'pen', label: 'Kalem Aracı', shortcut: 'P', icon: <PenTool size={16} /> },
  { id: 'text', label: 'Metin', shortcut: 'T', icon: <Type size={16} /> },
  { id: 'line', label: 'Çizgi', shortcut: 'U', icon: <LineIcon size={16} /> },
  { id: 'rectangle', label: 'Dikdörtgen', shortcut: 'U', icon: <RectangleHorizontal size={16} /> },
  { id: 'ellipse', label: 'Elips', shortcut: 'U', icon: <CircleDot size={16} /> },
  { id: 'polygon', label: 'Çokgen', shortcut: 'U', icon: <Pentagon size={16} /> },
  { id: 'hand', label: 'El', shortcut: 'H', icon: <Hand size={16} /> },
  { id: 'zoom', label: 'Yakınlaştır', shortcut: 'Z', icon: <ZoomIn size={16} /> },
];

export function EditorToolbar() {
  const {
    activeTool,
    setActiveTool,
    foregroundColor,
    backgroundColor,
    setForegroundColor,
    setBackgroundColor,
    swapColors,
    resetColors,
    brushSize,
    setBrushSize,
  } = useEditorStore();

  return (
    <div className="w-11 bg-[#1a1a1a] border-r border-[#2a2a2a] flex flex-col items-center py-1.5 select-none overflow-y-auto overflow-x-hidden editor-toolbar flex-shrink-0"
      style={{ cursor: 'default' }}
    >
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={`w-8 h-8 flex items-center justify-center rounded transition-all duration-100 flex-shrink-0
            ${activeTool === tool.id
              ? 'bg-[#3b82f6] text-white shadow-sm shadow-blue-500/30'
              : 'text-[#888] hover:bg-[#252525] hover:text-[#ccc]'
            }`}
          title={`${tool.label} (${tool.shortcut})`}
          style={{ cursor: 'default' }}
        >
          {tool.icon}
        </button>
      ))}

      {/* Separator */}
      <div className="w-6 h-px bg-[#333] my-2 flex-shrink-0" />

      {/* Color swatches */}
      <div className="relative w-8 h-8 flex-shrink-0 mb-1">
        {/* Background color */}
        <input
          type="color"
          value={backgroundColor}
          onChange={(e) => setBackgroundColor(e.target.value)}
          className="absolute bottom-0 right-0 w-5 h-5 border border-[#444] rounded-sm cursor-pointer bg-transparent p-0"
          title="Arka Plan Rengi"
          style={{ cursor: 'pointer' }}
        />
        {/* Foreground color */}
        <input
          type="color"
          value={foregroundColor}
          onChange={(e) => setForegroundColor(e.target.value)}
          className="absolute top-0 left-0 w-5 h-5 border border-[#444] rounded-sm cursor-pointer bg-transparent p-0 z-10"
          title="Ön Plan Rengi"
          style={{ cursor: 'pointer' }}
        />
      </div>

      {/* Swap / Reset */}
      <div className="flex gap-0.5 flex-shrink-0">
        <button
          onClick={swapColors}
          className="text-[#666] hover:text-white text-[8px] transition-colors"
          title="Renkleri Değiştir (X)"
          style={{ cursor: 'default' }}
        >
          <ArrowUpDown size={10} />
        </button>
        <button
          onClick={resetColors}
          className="text-[#666] hover:text-white transition-colors"
          title="Varsayılan Renkler (D)"
          style={{ cursor: 'default' }}
        >
          <div className="w-2.5 h-2.5 border border-[#666] relative">
            <div className="absolute inset-0.5 bg-white" />
            <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-black" />
          </div>
        </button>
      </div>

      {/* Brush size (for drawing tools) */}
      {['brush', 'pencil', 'eraser', 'blur', 'sharpen', 'dodge', 'burn', 'cloneStamp'].includes(activeTool) && (
        <div className="mt-2 flex-shrink-0 px-0.5">
          <input
            type="range"
            min={1}
            max={100}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-8 h-16 editor-brush-slider"
            // @ts-ignore orient attribute for vertical slider
            orient="vertical"
            title={`Fırça Boyutu: ${brushSize}`}
            style={{ cursor: 'pointer', writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <div className="text-[7px] text-[#666] text-center mt-0.5">{brushSize}</div>
        </div>
      )}
    </div>
  );
}
