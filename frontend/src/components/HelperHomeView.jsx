import React, { useState, useEffect } from 'react';
import { Building2, ArrowRight, User, Clock } from 'lucide-react';
import { T } from '../i18n';
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
  const citizenName = citizen?.name || 'Savitri Devi';
  const serviceName = t.srvWelfarePensions || 'Welfare & Pensions';

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
        <h2>{t.assistedServicesTitle || 'Assisted Services'}</h2>
        <p className="screen-subtext">
          {t.peopleGivenPermissionToHelp || 'People who have given you permission to help.'}
        </p>
      </div>

      {!hasActive ? (
        <div className="empty-state-simple" style={{ padding: '36px 20px' }}>
          <strong>{t.noAssistedSessions || 'No active assisted-service sessions.'}</strong>
          <p style={{ maxWidth: 400, margin: '6px auto 16px auto' }}>
            {t.noAssistedSessionsDesc || 'Ask the citizen to grant you time-limited permission from their Citizen screen.'}
          </p>
          {onSwitchToCitizen && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onSwitchToCitizen}
            >
              <span>{t.switchToCitizenBtn || 'Switch to Citizen'} →</span>
            </button>
          )}
        </div>
      ) : (
        <div className="helper-session-card">
          <div>
            <strong style={{ display: 'block', fontSize: '1.05rem', color: 'var(--text-main)' }}>
              {citizenName}
            </strong>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>
              {serviceName}
            </span>
            <div className="active-status-row" style={{ marginTop: 6 }}>
              <span className="status-dot-active" />
              <span>{t.accessActive || 'Access active'} · {t.expiresIn || 'Expires in'} {countdown || '27 minutes'}</span>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenService}
          >
            <span>{t.openServiceBtn || 'Open service'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
