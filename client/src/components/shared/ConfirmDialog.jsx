import { C } from './theme';

const css = `
  .cd-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .cd-modal {
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 420px;
    padding: 22px 22px 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.22);
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
  }
  .cd-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .cd-title { font-size: 16px; font-weight: 700; margin: 0; }
  .cd-close {
    background: none; border: none; font-size: 16px; cursor: pointer;
    color: ${C.muted}; padding: 4px; line-height: 1; font-family: inherit;
  }
  .cd-message { margin: 0 0 16px; font-size: 13px; color: ${C.muted}; line-height: 1.5; }
  .cd-warn {
    background: ${C.warnBg}; border: 1px solid ${C.accent}; color: ${C.warnText};
    border-radius: 10px; padding: 10px 14px; font-size: 12px;
    margin-bottom: 16px; line-height: 1.5;
  }
  .cd-assure {
    background: ${C.successBg}; border: 1px solid ${C.primary}; color: ${C.primaryDark};
    border-radius: 10px; padding: 10px 14px; font-size: 12px;
    margin-bottom: 16px; line-height: 1.5;
  }
  .cd-actions { display: flex; gap: 10px; margin-top: 4px; }
  .cd-btn {
    flex: 1; padding: 12px; border-radius: 10px; font-size: 14px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.15s, opacity 0.15s;
  }
  .cd-btn-cancel { background: #fff; border: 1.5px solid ${C.border}; color: ${C.text}; }
  .cd-btn-cancel:hover { background: #F3F4F6; }
  .cd-btn-confirm-warning { background: ${C.danger}; border: none; color: #fff; }
  .cd-btn-confirm-warning:hover:not(:disabled) { background: #93201A; }
  .cd-btn-confirm-assuring { background: ${C.primary}; border: none; color: #fff; }
  .cd-btn-confirm-assuring:hover:not(:disabled) { background: ${C.primaryDark}; }
  .cd-btn:disabled { opacity: 0.55; cursor: not-allowed; }
`;

/**
 * Shared confirmation modal replacing window.confirm()/confirm() call sites.
 * tone="warning" is for destructive/consequential actions (delete, etc.) and
 * shows an amber advisory block; tone="assuring" is for safe confirmations.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  tone = 'warning',
  advisory,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  confirming = false,
}) {
  if (!open) return null;

  return (
    <>
      <style>{css}</style>
      <div className="cd-overlay" onClick={onCancel}>
        <div className="cd-modal" onClick={e => e.stopPropagation()}>
          <div className="cd-header">
            <p className="cd-title">{title}</p>
            <button className="cd-close" onClick={onCancel}>✕</button>
          </div>

          {message && <p className="cd-message">{message}</p>}

          {advisory && (
            <div className={tone === 'warning' ? 'cd-warn' : 'cd-assure'}>
              {advisory}
            </div>
          )}

          <div className="cd-actions">
            <button className="cd-btn cd-btn-cancel" onClick={onCancel} disabled={confirming}>
              {cancelLabel}
            </button>
            <button
              className={`cd-btn cd-btn-confirm-${tone}`}
              onClick={onConfirm}
              disabled={confirming}
            >
              {confirming ? 'Please wait…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
