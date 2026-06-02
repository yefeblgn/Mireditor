import React, { useEffect, useState } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { deserializeDocument } from '../io/gefFormat';
import { BACKEND_URL } from '../../config/api';
import { useAuthStore } from '../../store/useAuthStore';

interface CloudDraft {
  id: number;
  title: string;
  updated_at: string;
  size_bytes: number;
}

function getToken(): string | null {
  return useAuthStore.getState().token;
}

export function CloudDownloadDialog({ onClose, onOpened }: { onClose: () => void; onOpened?: () => void }) {
  const setDocument = useEditorStore((s) => s.setDocument);
  const [drafts, setDrafts] = useState<CloudDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<number | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) { setError('Giriş yapmanız gerekiyor.'); setLoading(false); return; }
    fetch(`${BACKEND_URL}/drafts`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setDrafts(data);
        else setError(data?.message ?? 'Taslaklar yüklenemedi.');
      })
      .catch(() => setError('Sunucuya bağlanılamadı.'))
      .finally(() => setLoading(false));
  }, []);

  const handleOpen = async (draft: CloudDraft) => {
    const token = getToken();
    if (!token) return;
    setDownloading(draft.id);
    try {
      const res = await fetch(`${BACKEND_URL}/drafts/${draft.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data?.data) { setError('Taslak verisi alınamadı.'); return; }
      const doc = await deserializeDocument(data.data);
      setDocument(doc);
      onClose();
      onOpened?.();
    } catch {
      setError('Taslak açılırken hata oluştu.');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-[540px] max-h-[70vh] bg-[#141414] border border-[#252525] rounded-xl shadow-2xl shadow-black/70 overflow-hidden flex flex-col animate-modal-scale">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e1e1e]">
          <div>
            <h2 className="text-white text-sm font-semibold">Buluttan İndir</h2>
            <p className="text-[#555] text-[10px] mt-0.5">Sunucuda kayıtlı taslaklarınız</p>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="flex items-center justify-center py-12 gap-3 text-[#555]">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span className="text-xs">Taslaklar yükleniyor...</span>
            </div>
          )}
          {error && (
            <div className="text-center py-12">
              <p className="text-[#ef4444] text-sm">{error}</p>
              <p className="text-[#555] text-xs mt-2">Backend çalışıyor mu? ({BACKEND_URL})</p>
            </div>
          )}
          {!loading && !error && drafts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-[#555] text-sm">Henüz bulut taslağınız yok.</p>
              <p className="text-[#444] text-xs mt-1">Editörde "Dosya → Buluta Kaydet" ile taslak oluşturabilirsiniz.</p>
            </div>
          )}
          {!loading && !error && drafts.map((d) => (
            <button
              key={d.id}
              onClick={() => handleOpen(d)}
              disabled={downloading === d.id}
              className="w-full flex items-center justify-between px-4 py-3 bg-[#1a1a1a] hover:bg-[#222] border border-[#252525] hover:border-[#3b82f6]/40 rounded-lg mb-2 transition-all group"
            >
              <div className="text-left">
                <p className="text-sm text-white group-hover:text-[#3b82f6] transition-colors font-medium">{d.title}</p>
                <p className="text-[10px] text-[#555] mt-0.5">
                  {new Date(d.updated_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {' · '}
                  {d.size_bytes ? `${Math.round(d.size_bytes / 1024)} KB` : '—'}
                </p>
              </div>
              {downloading === d.id ? (
                <svg className="animate-spin w-4 h-4 text-[#3b82f6]" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" className="opacity-20" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#555] group-hover:text-[#3b82f6] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3v13M7 11l5 5 5-5M3 20h18" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
