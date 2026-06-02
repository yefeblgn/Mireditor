import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ToolIcons, TOOL_LABELS } from '../ui/icons';
import type { ToolId } from '../model/types';
import { Tooltip } from '../../components/ui/Tooltip';

function parseLabel(full: string): { label: string; shortcut?: string } {
  const m = full.match(/^(.+?)\s+\(([^)]+)\)$/);
  return m ? { label: m[1], shortcut: m[2] } : { label: full };
}

const GROUPS: ToolId[][] = [
  ['move'],
  ['marquee', 'lasso'],
  ['brush', 'pencil', 'eraser'],
  ['bucket', 'gradient'],
  ['shape', 'text'],
  ['clone', 'eyedropper'],
  ['crop'],
  ['zoom', 'hand'],
];

export function Toolbar() {
  const activeTool = useEditorStore((s) => s.activeTool);
  const setActiveTool = useEditorStore((s) => s.setActiveTool);
  const options = useEditorStore((s) => s.toolOptions);

  return (
    <div className="w-12 bg-[#111] border-r border-[#1a1a1a] flex flex-col items-center py-2 gap-0.5 overflow-y-auto">
      {GROUPS.map((group, gi) => (
        <React.Fragment key={gi}>
          {gi > 0 && <div className="w-6 h-px bg-[#1f1f1f] my-1" />}
          {group.map((id) => {
            const { label, shortcut } = parseLabel(TOOL_LABELS[id]);
            return (
              <Tooltip key={id} content={label} shortcut={shortcut} side="right">
                <button
                  onClick={() => setActiveTool(id)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                    activeTool === id
                      ? 'bg-[#3b82f6] text-white'
                      : 'text-[#777] hover:bg-[#1a1a1a] hover:text-[#bbb]'
                  }`}
                >
                  {ToolIcons[id]}
                </button>
              </Tooltip>
            );
          })}
        </React.Fragment>
      ))}

      {/* Birincil / ikincil renk swatchları */}
      <div className="mt-auto pt-2 relative w-9 h-9">
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('mireditor:color-click', { detail: { which: 'secondary' } }))}
          className="absolute right-0 bottom-0 w-5 h-5 rounded border border-[#333] cursor-pointer hover:scale-110 transition-transform"
          style={{ background: options.secondaryColor }}
          title="İkincil Renk"
        />
        <div
          onClick={() => window.dispatchEvent(new CustomEvent('mireditor:color-click', { detail: { which: 'primary' } }))}
          className="absolute left-0 top-0 w-5 h-5 rounded border border-[#555] cursor-pointer hover:scale-110 transition-transform"
          style={{ background: options.primaryColor }}
          title="Birincil Renk"
        />
      </div>
    </div>
  );
}
