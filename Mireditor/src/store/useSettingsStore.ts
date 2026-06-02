import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n';

export type Theme = 'dark' | 'light';
export type FontSize = 12 | 14 | 16;
export type Language = 'tr' | 'en' | 'de' | 'ru' | 'ja' | 'zh';
export type AutoSaveInterval = 0 | 30 | 60 | 120;
export type ExportFormat = 'png' | 'jpeg' | 'webp';

export interface Settings {
  theme: Theme;
  fontSize: FontSize;
  language: Language;
  discordRpcEnabled: boolean;
  autoSaveInterval: AutoSaveInterval;
  defaultExportFormat: ExportFormat;
}

interface SettingsState extends Settings {
  setTheme: (theme: Theme) => void;
  setFontSize: (size: FontSize) => void;
  setLanguage: (lang: Language) => void;
  setDiscordRpcEnabled: (enabled: boolean) => void;
  setAutoSaveInterval: (interval: AutoSaveInterval) => void;
  setDefaultExportFormat: (format: ExportFormat) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      fontSize: 14,
      language: 'tr',
      discordRpcEnabled: true,
      autoSaveInterval: 30,
      defaultExportFormat: 'png',

      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
      setFontSize: (fontSize) => {
        set({ fontSize });
        applyFontSize(fontSize);
      },
      setLanguage: (language) => {
        set({ language });
        applyFont(language);
        i18n.changeLanguage(language);
      },
      setDiscordRpcEnabled: (discordRpcEnabled) => set({ discordRpcEnabled }),
      setAutoSaveInterval: (autoSaveInterval) => set({ autoSaveInterval }),
      setDefaultExportFormat: (defaultExportFormat) => set({ defaultExportFormat }),
    }),
    { name: 'mireditor-settings' }
  )
);

// ─── DOM uygulayıcılar ─────────────────────────────────────────────────────

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = `${size}px`;
}

export function applyFont(lang: Language) {
  const fontMap: Partial<Record<Language, string>> = {
    ja: 'noto-jp',
    zh: 'noto-sc',
  };
  const font = fontMap[lang];
  document.documentElement.removeAttribute('data-font');
  if (font) document.documentElement.setAttribute('data-font', font);
}

/** Uygulama başlarken kayıtlı ayarları DOM'a yansıt */
export function initSettings() {
  const s = useSettingsStore.getState();
  applyTheme(s.theme);
  applyFontSize(s.fontSize);
  applyFont(s.language);
  i18n.changeLanguage(s.language).catch(() => {});
}
