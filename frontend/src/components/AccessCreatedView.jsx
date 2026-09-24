import React, { useState, useEffect } from 'react';
import { Check, Clock, ShieldCheck, ArrowRight, ExternalLink, AlertTriangle } from 'lucide-react';
import { T, actionKey, getServiceIdFromActions, getServiceLabel } from '../i18n';
import { asUTC, revokePass } from '../api';
import { getOfficialPortal } from '../config/officialPortals';

export default function AccessCreatedView({
  lang,
  pass,
  onContinueHome,
  onRevokeAccess,
  onSwitchToHelper,
}) {
  const t = T[lang] || T.en;

  const helperName = pass?.helper_name || 'Ravi Kumar';
  const allowedActions = pass?.allowed_actions || [
    'view_pension_status',
    'download_pension_certificate',
    'change_bank_account',
  ];
  const serviceId = pass?.service || getServiceIdFromActions(allowedActions);
  const serviceName = pass?.service_name || getServiceLabel(serviceId, t);
  const officialPortal = getOfficialPortal(serviceId);

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
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pass]);

  const lowRiskList = allowedActions.filter(
    (a) => !['change_bank_account', 'update_mobile_number', 'request_certificate_reissuance', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'update_primary_health_center', 'modify_citizen_information'].includes(a)
  );

  const sensitiveList = allowedActions.filter((a) =>
    ['change_bank_account', 'update_mobile_number', 'request_certificate_reissuance', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'update_primary_health_center', 'modify_citizen_information'].includes(a)
  );

  return (
    <div className="access-created-screen">
      <div className="created-badge-icon">
        <ShieldCheck size={28} />
      </div>

      <h2>{t.accessGranted || 'Access pass created'}</h2>

      <p className="created-helper-text">
        <strong>{helperName}</strong> can now assist you with <strong>{serviceName}</strong>.
      </p>

      <div className="created-summary-card">
        {/* Service Title */}
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-navy)' }}>
          {serviceName}
        </div>

        <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

        {/* Permitted Tasks */}
        <div>
          <span className="summary-row-label" style={{ display: 'block', marginBottom: 6 }}>
            {t.allowedHeader || 'Permitted tasks'}:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lowRiskList.map((a) => (
              <div key={a} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' }}>
                <Check size={14} style={{ color: 'var(--color-primary)' }} />
                <span>{t[actionKey[a]] || a.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensitive Tasks Requiring Approval */}
        {sensitiveList.length > 0 && (
          <div>
            <span className="summary-row-label" style={{ display: 'block', marginBottom: 4, color: 'var(--color-amber)' }}>
              {t.sensitiveHeader || 'Sensitive tasks'}:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {sensitiveList.map((a) => (
                <div key={a} style={{ fontSize: '0.88rem', color: '#78350f' }}>
                  • {t[actionKey[a]] || a.replace(/_/g, ' ')} (<em>requires your live approval</em>)
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 1, backgroundColor: 'var(--border-color)' }} />

        {/* Expiry Countdown */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.88rem' }}>
          <span style={{ color: 'var(--text-subtle)' }}>{t.accessExpiresIn || 'Access expires in'}:</span>
          <strong style={{ color: 'var(--color-primary-dark)' }}>{countdown}</strong>
        </div>
      </div>

      {/* Official Government Destination Link (Section 6) */}
      <div className="official-portal-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-navy)' }}>
              {officialPortal.name}
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.portalClarification}
            </span>
          </div>
          <a
            href={officialPortal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            <span>{t.continueToOfficialWebsite || 'Continue to official website'}</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="created-action-buttons">
        <button
          type="button"
          className="btn btn-primary btn-large btn-full"
          onClick={onContinueHome}
        >
          <span>{t.returnToDashboardBtn || 'Return to Citizen Home'}</span>
          <ArrowRight size={16} />
        </button>

        {onSwitchToHelper && (
          <button
            type="button"
            className="btn btn-secondary btn-full"
            onClick={onSwitchToHelper}
          >
            <span>{t.switchToHelperBtn || 'Open helper service workspace'} →</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-outline-danger btn-full"
          onClick={onRevokeAccess}
        >
          <span>{t.revokeAccessBtn || 'Revoke access'}</span>
        </button>
      </div>
    </div>
  );
}
