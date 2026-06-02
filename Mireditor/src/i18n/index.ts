import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from './locales/tr';
import en from './locales/en';
import de from './locales/de';
import ru from './locales/ru';
import ja from './locales/ja';
import zh from './locales/zh';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      en: { translation: en },
      de: { translation: de },
      ru: { translation: ru },
      ja: { translation: ja },
      zh: { translation: zh },
    },
    lng: 'tr',
    fallbackLng: 'tr',
    interpolation: { escapeValue: false },
  });

export default i18n;

/** Dili değiştir ve DOM'a uygula */
export function changeLanguage(lang: string) {
  i18n.changeLanguage(lang);
}
