import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Type, ChevronDown,
} from 'lucide-react';
import { useEditorStore } from '../../store/useEditorStore';
import * as fabric from 'fabric';

// ── Font list ──
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
  'Palatino',
  'Garamond',
  'Bookman',
  'Lucida Console',
  'Monaco',
  'Consolas',
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
  'JetBrains Mono',
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 128, 144, 192, 256];

interface TextProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
  fontStyle: string;
  underline: boolean;
  linethrough: boolean;
  fill: string;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
}

const DEFAULT_TEXT_PROPS: TextProps = {
  fontFamily: 'Plus Jakarta Sans',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  underline: false,
  linethrough: false,
  fill: '#000000',
  textAlign: 'left',
  lineHeight: 1.16,
  charSpacing: 0,
};

export function TextPropertiesBar() {
  const canvas = useEditorStore((s) => s.canvas);
  const [selectedText, setSelectedText] = useState<fabric.IText | fabric.Textbox | null>(null);
  const [textProps, setTextProps] = useState<TextProps>(DEFAULT_TEXT_PROPS);
  const [showFontDropdown, setShowFontDropdown] = useState(false);
  const [fontFilter, setFontFilter] = useState('');
  const fontDropdownRef = useRef<HTMLDivElement>(null);
  const fontInputRef = useRef<HTMLInputElement>(null);

  // ── Listen for canvas selection events ──
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const active = canvas.getActiveObject?.();
      if (active && (active instanceof fabric.IText || active instanceof fabric.Textbox)) {
        setSelectedText(active as fabric.IText);
        setTextProps({
          fontFamily: (active as any).fontFamily || DEFAULT_TEXT_PROPS.fontFamily,
          fontSize: (active as any).fontSize || DEFAULT_TEXT_PROPS.fontSize,
          fontWeight: (active as any).fontWeight || DEFAULT_TEXT_PROPS.fontWeight,
          fontStyle: (active as any).fontStyle || DEFAULT_TEXT_PROPS.fontStyle,
          underline: !!(active as any).underline,
          linethrough: !!(active as any).linethrough,
          fill: (typeof (active as any).fill === 'string' ? (active as any).fill : DEFAULT_TEXT_PROPS.fill),
          textAlign: (active as any).textAlign || DEFAULT_TEXT_PROPS.textAlign,
          lineHeight: (active as any).lineHeight ?? DEFAULT_TEXT_PROPS.lineHeight,
          charSpacing: (active as any).charSpacing ?? DEFAULT_TEXT_PROPS.charSpacing,
        });
      } else {
        setSelectedText(null);
      }
    };

    const handleCleared = () => {
      setSelectedText(null);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleCleared);
    // Also listen for text editing events
    canvas.on('text:changed', handleSelection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleCleared);
      canvas.off('text:changed', handleSelection);
    };
  }, [canvas]);

  // ── Close font dropdown on outside click ──
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fontDropdownRef.current && !fontDropdownRef.current.contains(e.target as Node)) {
        setShowFontDropdown(false);
      }
    };
    if (showFontDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFontDropdown]);

  // ── Update text object property ──
  const updateProp = useCallback((prop: string, value: any) => {
    if (!selectedText || !canvas) return;
    (selectedText as any).set(prop, value);
    selectedText.setCoords();
    canvas.requestRenderAll();
    // Update local state
    setTextProps((prev) => ({ ...prev, [prop]: value }));
    // Save history
    const pushHistory = useEditorStore.getState().pushHistory;
    const json = JSON.stringify(canvas.toJSON(['customId', 'layerId', 'isMarquee']));
    pushHistory(json);
    useEditorStore.getState().setModified(true);
  }, [selectedText, canvas]);

  // ── Toggle helpers ──
  const toggleBold = () => {
    const newWeight = textProps.fontWeight === 'bold' || textProps.fontWeight === 700 ? 'normal' : 'bold';
    updateProp('fontWeight', newWeight);
  };

  const toggleItalic = () => {
    updateProp('fontStyle', textProps.fontStyle === 'italic' ? 'normal' : 'italic');
  };

  const toggleUnderline = () => {
    updateProp('underline', !textProps.underline);
  };

  const toggleStrikethrough = () => {
    updateProp('linethrough', !textProps.linethrough);
  };

  // ── Font size change ──
  const handleFontSizeChange = (val: string) => {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0 && num <= 999) {
      updateProp('fontSize', num);
    }
  };

  // ── Filtered fonts ──
  const filteredFonts = fontFilter
    ? FONT_LIST.filter((f) => f.toLowerCase().includes(fontFilter.toLowerCase()))
    : FONT_LIST;

  // ── Don't render if no text selected ──
  if (!selectedText) return null;

  const isBold = textProps.fontWeight === 'bold' || textProps.fontWeight === 700;
  const isItalic = textProps.fontStyle === 'italic';

  return (
    <div className="h-8 bg-[#1a1a1a] border-b border-[#2a2a2a] flex items-center px-3 gap-2 select-none flex-shrink-0" style={{ cursor: 'default' }}>
      {/* Tool icon */}
      <Type size={14} className="text-[#3b82f6] flex-shrink-0" />
      <div className="w-px h-4 bg-[#333]" />

      {/* Font Family */}
      <div className="relative" ref={fontDropdownRef}>
        <button
          onClick={() => {
            setShowFontDropdown(!showFontDropdown);
            setFontFilter('');
            setTimeout(() => fontInputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-1 bg-[#111] border border-[#333] rounded px-2 py-0.5 text-[11px] text-[#ccc] hover:border-[#555] min-w-[140px] max-w-[180px] transition-colors"
          style={{ cursor: 'default' }}
        >
          <span className="truncate flex-1 text-left" style={{ fontFamily: textProps.fontFamily }}>
            {textProps.fontFamily}
          </span>
          <ChevronDown size={10} className="text-[#666] flex-shrink-0" />
        </button>

        {showFontDropdown && (
          <div className="absolute top-full left-0 mt-1 w-[220px] bg-[#222] border border-[#3a3a3a] rounded-lg shadow-xl shadow-black/60 z-[500] overflow-hidden">
            {/* Search */}
            <div className="p-1.5 border-b border-[#333]">
              <input
                ref={fontInputRef}
                type="text"
                value={fontFilter}
                onChange={(e) => setFontFilter(e.target.value)}
                placeholder="Font ara..."
                className="w-full bg-[#111] text-white text-[11px] border border-[#333] rounded px-2 py-1 outline-none focus:border-[#3b82f6] placeholder-[#555]"
              />
            </div>
            {/* Font list */}
            <div className="max-h-[240px] overflow-y-auto">
              {filteredFonts.map((font) => (
                <button
                  key={font}
                  onClick={() => {
                    updateProp('fontFamily', font);
                    setShowFontDropdown(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors
                    ${textProps.fontFamily === font
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#ccc] hover:bg-[#333]'
                    }`}
                  style={{ fontFamily: font, cursor: 'default' }}
                >
                  {font}
                </button>
              ))}
              {filteredFonts.length === 0 && (
                <div className="text-[#555] text-[10px] text-center py-3">Sonuç bulunamadı</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Font Size */}
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          value={textProps.fontSize}
          onChange={(e) => handleFontSizeChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              updateProp('fontSize', Math.min(999, textProps.fontSize + 1));
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              updateProp('fontSize', Math.max(1, textProps.fontSize - 1));
            }
          }}
          className="w-12 bg-[#111] text-white text-[11px] text-center border border-[#333] rounded px-1 py-0.5 outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          min={1}
          max={999}
        />
        <span className="text-[9px] text-[#555]">px</span>
      </div>

      <div className="w-px h-4 bg-[#333]" />

      {/* Bold / Italic / Underline / Strikethrough */}
      <div className="flex items-center gap-0.5">
        <ToggleBtn active={isBold} onClick={toggleBold} title="Kalın (B)">
          <Bold size={13} />
        </ToggleBtn>
        <ToggleBtn active={isItalic} onClick={toggleItalic} title="İtalik (I)">
          <Italic size={13} />
        </ToggleBtn>
        <ToggleBtn active={textProps.underline} onClick={toggleUnderline} title="Altı Çizili (U)">
          <Underline size={13} />
        </ToggleBtn>
        <ToggleBtn active={textProps.linethrough} onClick={toggleStrikethrough} title="Üstü Çizili">
          <Strikethrough size={13} />
        </ToggleBtn>
      </div>

      <div className="w-px h-4 bg-[#333]" />

      {/* Text Alignment */}
      <div className="flex items-center gap-0.5">
        <ToggleBtn active={textProps.textAlign === 'left'} onClick={() => updateProp('textAlign', 'left')} title="Sola Hizala">
          <AlignLeft size={13} />
        </ToggleBtn>
        <ToggleBtn active={textProps.textAlign === 'center'} onClick={() => updateProp('textAlign', 'center')} title="Ortala">
          <AlignCenter size={13} />
        </ToggleBtn>
        <ToggleBtn active={textProps.textAlign === 'right'} onClick={() => updateProp('textAlign', 'right')} title="Sağa Hizala">
          <AlignRight size={13} />
        </ToggleBtn>
        <ToggleBtn active={textProps.textAlign === 'justify'} onClick={() => updateProp('textAlign', 'justify')} title="İki Yana Yasla">
          <AlignJustify size={13} />
        </ToggleBtn>
      </div>

      <div className="w-px h-4 bg-[#333]" />

      {/* Text Color */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-[#666]">Renk</span>
        <div className="relative">
          <input
            type="color"
            value={textProps.fill}
            onChange={(e) => updateProp('fill', e.target.value)}
            className="w-6 h-5 border border-[#444] rounded-sm bg-transparent p-0"
            title="Metin Rengi"
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div className="w-px h-4 bg-[#333]" />

      {/* Line Height */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-[#666] whitespace-nowrap">Satır</span>
        <input
          type="number"
          value={Math.round(textProps.lineHeight * 100) / 100}
          step={0.1}
          min={0.5}
          max={5}
          onChange={(e) => {
            const val = parseFloat(e.target.value);
            if (!isNaN(val) && val >= 0.5 && val <= 5) {
              updateProp('lineHeight', val);
            }
          }}
          className="w-11 bg-[#111] text-white text-[11px] text-center border border-[#333] rounded px-1 py-0.5 outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>

      {/* Letter Spacing */}
      <div className="flex items-center gap-1">
        <span className="text-[9px] text-[#666] whitespace-nowrap">Aralık</span>
        <input
          type="number"
          value={Math.round(textProps.charSpacing)}
          step={10}
          min={-500}
          max={2000}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            if (!isNaN(val) && val >= -500 && val <= 2000) {
              updateProp('charSpacing', val);
            }
          }}
          className="w-12 bg-[#111] text-white text-[11px] text-center border border-[#333] rounded px-1 py-0.5 outline-none focus:border-[#3b82f6] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      </div>
    </div>
  );
}

// ── Toggle button sub-component ──
function ToggleBtn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded transition-all duration-100
        ${active
          ? 'bg-[#3b82f6] text-white shadow-sm shadow-blue-500/30'
          : 'text-[#888] hover:bg-[#252525] hover:text-[#ccc]'
        }`}
      title={title}
      style={{ cursor: 'default' }}
    >
      {children}
    </button>
  );
}
