import React, { useState, useEffect } from 'react';
import { Plus, Clock, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { T, actionKey } from '../i18n';
import { asUTC } from '../api';

export default function CitizenHomeView({
  lang,
  citizen,
  activePass,
  pendingStepUps = [],
  audit = [],
  onGetHelp,
  onViewPass,
  onRevokeClick,
  onOpenApproval,
  onViewActivity,
}) {
  const t = T[lang] || T.en;

  const citizenName = citizen?.name || 'Savitri Devi';
  const firstName = citizenName.split(' ')[0] || citizenName;

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
  const helperName = activePass?.helper_name || 'Ravi Kumar';
  const helperRole = activePass?.helper_type === 'family' ? (t.typeFamily || 'Family member') : (t.typeCsc || 'CSC Operator');
  const serviceName = t.srvWelfarePensions || 'Welfare & Pensions';

  const pendingRequest = pendingStepUps[0];

  return (
    <div className="citizen-home">
      {/* ── Greeting ── */}
      <div className="home-greeting">
        <h1>{t.greeting ? t.greeting.replace('{name}', firstName) : `Good morning, ${firstName}`}</h1>
        <p>{t.howCanWeHelp || 'How can we help you today?'}</p>
      </div>

      {/* ── Urgent Step-Up Approval Banner ── */}
      {pendingRequest && (
        <div className="panel" style={{ backgroundColor: 'var(--color-amber-bg)', borderColor: 'var(--color-amber-border)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
            <div>
              <span className="task-sensitive-label" style={{ display: 'inline-block', marginBottom: 4 }}>
                {t.approvalNeeded || 'Approval needed'}
              </span>
              <strong style={{ display: 'block', fontSize: '1rem', color: '#78350f' }}>
                {helperName} {t.wantsToPerformAction || 'wants to perform a sensitive action'}:
              </strong>
              <span style={{ fontSize: '0.9rem', color: '#92400e', fontWeight: 600 }}>
                {t[actionKey[pendingRequest.action]] || pendingRequest.action.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onOpenApproval}
            >
              <span>{t.reviewRequest || 'Review'}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Primary Action: Get Help ── */}
      <div className="get-help-action-card">
        <div className="get-help-text">
          <strong>+ {t.getHelpWithService || 'Get help with a service'}</strong>
          <span>{t.getHelpSubtitle || 'Give a trusted person limited access to complete a task for you.'}</span>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onGetHelp}
        >
          <span>{t.getHelpBtn || 'Get Help'}</span>
          <ArrowRight size={16} />
        </button>
      </div>

      {/* ── Section: My Active Access ── */}
      <div className="home-section">
        <div className="section-title">{t.myActiveAccess || 'My active access'}</div>

        {!hasActive ? (
          <div className="empty-state-simple">
            <strong>{t.noActiveAccess || 'No active access'}</strong>
            <p>{t.notSharingAccess || "You're currently not sharing access with anyone."}</p>
          </div>
        ) : (
          <div className="active-access-card">
            <div className="active-helper-meta">
              <strong>{helperName}</strong>
              <span className="helper-role-text">{helperRole}</span>
              <div className="active-service-text">{serviceName}</div>
              <div className="active-status-row">
                <span className="status-dot-active" />
                <span>{t.activeStatus || 'Active'} · {t.expiresIn || 'Expires in'} {countdown || '28 minutes'}</span>
              </div>
            </div>

            <div className="active-access-buttons">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onViewPass}
              >
                {t.viewBtn || 'View'}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={onRevokeClick}
              >
                {t.revokeBtn || 'Revoke'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section: Recent Activity ── */}
      <div className="home-section">
        <div className="section-title">{t.recentActivityHeader || 'Recent activity'}</div>

        {audit.length === 0 ? (
          <div className="empty-state-simple">
            <p>{t.noActivityYet || 'No recent activity.'}</p>
          </div>
        ) : (
          <div className="activity-mini-list">
            {[...audit].reverse().slice(0, 4).map((entry) => {
              const timeStr = asUTC(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const actorStr = entry.actor === 'citizen' ? (t.actorYou || 'You') : helperName;
              
              let actionText = '';
              if (entry.event === 'pass_created') {
                actionText = t.eventPassCreated || 'Pass created';
              } else if (entry.event === 'action_executed') {
                actionText = `${actorStr} ${t.eventViewed || 'viewed'} ${entry.detail ? (t[actionKey[entry.detail]] || entry.detail.replace(/_/g, ' ')) : 'service'}`;
              } else if (entry.event === 'step_up_requested') {
                actionText = `${actorStr} ${t.eventRequestedApproval || 'requested approval for'} ${entry.detail ? (t[actionKey[entry.detail]] || entry.detail.replace(/_/g, ' ')) : 'sensitive action'}`;
              } else if (entry.event === 'step_up_approved') {
                actionText = t.eventYouApproved || 'You approved the request';
              } else if (entry.event === 'step_up_executed') {
                actionText = `${entry.detail ? (t[actionKey[entry.detail]] || entry.detail.replace(/_/g, ' ')) : 'Action'} ${t.eventCompleted || 'completed'}`;
              } else if (entry.event === 'step_up_denied') {
                actionText = t.eventYouDenied || 'You denied the request';
              } else if (entry.event === 'pass_revoked') {
                actionText = t.eventPassRevoked || 'Access revoked';
              } else {
                actionText = entry.detail || entry.event.replace(/_/g, ' ');
              }

              return (
                <div key={entry.id} className="activity-mini-item">
                  <span className="activity-time">{timeStr}</span>
                  <span className="activity-desc">{actionText}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="activity-footer-row">
          <button
            type="button"
            className="btn-text-link"
            onClick={onViewActivity}
          >
            <span>{t.viewAllActivityBtn || 'View activity'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
