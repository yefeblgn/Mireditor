import React from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { ToolIcons, TOOL_LABELS } from '../ui/icons';
import type { ToolId } from '../model/types';

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
          {group.map((id) => (
            <button
              key={id}
              onClick={() => setActiveTool(id)}
              title={TOOL_LABELS[id]}
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
                activeTool === id
                  ? 'bg-[#3b82f6] text-white'
                  : 'text-[#777] hover:bg-[#1a1a1a] hover:text-[#bbb]'
              }`}
            >
              {ToolIcons[id]}
            </button>
          ))}
        </React.Fragment>
      ))}

      {/* Birincil / ikincil renk göstergesi */}
      <div className="mt-auto pt-2 relative w-9 h-9">
        <div
          className="absolute right-0 bottom-0 w-5 h-5 rounded border border-[#333]"
          style={{ background: options.secondaryColor }}
        />
        <div
          className="absolute left-0 top-0 w-5 h-5 rounded border border-[#444]"
          style={{ background: options.primaryColor }}
        />
      </div>
    </div>
  );
}
