import React from 'react';
import { useSettingsStore } from '../../store/useSettingsStore';

interface PluginCardProps {
  icon: React.ReactNode;
  name: string;
  creator: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}

function PluginCard({ icon, name, creator, description, enabled, onToggle }: PluginCardProps) {
  return (
    <div className="bg-[#1a1a1a] border border-[#252525] rounded-xl p-4 flex items-start gap-4">
      <div className="w-10 h-10 rounded-lg bg-[#222] border border-[#2e2e2e] flex items-center justify-center flex-shrink-0 text-lg">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-white text-sm font-semibold">{name}</p>
            <p className="text-[#3b82f6] text-[9px] font-medium uppercase tracking-wider mt-0.5">{creator}</p>
          </div>
          {/* Toggle */}
          <button
            onClick={onToggle}
            className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${enabled ? 'bg-[#3b82f6]' : 'bg-[#333]'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>
        <p className="text-[#666] text-[10px] mt-2 leading-relaxed">{description}</p>
        <div className="mt-2 flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-[#22c55e]' : 'bg-[#444]'}`} />
          <span className={`text-[9px] font-medium ${enabled ? 'text-[#22c55e]' : 'text-[#555]'}`}>
            {enabled ? 'Aktif' : 'Devre Dışı'}
          </span>
        </div>
      </div>
    </div>
  );
}

export function PluginsPanel({ onClose }: { onClose: () => void }) {
  const { discordRpcEnabled, setDiscordRpcEnabled } = useSettingsStore();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[560px] max-h-[80vh] bg-[#141414] border border-[#252525] rounded-xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col animate-modal-scale">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-white text-sm font-semibold">Eklentiler</h2>
            <p className="text-[#555] text-[10px] mt-0.5">Yüklü eklentileri yönetin</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <PluginCard
            icon="🎮"
            name="Discord Rich Presence"
            creator="BLGN Studios"
            description="Discord durumunuzda aktif Mireditor oturumunu gösterir. Açık proje adı, kullanılan araç ve geçen süre gibi bilgiler Discord profilinizde paylaşılır. Discord uygulaması kapalıysa otomatik olarak sessiz kalır."
            enabled={discordRpcEnabled}
            onToggle={() => setDiscordRpcEnabled(!discordRpcEnabled)}
          />

          {/* Gelecek eklentiler için placeholder */}
          <div className="border border-dashed border-[#222] rounded-xl p-5 text-center">
            <p className="text-[#444] text-xs">Daha fazla eklenti yakında</p>
            <p className="text-[#333] text-[10px] mt-1">Eklenti geliştirmek için dökümantasyona bakın</p>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-[#1e1e1e] flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg text-[11px] bg-[#222] text-[#888] hover:text-white hover:bg-[#2a2a2a] transition-colors uppercase tracking-wider">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
