import type { AISettings } from './types';

const KEY = 'mireditor-ai-settings';

export const DEFAULT_AI_SETTINGS: AISettings = {
  provider: 'openrouter',
  apiKey: '',
  imageModel: 'google/gemini-2.5-flash-image-preview',
};

// OpenRouter üzerinde görüntü üretebilen örnek modeller (kullanıcı değiştirebilir).
export const SUGGESTED_IMAGE_MODELS = [
  'google/gemini-2.5-flash-image-preview',
  'openai/gpt-4o-mini',
  'google/gemini-2.0-flash-exp:free',
];

export function loadAISettings(): AISettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_AI_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* yok say */
  }
  return { ...DEFAULT_AI_SETTINGS };
}

export function saveAISettings(s: AISettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* yok say */
  }
}

export function hasApiKey(): boolean {
  return loadAISettings().apiKey.trim().length > 0;
}
