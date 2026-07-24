import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axiosClient';

const C = {
  primary: '#1F6F4A',
  amber:   '#E8A33D',
  text:    '#1A1A1A',
  muted:   '#6B7280',
  border:  '#E5E7EB',
  danger:  '#B3261E',
};

const DISPUTE_REASONS = [
  { key: 'wrong_weight',   labelKey: 'reasonWrongWeight' },
  { key: 'wrong_category', labelKey: 'reasonWrongCategory' },
  { key: 'no_show',        labelKey: 'reasonNoShow' },
  { key: 'payment_issue',  labelKey: 'reasonPaymentIssue' },
  { key: 'other',          labelKey: 'reasonOther' },
];

const css = `
  .dm-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    padding: 16px;
  }
  .dm-modal {
    background: #fff; border-radius: 16px;
    width: 100%; max-width: 440px;
    max-height: 90vh; overflow-y: auto;
    padding: 22px 22px 20px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.22);
    font-family: Inter, system-ui, -apple-system, sans-serif;
    color: ${C.text};
  }
  .dm-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 6px;
  }
  .dm-title { font-size: 16px; font-weight: 700; margin: 0; }
  .dm-close {
    background: none; border: none; font-size: 16px; cursor: pointer;
    color: ${C.muted}; padding: 4px; line-height: 1; font-family: inherit;
  }
  .dm-sub {
    margin: 0 0 16px; font-size: 13px; color: ${C.muted}; line-height: 1.5;
  }
  .dm-label {
    display: block; font-size: 13px; font-weight: 700;
    margin: 0 0 8px; color: ${C.text};
  }
  .dm-section { margin-bottom: 18px; }
  .dm-select {
    width: 100%; padding: 10px 12px; border: 1.5px solid ${C.border};
    border-radius: 10px; font-size: 14px; font-family: inherit;
    outline: none; background: #fff; color: ${C.text}; box-sizing: border-box;
    cursor: pointer;
  }
  .dm-select:focus { border-color: ${C.primary}; }
  .dm-details {
    width: 100%; padding: 10px 12px; border: 1.5px solid ${C.border};
    border-radius: 10px; font-size: 13px; font-family: inherit;
    outline: none; background: #FAFAFA; resize: vertical; box-sizing: border-box;
    color: ${C.text};
  }
  .dm-details:focus { border-color: ${C.primary}; background: #fff; }
  .dm-optional { font-weight: 400; color: ${C.muted}; font-size: 12px; }
  .dm-error {
    background: #FDECEA; color: ${C.danger}; border-radius: 10px;
    padding: 10px 14px; font-size: 13px; margin-bottom: 12px;
  }
  .dm-warn {
    background: #FBF3E4; border: 1px solid ${C.amber}; color: #8A5A14;
    border-radius: 10px; padding: 10px 14px; font-size: 12px;
    margin-bottom: 16px; line-height: 1.5;
  }
  .dm-actions { display: flex; gap: 10px; margin-top: 4px; }
  .dm-btn {
    flex: 1; padding: 12px; border-radius: 10px; font-size: 14px;
    font-weight: 700; cursor: pointer; font-family: inherit;
    transition: background 0.15s, opacity 0.15s;
  }
  .dm-btn-cancel {
    background: #fff; border: 1.5px solid ${C.border}; color: ${C.text};
  }
  .dm-btn-cancel:hover { background: #F3F4F6; }
  .dm-btn-submit {
    background: ${C.amber}; border: none; color: #fff;
  }
  .dm-btn-submit:hover:not(:disabled) { background: #CE8C2B; }
  .dm-btn-submit:disabled { opacity: 0.55; cursor: not-allowed; }
`;

/**
 * Modal for raising a dispute on a matched/confirmed waste log.
 * Used by both parties: the collector (Buyer Matches page) and the buyer
 * (Transactions tab). POSTs to /waste-logs/:id/dispute; the server enforces
 * party membership and the disputable statuses.
 */
export default function DisputeModal({ logId, context, onClose, onDisputed }) {
  const { t } = useTranslation();
  const [reason, setReason]         = useState('');
  const [details, setDetails]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    if (!reason) {
      setError(t('disputeModal.reasonRequired'));
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post(`/waste-logs/${logId}/dispute`, {
        reason,
        details: details.trim() || undefined,
      });
      onDisputed(res.data.log);
    } catch (err) {
      setError(err.response?.data?.error || t('disputeModal.submitFailed'));
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="dm-overlay" onClick={onClose}>
        <div className="dm-modal" onClick={e => e.stopPropagation()}>
          <div className="dm-header">
            <p className="dm-title">{t('disputeModal.title')}</p>
            <button className="dm-close" onClick={onClose}>✕</button>
          </div>
          {context && <p className="dm-sub">{context}</p>}

          <div className="dm-warn">
            {t('disputeModal.warning')}
          </div>

          {error && <div className="dm-error">{error}</div>}

          <div className="dm-section">
            <span className="dm-label">{t('disputeModal.reasonLabel')}</span>
            <select
              className="dm-select"
              value={reason}
              onChange={e => setReason(e.target.value)}
            >
              <option value="" disabled>{t('disputeModal.reasonPlaceholder')}</option>
              {DISPUTE_REASONS.map(r => (
                <option key={r.key} value={r.key}>{t(`disputeModal.${r.labelKey}`)}</option>
              ))}
            </select>
          </div>

          <div className="dm-section">
            <span className="dm-label">
              {t('disputeModal.detailsLabel')} <span className="dm-optional">({t('common.optional')})</span>
            </span>
            <textarea
              className="dm-details"
              rows={3}
              value={details}
              onChange={e => setDetails(e.target.value)}
              placeholder={t('disputeModal.detailsPlaceholder')}
            />
          </div>

          <div className="dm-actions">
            <button className="dm-btn dm-btn-cancel" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
            <button
              className="dm-btn dm-btn-submit"
              onClick={handleSubmit}
              disabled={submitting || !reason}
            >
              {submitting ? t('disputeModal.submitting') : t('disputeModal.submitButton')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
