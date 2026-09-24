import React, { useState, useEffect } from 'react';
import { ArrowRight, User, Clock, ShieldCheck, Check, Lock } from 'lucide-react';
import { T, getServiceIdFromActions, getServiceLabel, actionKey } from '../i18n';
import { asUTC } from '../api';

export default function HelperHomeView({
  lang,
  helper,
  activePass,
  citizen,
  onOpenService,
  onSwitchToCitizen,
}) {
  const t = T[lang] || T.en;

  const helperName = helper?.name || 'Ravi Kumar';
  const citizenName = citizen?.name || activePass?.citizen_name || 'Savitri Devi';

  const serviceId = activePass?.service || getServiceIdFromActions(activePass?.allowed_actions);
  const serviceName = getServiceLabel(serviceId, t);

  const allowedActions = activePass?.allowed_actions || [];

  const lowRiskActions = allowedActions.filter((a) =>
    !['change_bank_account', 'update_mobile_number', 'request_certificate_reissuance', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'update_primary_health_center', 'modify_citizen_information'].includes(a)
  );

  const sensitiveActions = allowedActions.filter((a) =>
    ['change_bank_account', 'update_mobile_number', 'request_certificate_reissuance', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'update_primary_health_center', 'modify_citizen_information'].includes(a)
  );

  /* ── Live Countdown ── */
  const [countdown, setCountdown] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!activePass?.expires_at || activePass.status !== 'active') {
      setCountdown('');
      setIsExpired(activePass?.status === 'expired');
      return;
    }

    const tick = () => {
      const expires = asUTC(activePass.expires_at).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setCountdown('0 minutes');
        setIsExpired(true);
        return;
      }

      setIsExpired(false);
      const totalSec = Math.floor(diff / 1000);
      const m = Math.floor(totalSec / 60);
      setCountdown(`${m} minutes`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activePass]);

  const hasActive = activePass && activePass.status === 'active' && !isExpired;

  return (
    <div className="helper-home">
      <div className="screen-header">
        <h2>{t.navAssistedSessions || 'Assisted Sessions'}</h2>
        <p className="screen-subtext">
          People who have granted you permission to assist them with digital public services.
        </p>
      </div>

      {!hasActive ? (
        <div className="empty-state-simple" style={{ padding: '36px 20px' }}>
          <strong>No active assisted-service sessions.</strong>
          <p style={{ maxWidth: 420, margin: '6px auto 16px auto' }}>
            When a citizen creates an access pass choosing you as their helper, the session will appear here.
          </p>
          {onSwitchToCitizen && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSwitchToCitizen}
            >
              <span>{t.continueCitizen || 'Continue as Citizen'} →</span>
            </button>
          )}
        </div>
      ) : (
        <div className="helper-session-card-detailed">
          <div className="session-card-top-row">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <User size={16} style={{ color: 'var(--color-primary)' }} />
                <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>
                  {citizenName}
                </strong>
              </div>
              <span style={{ fontSize: '0.88rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
                Service: <strong>{serviceName}</strong>
              </span>
            </div>

            <div className="active-status-badge">
              <span className="status-dot-active" />
              <span>Active · Expires in {countdown}</span>
            </div>
          </div>

          <div className="session-card-body-preview">
            <div style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', marginBottom: 4 }}>
              Authorized tasks ({allowedActions.length}):
            </div>
            <div className="session-actions-preview-list">
              {lowRiskActions.map((a) => (
                <span key={a} className="action-pill-preview">
                  <Check size={12} style={{ color: 'var(--color-primary)' }} />
                  {t[actionKey[a]] || a.replace(/_/g, ' ')}
                </span>
              ))}
              {sensitiveActions.map((a) => (
                <span key={a} className="action-pill-preview sensitive">
                  <Lock size={12} style={{ color: 'var(--color-amber)' }} />
                  {t[actionKey[a]] || a.replace(/_/g, ' ')} (Needs approval)
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onOpenService}
            >
              <span>Open Service Counter</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
