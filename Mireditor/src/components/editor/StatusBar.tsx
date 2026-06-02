import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';

export function EditorStatusBar() {
  const { zoom, cursorPos, canvasWidth, canvasHeight, documentSize, projectTitle, isModified, activeTool } = useEditorStore();

  const toolLabels: Record<string, string> = {
    move: 'Taşı', marquee: 'Seçim', ellipseMarquee: 'Elips Seçim',
    lasso: 'Kement', polyLasso: 'Çokgen Kement', magicWand: 'Sihirli Değnek',
    crop: 'Kırp', eyedropper: 'Damlalık', cloneStamp: 'Klonla',
    brush: 'Fırça', pencil: 'Kalem', eraser: 'Silgi',
    fill: 'Dolgu', gradient: 'Gradyan', blur: 'Bulanıklaştır',
    sharpen: 'Keskinleştir', smudge: 'Leke', dodge: 'Soldur',
    burn: 'Yakma', sponge: 'Sünger', pen: 'Kalem Aracı',
    text: 'Metin', line: 'Çizgi', rectangle: 'Dikdörtgen',
    ellipse: 'Elips', polygon: 'Çokgen', hand: 'El', zoom: 'Yakınlaştır',
  };

  return (
    <div className="h-6 bg-[#1a1a1a] border-t border-[#2a2a2a] flex items-center px-3 justify-between select-none flex-shrink-0" style={{ cursor: 'default' }}>
      <div className="flex items-center gap-4">
        <span className="text-[9px] text-[#666] font-medium">
          {toolLabels[activeTool] || activeTool}
        </span>
        <span className="text-[9px] text-[#555]">
          X: {cursorPos.x} &nbsp;Y: {cursorPos.y}
        </span>
        <span className="text-[9px] text-[#555]">
          {canvasWidth} × {canvasHeight} px
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <ZoomOut size={10} className="text-[#555]" />
          <span className="text-[9px] text-blue-400 font-bold">{zoom}%</span>
          <ZoomIn size={10} className="text-[#555]" />
        </div>
        <span className="text-[9px] text-[#444]">
          {projectTitle}{isModified ? ' •' : ''}
        </span>
      </div>
    </div>
  );
}
