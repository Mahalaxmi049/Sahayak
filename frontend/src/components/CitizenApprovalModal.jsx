import React, { useState } from 'react';
import { Lock, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { T, actionKey, ACTION_EXPLANATIONS } from '../i18n';
import { resolveStepUp } from '../api';

export default function CitizenApprovalModal({
  lang,
  stepUp,
  helperName = 'Ravi Kumar',
  citizenName = 'Savitri Devi',
  serviceName = 'Welfare & Pensions',
  onClose,
  onResolved,
}) {
  const t = T[lang] || T.en;

  const [resolving, setResolving] = useState(false);
  const [decisionResult, setDecisionResult] = useState(null); // 'approved' | 'denied'

  const actionCode = stepUp?.action || 'change_bank_account';
  const actionLabel = t[actionKey[actionCode]] || actionCode.replace(/_/g, ' ');

  const explanation = ACTION_EXPLANATIONS[actionCode] || {
    why: 'Sensitive actions require explicit citizen confirmation to prevent unauthorized modifications.',
    impact: 'This action updates important records on your public service account.',
  };

  const handleDecision = async (decision) => {
    if (!stepUp?.id) return;
    setResolving(true);
    try {
      await resolveStepUp(stepUp.id, decision, 'button');
      setDecisionResult(decision);
      onResolved?.(decision);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="approval-overlay" role="dialog" aria-modal="true" aria-labelledby="approval-title">
      <div className="approval-modal">
        {/* Top Security Badge */}
        <div className="approval-badge-top">
          <Lock size={12} />
          <span>{t.approvalNeeded || 'Approval needed'}</span>
        </div>

        <h3 id="approval-title" className="approval-headline">
          {t.approvalHeadline || 'Approval required'}
        </h3>

        {/* Clear statement of who is requesting, what is requested, and affected citizen */}
        <p className="approval-context-text">
          <strong>{helperName}</strong> is requesting permission to perform a sensitive action for <strong>{citizenName}</strong> in <strong>{serviceName}</strong>.
        </p>

        {/* Action & Impact Box */}
        <div className="approval-action-box">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span className="wants-label">Requested action:</span>
            <span className="sensitive-tag-text">{t.sensitiveActionTag || 'Sensitive action'}</span>
          </div>

          <div className="action-title-large">{actionLabel}</div>

          <div className="approval-explanation-block">
            <div className="explanation-item">
              <span className="explanation-label">{t.whyApprovalNeededLabel || 'Why approval is needed:'}</span>
              <span className="explanation-text">{explanation.why}</span>
            </div>
            <div className="explanation-item" style={{ marginTop: 6 }}>
              <span className="explanation-label">{t.potentialImpactLabel || 'Impact:'}</span>
              <span className="explanation-text">{explanation.impact}</span>
            </div>
          </div>
        </div>

        {/* Decision result feedback (if already decided) */}
        {decisionResult ? (
          <div
            className="panel"
            style={{
              backgroundColor: decisionResult === 'approved' ? 'var(--color-primary-light)' : 'var(--color-danger-bg)',
              borderColor: decisionResult === 'approved' ? 'var(--color-primary-border)' : 'var(--color-danger-border)',
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <strong
              style={{
                color: decisionResult === 'approved' ? 'var(--color-primary-dark)' : 'var(--color-danger)',
                fontSize: '1rem',
              }}
            >
              {decisionResult === 'approved' ? '✓ Permission granted' : '✕ Request denied'}
            </strong>
            <p style={{ fontSize: '0.84rem', marginTop: 4, color: 'var(--text-muted)' }}>
              {decisionResult === 'approved'
                ? `${helperName} has been authorized to complete this action.`
                : 'The action was blocked and the helper was notified.'}
            </p>
          </div>
        ) : (
          /* Decision Action Buttons */
          <div className="approval-choices-row">
            <button
              type="button"
              className="btn btn-outline-danger"
              onClick={() => handleDecision('deny')}
              disabled={resolving}
            >
              <X size={16} />
              <span>{t.denyBtn || 'Deny'}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleDecision('approve')}
              disabled={resolving}
            >
              {resolving ? <Loader2 size={16} className="spin-icon" /> : <Check size={16} />}
              <span>{t.approveBtn || 'Approve'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
