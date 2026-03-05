import React from 'react';
import { useAuthStore } from '../store/useAuthStore';

interface EditorPageProps {
  onBack: () => void;
}

export function EditorPage({ onBack }: EditorPageProps) {
  const { user } = useAuthStore();

  const handleBack = () => {
    onBack();
  };

  return (
    <div className="w-full h-full flex bg-[#090909]">
      {/* LEFT TOOLBAR */}
      <div className="w-14 bg-[#111] border-r border-[#1a1a1a] flex flex-col items-center py-3 gap-1">
        <ToolButton icon="⬈" active />
        <ToolButton icon="✎" />
        <ToolButton icon="▧" />
        <ToolButton icon="T" />
        <ToolButton icon="✂" />
        <ToolButton icon="💧" />
        <div className="flex-1" />
        <ToolButton icon="⚙" />
      </div>

      {/* CENTER: Canvas Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-9 bg-[#111] border-b border-[#1a1a1a] flex items-center px-4 gap-6">
          <span className="text-[9px] text-[#555] font-bold tracking-[2px] uppercase">
            Workspace: Default
          </span>
          <span className="text-[9px] text-[#555] font-bold tracking-[2px] uppercase">
            Zoom: 100%
          </span>
          <span className="text-[9px] text-blue-400 font-bold tracking-[2px] uppercase">
            Untitled-1 @ 100% (RGB/8)
          </span>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex items-center justify-center bg-[#181818] p-8">
          <div
            className="bg-white shadow-2xl"
            style={{
              width: '70%',
              maxWidth: 900,
              aspectRatio: '4/3',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
            }}
          />
        </div>

        {/* Bottom Status */}
        <div className="h-6 bg-[#111] border-t border-[#1a1a1a] flex items-center px-4 justify-between">
          <span className="text-[9px] text-[#444] font-bold uppercase">
            Doc: 1.44M / 0B
          </span>
          <span className="text-[9px] text-[#444] font-bold uppercase">
            {user?.username ?? 'Unknown'} • Power User
          </span>
        </div>
      </div>

      {/* RIGHT PANELS */}
      <div className="w-60 bg-[#111] border-l border-[#1a1a1a] flex flex-col">
        {/* Navigator */}
        <div className="h-44 border-b border-[#1a1a1a] p-3">
          <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px] mb-2">
            Navigator
          </h3>
          <div className="w-full h-28 bg-[#090909] border border-[#1f1f1f] rounded flex items-center justify-center">
            <span className="text-[#222] text-[10px]">PREVIEW</span>
          </div>
        </div>

        {/* Layers */}
        <div className="flex-1 p-3 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[9px] text-[#666] font-bold uppercase tracking-[2px]">
              Layers
            </h3>
            <span className="text-[9px] text-[#444]">Opacity: 100%</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1">
            <div className="bg-[#1a1a1a] p-2 rounded border border-blue-500/30 flex items-center gap-2">
              <div className="w-7 h-5 bg-white rounded-sm flex-shrink-0" />
              <span className="text-white text-xs flex-1">Background</span>
              <span className="text-[#444] text-xs cursor-pointer hover:text-white">
                👁
              </span>
            </div>
          </div>

          {/* Layer Controls */}
          <div className="flex items-center justify-around pt-2 mt-2 border-t border-[#1a1a1a]">
            <button className="text-[#555] hover:text-white text-sm transition-colors">
              🗑
            </button>
            <button className="text-[#555] hover:text-white text-sm transition-colors">
              📁
            </button>
            <button className="text-[#555] hover:text-white text-sm transition-colors">
              ✚
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={handleBack}
          className="p-3 border-t border-[#1a1a1a] bg-[#1a1a1a]/50 text-[#888] text-[9px] font-bold uppercase tracking-[2px] text-center hover:bg-[#222] hover:text-white transition-colors"
        >
          ← Dashboard'a Dön
        </button>
      </div>
    </div>
  );
}

function ToolButton({
  icon,
  active = false,
}: {
  icon: string;
  active?: boolean;
}) {
  return (
    <button
      className={`w-10 h-10 flex items-center justify-center rounded-lg text-lg transition-colors ${
        active
          ? 'bg-[#3b82f6] text-white'
          : 'text-[#555] hover:bg-[#1a1a1a] hover:text-[#888]'
      }`}
    >
      {icon}
    </button>
  );
}
