import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { C } from './theme';

const ToastContext = createContext(null);

const TONE_STYLE = {
  success: { bg: C.successBg, color: C.primary,   border: C.primary },
  error:   { bg: C.dangerBg,  color: C.danger,    border: C.danger },
  warning: { bg: C.warnBg,    color: C.warnText,  border: C.accent },
  info:    { bg: '#EAF2FE',   color: '#1D4ED8',   border: '#93C5FD' },
};

const AUTO_DISMISS_MS = { success: 4000, info: 4000, warning: 8000, error: 8000 };

const css = `
  .wm-toast-stack {
    position: fixed; top: 18px; right: 18px; z-index: 700;
    display: flex; flex-direction: column; gap: 10px;
    max-width: min(360px, calc(100vw - 36px));
  }
  .wm-toast {
    display: flex; align-items: flex-start; gap: 10px;
    padding: 12px 14px; border-radius: 10px; border: 1px solid;
    font-family: Inter, system-ui, -apple-system, sans-serif;
    font-size: 13px; line-height: 1.5; box-shadow: 0 8px 24px rgba(0,0,0,0.14);
    animation: wm-toast-in 0.15s ease-out;
  }
  @keyframes wm-toast-in {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .wm-toast-msg { flex: 1; }
  .wm-toast-close {
    background: none; border: none; cursor: pointer; padding: 0;
    font-size: 14px; line-height: 1; color: inherit; opacity: 0.6;
    font-family: inherit;
  }
  .wm-toast-close:hover { opacity: 1; }
  @media (max-width: 480px) {
    .wm-toast-stack { left: 18px; right: 18px; max-width: none; }
  }
`;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((message, { tone = 'info', duration } = {}) => {
    const id = ++nextId.current;
    setToasts(prev => [...prev, { id, message, tone }]);
    const ms = duration ?? AUTO_DISMISS_MS[tone] ?? 4000;
    setTimeout(() => dismiss(id), ms);
    return id;
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <style>{css}</style>
      <div className="wm-toast-stack">
        {toasts.map(t => {
          const s = TONE_STYLE[t.tone] || TONE_STYLE.info;
          return (
            <div
              key={t.id}
              className="wm-toast"
              style={{ background: s.bg, color: s.color, borderColor: s.border }}
            >
              <span className="wm-toast-msg">{t.message}</span>
              <button className="wm-toast-close" onClick={() => dismiss(t.id)}>✕</button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook is the standard pairing
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
