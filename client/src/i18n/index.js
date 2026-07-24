import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en/translation.json';
import sw from './locales/sw/translation.json';
import sheng from './locales/sheng/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      sw: { translation: sw },
      sheng: { translation: sheng },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'sw', 'sheng'],
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'wm-lang',
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
