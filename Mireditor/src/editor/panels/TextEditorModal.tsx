import React, { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { getActiveLayer, get2d } from '../model/document';
import { renderTextLayer } from '../render/text';
import { 
  X, Bold, Italic, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import type { TextData } from '../model/types';

interface Props {
  layerId: string;
  onClose: () => void;
}

const FONT_LIST = [
  'Plus Jakarta Sans',
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Impact',
  'Comic Sans MS',
  'Roboto',
  'Open Sans',
  'Montserrat',
  'Lato',
  'Poppins',
  'Inter',
  'Nunito',
  'Raleway',
  'Oswald',
  'Ubuntu',
  'Merriweather',
  'Playfair Display',
  'Source Code Pro',
  'Fira Code',
  'JetBrains Mono'
];

export function TextEditorModal({ layerId, onClose }: Props) {
  const doc = useEditorStore((s) => s.doc);
  const bumpRender = useEditorStore((s) => s.bumpRender);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  const layer = doc ? doc.layers.find((l) => l.id === layerId) : null;
  const isTextLayer = layer && layer.type === 'text' && layer.text;

  // Local state initialized with current layer properties
  const [content, setContent] = useState('');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(24);
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [curve, setCurve] = useState(0);
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [align, setAlign] = useState<'left' | 'center' | 'right'>('left');
  const [color, setColor] = useState('#000000');

  // Backup of the original text data to restore on cancel
  const originalTextRef = useRef<TextData | null>(null);

  useEffect(() => {
    if (!isTextLayer || !layer || !layer.text) return;

    // Backup text data
    originalTextRef.current = { ...layer.text };

    const t = layer.text;
    setContent(t.content);
    setFontFamily(t.fontFamily);
    setFontSize(t.fontSize);
    setLetterSpacing(t.letterSpacing || 0);
    setCurve(t.curve || 0);
    setBold(t.bold);
    setItalic(t.italic);
    setAlign(t.align);
    setColor(t.color);
  }, [layerId]);

  const updatePreview = (updates: Partial<TextData>) => {
    if (!layer || !layer.text) return;

    // Apply updates directly to layer's text object
    layer.text = {
      ...layer.text,
      ...updates
    };

    // Re-render text on layer canvas and refresh document viewport
    renderTextLayer(layer);
    bumpRender();
  };

  const handleApply = () => {
    if (!layer) {
      onClose();
      return;
    }
    // Commit to state history
    pushHistory('Metni Düzenle');
    useEditorStore.setState({ dirty: true });
    onClose();
  };

  const handleCancel = () => {
    if (layer && originalTextRef.current) {
      // Revert changes
      layer.text = originalTextRef.current;
      renderTextLayer(layer);
      bumpRender();
    }
    onClose();
  };

  // Keyboard confirmation
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      // Allow multi-line typing in textarea, so don't submit on Enter if target is textarea
      const target = e.target as HTMLElement | null;
      const isTextarea = target && target.tagName === 'TEXTAREA';
      
      if (e.key === 'Enter' && !isTextarea && !e.shiftKey) {
        e.preventDefault();
        handleApply();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', handleKeys);
    return () => window.removeEventListener('keydown', handleKeys);
  }, [content, fontFamily, fontSize, letterSpacing, curve, bold, italic, align, color, layer]);

  if (!isTextLayer || !layer) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[360px] bg-[#151515]/95 backdrop-blur border border-[#252525] rounded-xl shadow-2xl p-5 text-white animate-modal-scale">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#222] mb-4">
          <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
            <span>Metin Özellikleri</span>
          </h3>
          <button 
            onClick={handleCancel} 
            className="text-[#666] hover:text-white hover:bg-white/5 p-1 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="space-y-4">
          
          {/* Text Area */}
          <div className="space-y-1.5">
            <span className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Metin İçeriği</span>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                updatePreview({ content: e.target.value });
              }}
              placeholder="Metninizi yazın..."
              className="w-full h-20 bg-[#101010] border border-[#242424] rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#3b82f6] text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Font Family */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Yazı Tipi</span>
              <select
                value={fontFamily}
                onChange={(e) => {
                  setFontFamily(e.target.value);
                  updatePreview({ fontFamily: e.target.value });
                }}
                className="w-full bg-[#101010] border border-[#242424] rounded px-2 py-1.5 text-xs outline-none focus:border-[#3b82f6] text-white"
              >
                {FONT_LIST.map(font => (
                  <option key={font} value={font} style={{ fontFamily: font }}>{font}</option>
                ))}
              </select>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-[#666] uppercase font-bold tracking-wider">Renk</span>
              <div className="flex items-center gap-2 bg-[#101010] border border-[#242424] rounded px-2 py-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => {
                    setColor(e.target.value);
                    updatePreview({ color: e.target.value });
                  }}
                  className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0"
                />
                <span className="text-[10px] font-mono text-[#aaa]">{color.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* Font Size (Punto) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#666] uppercase font-bold tracking-wider">Punto</span>
              <span className="text-[#999] font-mono">{fontSize} px</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={8}
                max={200}
                value={fontSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFontSize(val);
                  updatePreview({ fontSize: val });
                }}
                className="flex-1 h-1 bg-[#242424] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
              <input
                type="number"
                min={8}
                max={999}
                value={fontSize}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFontSize(val);
                  updatePreview({ fontSize: val });
                }}
                className="w-14 bg-[#101010] border border-[#242424] rounded px-1.5 py-0.5 text-center text-xs outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {/* Letter Spacing (Aralık) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#666] uppercase font-bold tracking-wider">Karakter Aralığı</span>
              <span className="text-[#999] font-mono">{letterSpacing} px</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={50}
                value={letterSpacing}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLetterSpacing(val);
                  updatePreview({ letterSpacing: val });
                }}
                className="flex-1 h-1 bg-[#242424] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
              <input
                type="number"
                min={0}
                max={200}
                value={letterSpacing}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setLetterSpacing(val);
                  updatePreview({ letterSpacing: val });
                }}
                className="w-14 bg-[#101010] border border-[#242424] rounded px-1.5 py-0.5 text-center text-xs outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {/* Curve (Kavis) */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="text-[#666] uppercase font-bold tracking-wider">Kavis / Bükme</span>
              <span className="text-[#999] font-mono">{curve} %</span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={-100}
                max={100}
                value={curve}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurve(val);
                  updatePreview({ curve: val });
                }}
                className="flex-1 h-1 bg-[#242424] rounded-lg appearance-none cursor-pointer accent-[#3b82f6]"
              />
              <input
                type="number"
                min={-100}
                max={100}
                value={curve}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurve(val);
                  updatePreview({ curve: val });
                }}
                className="w-14 bg-[#101010] border border-[#242424] rounded px-1.5 py-0.5 text-center text-xs outline-none focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {/* Alignment and Styling Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#666] uppercase font-bold tracking-wider mr-1">Hizalama</span>
              <button
                type="button"
                onClick={() => { setAlign('left'); updatePreview({ align: 'left' }); }}
                className={`p-1.5 rounded transition-all ${align === 'left' ? 'bg-[#3b82f6] text-white' : 'bg-[#101010] text-[#777] hover:text-[#ccc]'}`}
                title="Sola Hizala"
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setAlign('center'); updatePreview({ align: 'center' }); }}
                className={`p-1.5 rounded transition-all ${align === 'center' ? 'bg-[#3b82f6] text-white' : 'bg-[#101010] text-[#777] hover:text-[#ccc]'}`}
                title="Ortala"
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setAlign('right'); updatePreview({ align: 'right' }); }}
                className={`p-1.5 rounded transition-all ${align === 'right' ? 'bg-[#3b82f6] text-white' : 'bg-[#101010] text-[#777] hover:text-[#ccc]'}`}
                title="Sağa Hizala"
              >
                <AlignRight size={14} />
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[#666] uppercase font-bold tracking-wider mr-1">Stil</span>
              <button
                type="button"
                onClick={() => { setBold(!bold); updatePreview({ bold: !bold }); }}
                className={`p-1.5 rounded transition-all ${bold ? 'bg-[#3b82f6] text-white' : 'bg-[#101010] text-[#777] hover:text-[#ccc]'}`}
                title="Kalın"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={() => { setItalic(!italic); updatePreview({ italic: !italic }); }}
                className={`p-1.5 rounded transition-all ${italic ? 'bg-[#3b82f6] text-white' : 'bg-[#101010] text-[#777] hover:text-[#ccc]'}`}
                title="İtalik"
              >
                <Italic size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#222] mt-5">
          <button
            onClick={handleCancel}
            className="px-3.5 py-1.5 rounded text-[11px] font-medium text-[#aaa] hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider"
          >
            İptal
          </button>
          <button
            onClick={handleApply}
            className="px-3.5 py-1.5 rounded text-[11px] font-semibold bg-[#3b82f6] text-white hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all uppercase tracking-wider"
          >
            Uygula
          </button>
        </div>

      </div>
    </div>
  );
}
