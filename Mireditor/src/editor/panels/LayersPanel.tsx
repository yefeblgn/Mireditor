import React, { useEffect, useMemo, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { makeThumbnail } from '../render/Compositor';
import { BLEND_MODES, type Layer } from '../model/types';
import { UI } from '../ui/icons';

export function LayersPanel() {
  const doc = useEditorStore((s) => s.doc);
  const renderVersion = useEditorStore((s) => s.renderVersion);
  const setActiveLayer = useEditorStore((s) => s.setActiveLayer);
  const toggleVisible = useEditorStore((s) => s.toggleVisible);
  const setLayerOpacity = useEditorStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useEditorStore((s) => s.setLayerBlendMode);
  const renameLayer = useEditorStore((s) => s.renameLayer);
  const addRasterLayer = useEditorStore((s) => s.addRasterLayer);
  const duplicateLayer = useEditorStore((s) => s.duplicateLayer);
  const removeLayer = useEditorStore((s) => s.removeLayer);
  const mergeDown = useEditorStore((s) => s.mergeDown);
  const reorderLayer = useEditorStore((s) => s.reorderLayer);
  const setLayerLocked = useEditorStore((s) => s.setLayerLocked);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  if (!doc) return null;
  const active = doc.layers.find((l) => l.id === doc.activeLayerId) ?? null;
  // Üstteki katman listede en üstte görünür → ters sıra
  const ordered = [...doc.layers].reverse();

  return (
    <div className="flex flex-col h-full">
      {/* Blend + opacity (aktif katman) */}
      <div className="px-3 pt-3 pb-2 border-b border-[#1a1a1a] space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={active?.blendMode ?? 'normal'}
            disabled={!active}
            onChange={(e) => active && setLayerBlendMode(active.id, e.target.value as any)}
            className="flex-1 bg-[#141414] border border-[#262626] rounded px-2 py-1 text-[11px] text-[#ccc] outline-none focus:border-[#3b82f6]"
          >
            {BLEND_MODES.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#666] uppercase tracking-wider w-12">Opaklık</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((active?.opacity ?? 1) * 100)}
            disabled={!active}
            onChange={(e) => active && setLayerOpacity(active.id, Number(e.target.value) / 100)}
            className="flex-1 accent-[#3b82f6]"
          />
          <span className="text-[10px] text-[#999] w-8 text-right">
            {Math.round((active?.opacity ?? 1) * 100)}%
          </span>
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
        {ordered.map((layer) => (
          <LayerRow
            key={layer.id}
            layer={layer}
            active={layer.id === doc.activeLayerId}
            renderVersion={renderVersion}
            editing={editingId === layer.id}
            onSelect={() => setActiveLayer(layer.id)}
            onToggle={() => toggleVisible(layer.id)}
            onRename={(name) => {
              renameLayer(layer.id, name);
              setEditingId(null);
            }}
            onStartEdit={() => setEditingId(layer.id)}
            onLock={() => setLayerLocked(layer.id, !layer.locked)}
            isDragging={dragId === layer.id}
            onDragStart={() => setDragId(layer.id)}
            onDragEnd={() => setDragId(null)}
            onDropOn={() => {
              if (dragId && dragId !== layer.id) {
                const toIndex = doc.layers.findIndex((l) => l.id === layer.id);
                reorderLayer(dragId, toIndex);
              }
              setDragId(null);
            }}
          />
        ))}
      </div>

      {/* Alt aksiyon barı */}
      <div className="flex items-center justify-around px-2 py-2 border-t border-[#1a1a1a]">
        <ActionBtn title="Yeni katman" onClick={() => addRasterLayer()}>
          {UI.add}
        </ActionBtn>
        <ActionBtn title="Çoğalt" disabled={!active} onClick={() => active && duplicateLayer(active.id)}>
          {UI.duplicate}
        </ActionBtn>
        <ActionBtn title="Aşağı birleştir" disabled={!active} onClick={() => active && mergeDown(active.id)}>
          {UI.merge}
        </ActionBtn>
        <ActionBtn
          title="Sil"
          disabled={!active || doc.layers.length <= 1}
          onClick={() => active && removeLayer(active.id)}
        >
          {UI.trash}
        </ActionBtn>
      </div>
    </div>
  );
}

function LayerRow({
  layer,
  active,
  renderVersion,
  editing,
  onSelect,
  onToggle,
  onRename,
  onStartEdit,
  onLock,
  isDragging,
  onDragStart,
  onDragEnd,
  onDropOn,
}: {
  layer: Layer;
  active: boolean;
  renderVersion: number;
  editing: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onRename: (name: string) => void;
  onStartEdit: () => void;
  onLock: () => void;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDropOn: () => void;
}) {
  const [thumb, setThumb] = useState<string>('');

  useEffect(() => {
    try {
      setThumb(makeThumbnail(layer.canvas, 36, 36));
    } catch (e) {
      // ignore
    }
  }, [layer.id]);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setThumb(makeThumbnail(layer.canvas, 36, 36));
      } catch (e) {
        // ignore
      }
    }, 200); // 200ms debounce during dragging/painting
    return () => clearTimeout(t);
  }, [layer.id, renderVersion]);

  return (
    <div
      draggable={!editing}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDropOn}
      onClick={onSelect}
      className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer transition-colors ${
        active ? 'bg-[#1d2a44] border border-[#3b82f6]/40' : 'border border-transparent hover:bg-[#161616]'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`flex-shrink-0 ${layer.visible ? 'text-[#bbb]' : 'text-[#444]'} hover:text-white`}
        title="Görünürlük"
      >
        {layer.visible ? UI.eye : UI.eyeOff}
      </button>

      <div
        className="w-9 h-9 flex-shrink-0 rounded bg-[#0a0a0a] border border-[#262626] overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(45deg,#222 25%,transparent 25%),linear-gradient(-45deg,#222 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#222 75%),linear-gradient(-45deg,transparent 75%,#222 75%)',
          backgroundSize: '8px 8px',
          backgroundPosition: '0 0,0 4px,4px -4px,-4px 0',
        }}
      >
        <img src={thumb} alt="" className="w-full h-full object-contain" draggable={false} />
      </div>

      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            autoFocus
            defaultValue={layer.name}
            onBlur={(e) => onRename(e.target.value || layer.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRename((e.target as HTMLInputElement).value || layer.name);
              if (e.key === 'Escape') onRename(layer.name);
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-[#0a0a0a] border border-[#3b82f6] rounded px-1.5 py-0.5 text-[11px] text-white outline-none"
          />
        ) : (
          <p
            onDoubleClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            className={`text-[11px] truncate ${active ? 'text-white' : 'text-[#bbb]'}`}
          >
            {layer.name}
          </p>
        )}
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onLock();
        }}
        className={`flex-shrink-0 ${layer.locked ? 'text-[#3b82f6]' : 'text-[#333] hover:text-[#777]'}`}
        title={layer.locked ? 'Kilidi aç' : 'Kilitle'}
      >
        {UI.lock}
      </button>
    </div>
  );
}

function ActionBtn({
  children,
  title,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`p-1.5 rounded transition-colors ${
        disabled ? 'text-[#2a2a2a] cursor-not-allowed' : 'text-[#777] hover:text-white hover:bg-[#1d1d1d]'
      }`}
    >
      {children}
    </button>
  );
}
