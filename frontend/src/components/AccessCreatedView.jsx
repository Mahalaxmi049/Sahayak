import React, { useState, useEffect } from 'react';
import { Check, Clock, ShieldCheck, ArrowRight, XCircle } from 'lucide-react';
import { T, actionKey } from '../i18n';
import { asUTC, revokePass } from '../api';

export default function AccessCreatedView({
  lang,
  pass,
  onContinueHome,
  onRevokeAccess,
  onSwitchToHelper,
}) {
  const t = T[lang] || T.en;

  const helperName = pass?.helper_name || 'Ravi Kumar';
  const serviceName = pass?.service_name || t.srvWelfarePensions || 'Welfare & Pensions';
  const allowedActions = pass?.allowed_actions || [
    'view_pension_status',
    'download_pension_certificate',
    'change_bank_account',
  ];

  /* ── Live Countdown ── */
  const [countdown, setCountdown] = useState('29:59');

  useEffect(() => {
    if (!pass?.expires_at) return;

    const tick = () => {
      const expires = asUTC(pass.expires_at).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setCountdown('00:00');
        return;
      }

      const totalSec = Math.floor(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setCountdown(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pass]);

  const SENSITIVE_ACTIONS = [
    'change_bank_account',
    'update_mobile_number',
    'modify_certificate_details',
    'update_disbursement_bank',
    'modify_student_profile',
    'link_new_beneficiary',
    'modify_citizen_information',
  ];

  const lowRiskList = allowedActions.filter((a) => !SENSITIVE_ACTIONS.includes(a));
  const hasSensitive = allowedActions.some((a) => SENSITIVE_ACTIONS.includes(a));

  return (
    <div className="access-created-screen">
      <div className="check-circle-large">
        <Check size={28} />
      </div>

      <h2>{t.accessGranted || 'Access granted'}</h2>

      <p className="created-helper-text">
        {t.helperCanNowHelpYou ? t.helperCanNowHelpYou.replace('{name}', helperName) : `${helperName} can now help you with:`}
      </p>

      <div className="created-summary-card">
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)' }}>
          {serviceName}
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

        <div>
          <span className="summary-row-label" style={{ display: 'block', marginBottom: 6 }}>
            {t.canDoLabel || 'Can do'}:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {lowRiskList.map((a) => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                <Check size={14} style={{ color: 'var(--color-primary)' }} />
                <span>{t[actionKey[a]] || a.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {hasSensitive && (
          <div>
            <span className="summary-row-label" style={{ display: 'block', marginBottom: 4 }}>
              {t.sensitiveActionsLabel || 'Sensitive actions'}:
            </span>
            <div style={{ fontSize: '0.88rem', color: 'var(--color-amber)', fontWeight: 500 }}>
              {t.youApproveThemWhenNeeded || 'You approve them when needed.'}
            </div>
          </div>
        )}

        <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
          <span style={{ color: 'var(--text-subtle)' }}>{t.expiresIn || 'Expires in'}:</span>
          <strong style={{ color: 'var(--color-primary-dark)' }}>{countdown}</strong>
        </div>
      </div>

      <div className="created-action-buttons">
        <button
          type="button"
          className="btn btn-primary btn-large btn-full"
          onClick={onContinueHome}
        >
          <span>{t.continueToHome || 'Continue to Home'}</span>
          <ArrowRight size={16} />
        </button>

        {onSwitchToHelper && (
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onSwitchToHelper}
          >
            <span>Switch to Helper View as {helperName} →</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline-danger btn-full"
          onClick={onRevokeAccess}
        >
          <span>{t.revokeAccessBtn || 'Revoke Access'}</span>
        </button>
      </div>
    </div>
  );
}
