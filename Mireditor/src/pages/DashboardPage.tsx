import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { NewProjectModal } from '../components/editor/Modals';
import { ProjectConfig } from '../store/useEditorStore';

const API_URL = 'https://manici.yefeblgn.net/mireditor/api';

const ipcRenderer = typeof window !== 'undefined' && (window as any).require
  ? (window as any).require('electron').ipcRenderer
  : null;

interface DashboardPageProps {
  onOpenEditor: (config?: ProjectConfig, filePath?: string) => void;
}

interface ProjectItem {
  id: number;
  title: string;
  file_path: string;
  file_size_kb: number;
  last_modified: string;
  is_cloud_synced: boolean;
}

interface LocalDraft {
  fileName: string;
  filePath: string;
  title: string;
  lastModified: string;
  sizeKB: number;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ─── SVG Icons ───
const Icons = {
  newFile: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  ),
  folder: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
    </svg>
  ),
  template: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  cloud: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9.75v6.75m0 0l-3-3m3 3l3-3m-8.25 6a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
    </svg>
  ),
  book: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  video: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
    </svg>
  ),
  settings: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  user: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  logout: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  close: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

// ─── Settings Modal ───
function SettingsModal({ onClose }: { onClose: () => void }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[520px] max-h-[70vh] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold tracking-wide">Ayarlar</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>
        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[55vh]">
          <SettingGroup title="Görünüm">
            <SettingRow label="Tema" value="Koyu" />
            <SettingRow label="Dil" value="Türkçe" />
            <SettingRow label="Font Boyutu" value="14px" />
          </SettingGroup>
          <SettingGroup title="Dışa Aktarma">
            <SettingRow label="Varsayılan Format" value="PNG" />
            <SettingRow label="Kalite" value="Yüksek" />
          </SettingGroup>
          <SettingGroup title="Gelişmiş">
            <SettingRow label="GPU Hızlandırma" value="Açık" />
            <SettingRow label="Otomatik Kayıt" value="30 saniye" />
          </SettingGroup>
        </div>
      </div>
    </div>
  );
}

function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[#666] text-[10px] font-bold uppercase tracking-[2px] mb-3">{title}</h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
      <span className="text-[#ccc] text-xs">{label}</span>
      <span className="text-[#555] text-xs">{value}</span>
    </div>
  );
}

// ─── Profile Modal ───
function ProfileModal({ onClose, user }: { onClose: () => void; user: any }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-modal-in">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-[420px] bg-[#151515] border border-[#252525] rounded-xl shadow-2xl shadow-black/60 overflow-hidden animate-modal-scale">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222]">
          <h2 className="text-white text-sm font-semibold tracking-wide">Profil</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">{Icons.close}</button>
        </div>
        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-xl font-bold uppercase">
              {user?.username?.[0] ?? 'U'}
            </div>
            <div>
              <p className="text-white text-sm font-semibold">{user?.username ?? 'Kullanıcı'}</p>
              <p className="text-[#555] text-xs mt-0.5">{user?.email ?? 'email@mireditor.com'}</p>
              <p className="text-[#3b82f6] text-[10px] mt-1 font-medium uppercase tracking-wider">
                {user?.role === 'poweruser' ? 'Power User' : 'Standart Kullanıcı'}
              </p>
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Hesap Oluşturma</span>
              <span className="text-[#555] text-xs">Mart 2026</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Toplam Proje</span>
              <span className="text-[#555] text-xs">0</span>
            </div>
            <div className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              <span className="text-[#ccc] text-xs">Kullanılan Alan</span>
              <span className="text-[#555] text-xs">0 MB</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───
export function DashboardPage({ onOpenEditor }: DashboardPageProps) {
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [localDrafts, setLocalDrafts] = useState<LocalDraft[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside → menü kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [menuOpen]);

  // Fetch local drafts
  const fetchLocalDrafts = async () => {
    if (!ipcRenderer) { setLoadingLocal(false); return; }
    setLoadingLocal(true);
    try {
      const drafts = await ipcRenderer.invoke('list-local-drafts');
      setLocalDrafts(drafts || []);
    } catch (err) {
      console.error('Local drafts error:', err);
      setLocalDrafts([]);
    } finally {
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    fetchLocalDrafts();
  }, []);

  // API'den projeleri çek
  useEffect(() => {
    const fetchDrafts = async () => {
      setLoadingProjects(true);
      try {
        const userId = user?.id ?? 1;
        const res = await axios.get(`${API_URL}/drafts/${userId}`);
        setProjects(res.data.drafts || []);
      } catch (err) {
        console.error('Drafts fetch error:', err);
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchDrafts();
  }, [user?.id]);

  // Open a .gef file — reads it and extracts config, passes filePath to editor
  const handleOpenFile = async () => {
    if (!ipcRenderer) { onOpenEditor(); return; }
    const filePath = await ipcRenderer.invoke('open-file-dialog');
    if (!filePath) return;
    try {
      const raw = await ipcRenderer.invoke('read-file', { filePath });
      if (!raw) { onOpenEditor(undefined, filePath); return; }
      const draft = JSON.parse(raw);
      const config: ProjectConfig = {
        title: draft.title || 'Untitled',
        width: draft.width || 1920,
        height: draft.height || 1080,
        backgroundColor: draft.canvas?.background || '#ffffff',
      };
      onOpenEditor(config, filePath);
    } catch {
      onOpenEditor(undefined, filePath);
    }
  };

  // Open a local draft by path
  const handleOpenLocalDraft = async (filePath: string) => {
    if (!ipcRenderer) return;
    try {
      const raw = await ipcRenderer.invoke('read-file', { filePath });
      if (!raw) return;
      const draft = JSON.parse(raw);
      const config: ProjectConfig = {
        title: draft.title || 'Untitled',
        width: draft.width || 1920,
        height: draft.height || 1080,
        backgroundColor: draft.canvas?.background || '#ffffff',
      };
      onOpenEditor(config, filePath);
    } catch (err) {
      console.error('Open draft error:', err);
    }
  };

  // Delete a local draft
  const handleDeleteDraft = async (filePath: string) => {
    if (!ipcRenderer) return;
    await ipcRenderer.invoke('delete-local-draft', { filePath });
    fetchLocalDrafts();
  };

  const filteredLocal = localDrafts.filter(d =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProjects = projects.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full h-full flex bg-[#0f0f0f] select-none">
      {/* Modals */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} user={user} />}
      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={(config) => {
            setShowNewProject(false);
            onOpenEditor(config);
          }}
        />
      )}

      {/* LEFT SIDE - Son Projeler */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mini header */}
        <div className="h-10 flex items-center justify-between px-6 flex-shrink-0">
          <h2 className="text-[#ccc] text-xs font-semibold">Hoş Geldiniz</h2>

          {/* User dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-all duration-200"
            >
              <div className="w-6 h-6 rounded-full bg-[#3b82f6] flex items-center justify-center text-white text-[10px] font-bold uppercase">
                {user?.username?.[0] ?? 'U'}
              </div>
              <span className="text-[#999] text-xs font-medium">{user?.username ?? 'Kullanıcı'}</span>
              <svg
                className={`w-3 h-3 text-[#555] transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Animated dropdown */}
            <div className={`absolute right-0 top-10 w-48 bg-[#181818] border border-[#2a2a2a] rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden transition-all duration-200 origin-top-right ${menuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}>
              <div className="px-4 py-3">
                <p className="text-white text-xs font-semibold">{user?.username ?? 'Kullanıcı'}</p>
                <p className="text-[#555] text-[10px] mt-0.5">
                  {user?.role === 'poweruser' ? 'Power User' : 'Standart'}
                </p>
              </div>
              <div className="px-1.5 pb-1.5">
                <button
                  onClick={() => { setMenuOpen(false); setShowSettings(true); }}
                  className="w-full text-left px-3 py-2 text-[#aaa] text-xs hover:bg-[#222] hover:text-white transition-colors rounded-lg flex items-center gap-2.5"
                >
                  {Icons.settings} Ayarlar
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowProfile(true); }}
                  className="w-full text-left px-3 py-2 text-[#aaa] text-xs hover:bg-[#222] hover:text-white transition-colors rounded-lg flex items-center gap-2.5"
                >
                  {Icons.user} Profil
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="w-full text-left px-3 py-2 text-red-400 text-xs hover:bg-red-900/20 transition-colors rounded-lg flex items-center gap-2.5"
                >
                  {Icons.logout} Oturumu Kapat
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 px-8 pb-8 overflow-y-auto">
          <p className="text-[#444] text-xs mb-6">Bir proje açın veya yeni bir tane oluşturun.</p>

          {/* Search */}
          <div className="mb-4">
            <input
              type="text"
              placeholder="Projelerde ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md bg-[#141414] border border-[#222] rounded-lg px-4 py-2.5 text-white text-sm placeholder-[#444] outline-none focus:border-[#3b82f6] transition-colors"
            />
          </div>

          {/* Tabs: Local / Cloud */}
          <div className="flex gap-1 mb-4 border-b border-[#222]">
            <button
              onClick={() => setActiveTab('local')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'local'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-[#666] border-transparent hover:text-[#aaa]'
              }`}
            >
              💾 Yerel Taslaklar {!loadingLocal && `(${filteredLocal.length})`}
            </button>
            <button
              onClick={() => setActiveTab('cloud')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'cloud'
                  ? 'text-blue-400 border-blue-400'
                  : 'text-[#666] border-transparent hover:text-[#aaa]'
              }`}
            >
              ☁ Bulut Projeleri {!loadingProjects && `(${filteredProjects.length})`}
            </button>
          </div>

          {/* Local drafts list */}
          {activeTab === 'local' && (
            <div className="space-y-1">
              {loadingLocal ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-40 bg-[#1a1a1a] rounded mb-2" />
                      <div className="h-2 w-56 bg-[#141414] rounded" />
                    </div>
                  </div>
                ))
              ) : filteredLocal.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#444] text-sm">{searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz yerel taslak yok.'}</p>
                  <p className="text-[#333] text-[10px] mt-1">Editörde Ctrl+S ile kaydedin, otomatik olarak burada görünür.</p>
                </div>
              ) : (
                filteredLocal.map((draft) => (
                  <div
                    key={draft.filePath}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-[#161616] transition-colors group text-left"
                  >
                    <button
                      onClick={() => handleOpenLocalDraft(draft.filePath)}
                      className="flex-1 flex items-center gap-4 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold bg-gradient-to-br from-[#3b82f6] to-[#6366f1]">
                        {draft.title[0]?.toUpperCase() || 'M'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[#ddd] text-sm font-medium group-hover:text-white transition-colors truncate">{draft.title}</p>
                        <p className="text-[#444] text-[10px] truncate">{draft.fileName} · {draft.sizeKB} KB</p>
                      </div>
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="text-[#444] text-[10px]">{formatDate(draft.lastModified)}</span>
                        <span className="text-[#333] text-[9px]">Yerel</span>
                      </div>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteDraft(draft.filePath); }}
                      className="p-1.5 text-[#444] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Sil"
                    >
                      {Icons.close}
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Cloud projects list */}
          {activeTab === 'cloud' && (
            <div className="space-y-1">
              {loadingProjects ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg animate-pulse">
                    <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex-shrink-0" />
                    <div className="flex-1">
                      <div className="h-3 w-40 bg-[#1a1a1a] rounded mb-2" />
                      <div className="h-2 w-56 bg-[#141414] rounded" />
                    </div>
                  </div>
                ))
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[#444] text-sm">{searchQuery ? 'Arama sonucu bulunamadı.' : 'Henüz bulut projesi yok.'}</p>
                  <p className="text-[#333] text-[10px] mt-1">Editörde Dosya → Buluta Kaydet ile yükleyin.</p>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => onOpenEditor({ title: project.title, width: 1920, height: 1080, backgroundColor: '#ffffff' })}
                    className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-[#161616] transition-colors group text-left"
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-sm font-bold bg-[#3b82f6]">
                      {project.title[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#ddd] text-sm font-medium group-hover:text-white transition-colors truncate">{project.title}</p>
                      <p className="text-[#444] text-[10px] truncate">{project.file_path}</p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <span className="text-[#444] text-[10px]">{formatDate(project.last_modified)}</span>
                      {project.is_cloud_synced && <span className="text-blue-400 text-[9px]">☁ Synced</span>}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE - Actions */}
      <div className="w-64 bg-[#111] p-5 flex flex-col overflow-y-auto">
        <p className="text-[#666] text-[10px] font-bold uppercase tracking-[2px] mb-4">Başlangıç</p>

        <div className="space-y-1.5">
          <SideButton icon={Icons.newFile} label="Yeni Proje" desc="Boş bir canvas oluştur" primary onClick={() => setShowNewProject(true)} />
          <SideButton icon={Icons.folder} label="Proje Aç" desc="Diskten .gef dosyası aç" onClick={handleOpenFile} />
          <SideButton icon={Icons.template} label="Şablondan Oluştur" desc="Hazır şablonlardan başla" onClick={() => {}} />
          <SideButton icon={Icons.cloud} label="Buluttan İndir" desc="Cloud projelerini senkronla" onClick={() => {}} />
        </div>

        <p className="text-[#666] text-[10px] font-bold uppercase tracking-[2px] mt-6 mb-4">Öğren</p>

        <div className="space-y-1.5">
          <SideButton icon={Icons.book} label="Dökümantasyon" desc="Kullanım kılavuzu" onClick={() => {}} />
          <SideButton icon={Icons.video} label="Eğitim Videoları" desc="Adım adım dersler" onClick={() => {}} />
        </div>

        <div className="mt-auto pt-6">
          <div className="text-[#2a2a2a] text-[9px] uppercase tracking-[2px]">
            <p>Mireditor v0.0.4</p>
            <p className="mt-0.5">Build 20260305</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Side Button ───
function SideButton({ icon, label, desc, primary = false, onClick }: {
  icon: React.ReactNode; label: string; desc: string; primary?: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg transition-all duration-200 flex items-center gap-3 group ${
        primary
          ? 'bg-[#3b82f6]/10 border border-[#3b82f6]/20 hover:bg-[#3b82f6]/20 hover:border-[#3b82f6]/40'
          : 'hover:bg-[#1a1a1a] border border-transparent'
      }`}
    >
      <span className={`flex-shrink-0 ${primary ? 'text-blue-400' : 'text-[#555] group-hover:text-[#888]'} transition-colors`}>
        {icon}
      </span>
      <div>
        <p className={`text-sm font-medium ${primary ? 'text-blue-400' : 'text-[#ccc] group-hover:text-white'} transition-colors`}>{label}</p>
        <p className="text-[#444] text-[10px] mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
