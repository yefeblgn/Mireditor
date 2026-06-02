import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Plus, Trash2, Copy, FolderPlus,
  ChevronRight, ChevronDown, Layers, GripVertical,
  Blend, Sliders,
} from 'lucide-react';
import { useEditorStore, Layer } from '../../store/useEditorStore';
import { getCanvasThumbnail, getLayerThumbnail } from './Canvas';

const BLEND_MODES = [
  'normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten',
  'color-dodge', 'color-burn', 'hard-light', 'soft-light',
  'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
];

export function EditorLayerPanel() {
  const {
    layers,
    activeLayerId,
    setActiveLayerId,
    addLayer,
    removeLayer,
    duplicateLayer,
    updateLayer,
    reorderLayers,
    addGroup,
  } = useEditorStore();

  const canvas = useEditorStore((s) => s.canvas);
  const canvasWidth = useEditorStore((s) => s.canvasWidth);
  const canvasHeight = useEditorStore((s) => s.canvasHeight);
  const isModified = useEditorStore((s) => s.isModified);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; layerId: string } | null>(null);
  const [showProperties, setShowProperties] = useState<string | null>(null);
  const [navThumb, setNavThumb] = useState<string | null>(null);
  const [layerThumbs, setLayerThumbs] = useState<Record<string, string | null>>({});
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const thumbTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Refresh thumbnails on changes ──
  const refreshThumbnails = useCallback(() => {
    if (!canvas) return;
    // Navigator thumbnail
    const thumb = getCanvasThumbnail(canvas, canvasWidth, canvasHeight, 200);
    setNavThumb(thumb);
    // Per-layer thumbnails
    const thumbs: Record<string, string | null> = {};
    layers.forEach((layer) => {
      if (!layer.isGroup) {
        thumbs[layer.id] = getLayerThumbnail(canvas, layer.id, canvasWidth, canvasHeight, 48, 32);
      }
    });
    setLayerThumbs(thumbs);
  }, [canvas, canvasWidth, canvasHeight, layers]);

  // Debounced refresh on canvas events
  useEffect(() => {
    if (!canvas) return;
    const scheduleRefresh = () => {
      if (thumbTimer.current) clearTimeout(thumbTimer.current);
      thumbTimer.current = setTimeout(refreshThumbnails, 300);
    };
    // Refresh on initial mount
    scheduleRefresh();
    // Listen for canvas changes
    canvas.on('after:render', scheduleRefresh);
    return () => {
      canvas.off('after:render', scheduleRefresh);
      if (thumbTimer.current) clearTimeout(thumbTimer.current);
    };
  }, [canvas, refreshThumbnails]);

  // Also refresh when isModified changes (after undo/redo/save etc)
  useEffect(() => {
    if (thumbTimer.current) clearTimeout(thumbTimer.current);
    thumbTimer.current = setTimeout(refreshThumbnails, 400);
  }, [isModified, refreshThumbnails]);

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    dragOverItem.current = idx;
  };

  const handleDrop = () => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      reorderLayers(dragItem.current, dragOverItem.current);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDoubleClick = (layer: Layer) => {
    setShowProperties(layer.id);
  };

  const handleContextMenu = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, layerId });
  };

  const closeContextMenu = () => setContextMenu(null);

  const startRename = (layer: Layer) => {
    setEditingId(layer.id);
    setEditName(layer.name);
  };

  const finishRename = (id: string) => {
    if (editName.trim()) {
      updateLayer(id, { name: editName.trim() });
    }
    setEditingId(null);
  };

  // Tree structure helpers
  const getRootLayers = () => layers.filter((l) => !l.parentId);
  const getChildren = (parentId: string) => layers.filter((l) => l.parentId === parentId);

  const renderLayer = (layer: Layer, depth = 0) => {
    const isActive = activeLayerId === layer.id;
    const children = layer.isGroup ? getChildren(layer.id) : [];

    return (
      <div key={layer.id}>
        <div
          draggable
          onDragStart={() => handleDragStart(layers.indexOf(layer))}
          onDragOver={(e) => handleDragOver(e, layers.indexOf(layer))}
          onDrop={handleDrop}
          onClick={() => setActiveLayerId(layer.id)}
          onDoubleClick={() => handleDoubleClick(layer)}
          onContextMenu={(e) => handleContextMenu(e, layer.id)}
          className={`flex items-center gap-1.5 px-1.5 py-1 mx-1 rounded transition-all duration-100 group
            ${isActive
              ? 'bg-[#3b82f6]/20 border border-[#3b82f6]/30'
              : 'border border-transparent hover:bg-[#252525]'
            }`}
          style={{ paddingLeft: `${depth * 16 + 6}px`, cursor: 'default' }}
        >
          {/* Drag handle */}
          <GripVertical size={10} className="text-[#444] opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-grab" />

          {/* Group toggle */}
          {layer.isGroup && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateLayer(layer.id, { collapsed: !layer.collapsed });
              }}
              className="text-[#666] hover:text-white flex-shrink-0"
              style={{ cursor: 'default' }}
            >
              {layer.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
            </button>
          )}

          {/* Layer preview */}
          <div
            className={`w-7 h-5 rounded-sm flex-shrink-0 border border-[#333] flex items-center justify-center overflow-hidden
              ${layer.isGroup ? 'bg-[#2a2a2a]' : 'bg-[#222]'}`}
          >
            {layer.isGroup ? (
              <FolderPlus size={8} className="text-[#666]" />
            ) : layerThumbs[layer.id] ? (
              <img src={layerThumbs[layer.id]!} alt="" className="w-full h-full object-contain" draggable={false} />
            ) : (
              <div className="w-full h-full bg-white" />
            )}
          </div>

          {/* Name */}
          {editingId === layer.id ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => finishRename(layer.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') finishRename(layer.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              className="flex-1 bg-[#1a1a1a] text-white text-[11px] px-1 py-0.5 rounded border border-[#3b82f6] outline-none min-w-0"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className={`flex-1 text-[11px] truncate ${isActive ? 'text-white' : 'text-[#ccc]'}`}>
              {layer.name}
            </span>
          )}

          {/* Visibility */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateLayer(layer.id, { visible: !layer.visible });
            }}
            className="text-[#555] hover:text-white flex-shrink-0 transition-colors"
            style={{ cursor: 'default' }}
          >
            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
          </button>

          {/* Lock */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateLayer(layer.id, { locked: !layer.locked });
            }}
            className={`flex-shrink-0 transition-colors ${layer.locked ? 'text-yellow-500' : 'text-[#555] hover:text-white'}`}
            style={{ cursor: 'default' }}
          >
            {layer.locked ? <Lock size={10} /> : <Unlock size={10} className="opacity-0 group-hover:opacity-100" />}
          </button>
        </div>

        {/* Children */}
        {layer.isGroup && !layer.collapsed && children.map((child) => renderLayer(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-56 bg-[#1a1a1a] border-l border-[#2a2a2a] flex flex-col select-none flex-shrink-0" style={{ cursor: 'default' }}>
      {/* Navigator preview */}
      <div className="h-32 border-b border-[#2a2a2a] p-2">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px]">Gezgin</h3>
        </div>
        <div className="w-full h-20 bg-[#111] border border-[#2a2a2a] rounded flex items-center justify-center overflow-hidden">
          {navThumb ? (
            <img src={navThumb} alt="Önizleme" className="w-full h-full object-contain" draggable={false} />
          ) : (
            <span className="text-[#333] text-[9px]">ÖNİZLEME</span>
          )}
        </div>
      </div>

      {/* Layer controls top */}
      <div className="px-2 py-1.5 border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1">
            <Layers size={12} className="text-[#666]" />
            <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px]">Katmanlar</h3>
          </div>
          <span className="text-[9px] text-[#444]">{layers.length}</span>
        </div>

        {/* Blend mode & Opacity for active layer */}
        {activeLayerId && (() => {
          const activeLayer = layers.find((l) => l.id === activeLayerId);
          if (!activeLayer) return null;
          return (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Blend size={10} className="text-[#555] flex-shrink-0" />
                <select
                  value={activeLayer.blendMode}
                  onChange={(e) => updateLayer(activeLayerId, { blendMode: e.target.value })}
                  className="flex-1 bg-[#111] text-[#ccc] text-[10px] border border-[#333] rounded px-1 py-0.5 outline-none"
                  style={{ cursor: 'default' }}
                >
                  {BLEND_MODES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-1.5">
                <Sliders size={10} className="text-[#555] flex-shrink-0" />
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={activeLayer.opacity}
                  onChange={(e) => updateLayer(activeLayerId, { opacity: Number(e.target.value) })}
                  className="flex-1 h-1 accent-[#3b82f6]"
                  style={{ cursor: 'pointer' }}
                />
                <span className="text-[10px] text-[#666] w-7 text-right">{activeLayer.opacity}%</span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Layer list */}
      <div className="flex-1 overflow-y-auto py-1">
        {getRootLayers().length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[#444] text-[10px]">Katman yok</p>
          </div>
        ) : (
          getRootLayers().map((layer) => renderLayer(layer))
        )}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-around py-1.5 border-t border-[#2a2a2a]">
        <button
          onClick={() => addLayer()}
          className="text-[#666] hover:text-white p-1 rounded hover:bg-[#252525] transition-colors"
          title="Yeni Katman"
          style={{ cursor: 'default' }}
        >
          <Plus size={14} />
        </button>
        <button
          onClick={() => addGroup()}
          className="text-[#666] hover:text-white p-1 rounded hover:bg-[#252525] transition-colors"
          title="Yeni Grup"
          style={{ cursor: 'default' }}
        >
          <FolderPlus size={14} />
        </button>
        <button
          onClick={() => activeLayerId && duplicateLayer(activeLayerId)}
          className="text-[#666] hover:text-white p-1 rounded hover:bg-[#252525] transition-colors"
          title="Katmanı Çoğalt"
          style={{ cursor: 'default' }}
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => activeLayerId && removeLayer(activeLayerId)}
          className="text-[#666] hover:text-red-400 p-1 rounded hover:bg-[#252525] transition-colors"
          title="Katmanı Sil"
          style={{ cursor: 'default' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[300]" onClick={closeContextMenu} />
          <div
            className="fixed bg-[#222] border border-[#3a3a3a] rounded-lg shadow-xl shadow-black/50 py-1 min-w-[160px] z-[301]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <ContextItem label="Yeniden Adlandır" onClick={() => {
              const layer = layers.find((l) => l.id === contextMenu.layerId);
              if (layer) startRename(layer);
              closeContextMenu();
            }} />
            <ContextItem label="Çoğalt" onClick={() => {
              duplicateLayer(contextMenu.layerId);
              closeContextMenu();
            }} />
            <div className="h-px bg-[#333] my-1 mx-2" />
            <ContextItem label="Özellikler" onClick={() => {
              setShowProperties(contextMenu.layerId);
              closeContextMenu();
            }} />
            <div className="h-px bg-[#333] my-1 mx-2" />
            <ContextItem label="Sil" danger onClick={() => {
              removeLayer(contextMenu.layerId);
              closeContextMenu();
            }} />
          </div>
        </>
      )}

      {/* Layer Properties Modal */}
      {showProperties && (() => {
        const layer = layers.find((l) => l.id === showProperties);
        if (!layer) return null;
        return (
          <div className="fixed inset-0 z-[400] flex items-center justify-center animate-modal-in">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProperties(null)} />
            <div className="relative w-[360px] bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl shadow-2xl shadow-black/60 animate-modal-scale">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
                <h2 className="text-white text-sm font-semibold">Katman Özellikleri</h2>
                <button
                  onClick={() => setShowProperties(null)}
                  className="text-[#555] hover:text-white text-lg"
                  style={{ cursor: 'default' }}
                >×</button>
              </div>
              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="text-[#888] text-[10px] font-bold uppercase tracking-wider block mb-1">Ad</label>
                  <input
                    value={layer.name}
                    onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
                    className="w-full bg-[#111] text-white text-sm border border-[#333] rounded-lg px-3 py-2 outline-none focus:border-[#3b82f6]"
                  />
                </div>

                {/* Opacity */}
                <div>
                  <label className="text-[#888] text-[10px] font-bold uppercase tracking-wider block mb-1">
                    Opaklık: {layer.opacity}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={layer.opacity}
                    onChange={(e) => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                    className="w-full accent-[#3b82f6]"
                    style={{ cursor: 'pointer' }}
                  />
                </div>

                {/* Blend Mode */}
                <div>
                  <label className="text-[#888] text-[10px] font-bold uppercase tracking-wider block mb-1">Karışım Modu</label>
                  <select
                    value={layer.blendMode}
                    onChange={(e) => updateLayer(layer.id, { blendMode: e.target.value })}
                    className="w-full bg-[#111] text-white text-sm border border-[#333] rounded-lg px-3 py-2 outline-none focus:border-[#3b82f6]"
                    style={{ cursor: 'default' }}
                  >
                    {BLEND_MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Toggles */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-[#ccc]" style={{ cursor: 'default' }}>
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={(e) => updateLayer(layer.id, { visible: e.target.checked })}
                      className="accent-[#3b82f6]"
                      style={{ cursor: 'pointer' }}
                    />
                    Görünür
                  </label>
                  <label className="flex items-center gap-2 text-sm text-[#ccc]" style={{ cursor: 'default' }}>
                    <input
                      type="checkbox"
                      checked={layer.locked}
                      onChange={(e) => updateLayer(layer.id, { locked: e.target.checked })}
                      className="accent-[#3b82f6]"
                      style={{ cursor: 'pointer' }}
                    />
                    Kilitli
                  </label>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ContextItem({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/20' : 'text-[#ccc] hover:bg-[#3b82f6] hover:text-white'}`}
      style={{ cursor: 'default' }}
    >
      {label}
    </button>
  );
}
