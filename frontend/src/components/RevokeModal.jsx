import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { T } from '../i18n';
import { revokePass } from '../api';

export default function RevokeModal({
  lang,
  passId,
  helperName = 'Ravi Kumar',
  onClose,
  onRevoked,
}) {
  const t = T[lang] || T.en;
  const [revoking, setRevoking] = useState(false);

  const handleConfirmRevoke = async () => {
    if (!passId) return;
    setRevoking(true);
    try {
      await revokePass(passId);
      onRevoked();
      onClose();
    } catch {
      // ignore
    } finally {
      setRevoking(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 420 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'var(--color-danger-bg)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)' }}>
              {t.stopAccessForHelper ? t.stopAccessForHelper.replace('{name}', helperName) : `Stop access for ${helperName}?`}
            </h3>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {t.helperWillNoLongerBeAbleToAct ? t.helperWillNoLongerBeAbleToAct.replace('{name}', helperName) : `${helperName} will no longer be able to perform tasks for you.`}
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={revoking}
          >
            {t.keepAccessBtn || 'Keep access'}
          </button>

          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1 }}
            onClick={handleConfirmRevoke}
            disabled={revoking}
          >
            {revoking ? <Loader2 size={16} className="spin-icon" /> : null}
            <span>{t.revokeAccessBtn || 'Revoke access'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
