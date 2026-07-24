import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'sw', label: 'KISW' },
  { code: 'sheng', label: 'Sheng' },
];

const css = `
  .wm-lang-picker {
    display: flex; gap: 4px; padding: 3px;
    background: rgba(255,255,255,0.1); border-radius: 10px;
  }
  .wm-lang-btn {
    padding: 5px 9px; border-radius: 7px; border: none;
    background: transparent; color: rgba(255,255,255,0.65);
    font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.15s, color 0.15s;
  }
  .wm-lang-btn:hover { color: #fff; }
  .wm-lang-btn.active { background: rgba(255,255,255,0.22); color: #fff; }
`;

/** Language switcher for English / Swahili / Sheng, persisted via i18next-browser-languagedetector. */
export default function LanguagePicker() {
  const { i18n } = useTranslation();

  return (
    <div className="wm-lang-picker">
      <style>{css}</style>
      {LANGUAGES.map(lang => (
        <button
          key={lang.code}
          type="button"
          className={`wm-lang-btn${i18n.resolvedLanguage === lang.code ? ' active' : ''}`}
          onClick={() => i18n.changeLanguage(lang.code)}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
