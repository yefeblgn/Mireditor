// ─── Merkezi API Yapılandırması ───
// Tüm backend ve dış servis URL'leri buradan yönetilir.
// Geliştirme/prod geçişi için Mireditor/.env ve .env.production dosyalarını düzenle.

// ─── Backend ───
export const BACKEND_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';

export const API = {
  auth: {
    login:    `${BACKEND_URL}/auth/login`,
    register: `${BACKEND_URL}/auth/register`,
  },
  drafts: {
    save: `${BACKEND_URL}/drafts/save`,
  },
  health: `${BACKEND_URL}/health`,
} as const;

// ─── OpenRouter (AI) ───
export const OPENROUTER = {
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  referer:  'https://mireditor.app',
  title:    'Mireditor',
} as const;
