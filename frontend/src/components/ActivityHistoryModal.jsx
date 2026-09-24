import React, { useState } from 'react';
import { X, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { T, actionKey } from '../i18n';
import { asUTC } from '../api';

export default function ActivityHistoryModal({
  lang,
  audit = [],
  summary = '',
  citizenName = 'Savitri Devi',
  helperName = 'Ravi Kumar',
  onClose,
}) {
  const t = T[lang] || T.en;
  const [showTechnical, setShowTechnical] = useState(false);

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h3>{t.activityHistoryTitle || 'Activity History'}</h3>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {summary && (
          <div className="panel-subtle" style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
            {summary}
          </div>
        )}

        <div className="activity-timeline">
          <span className="section-title">{t.today || 'Today'}</span>

          {audit.length === 0 ? (
            <div className="empty-state-simple">
              <p>{t.noActivityYet || 'No activity recorded yet.'}</p>
            </div>
          ) : (
            <div className="activity-mini-list">
              {[...audit].reverse().map((entry) => {
                const timeStr = asUTC(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const actorStr = entry.actor === 'citizen' ? (t.actorYou || 'You') : helperName;

                let actionText = '';
                if (entry.event === 'pass_created') {
                  actionText = t.eventPassCreated || 'Pass created';
                } else if (entry.event === 'action_executed') {
                  actionText = `${actorStr} ${t.eventViewed || 'viewed'} ${entry.detail ? (t[actionKey[entry.detail]] || entry.detail.replace(/_/g, ' ')) : 'service'}`;
                } else if (entry.event === 'step_up_requested') {
                  actionText = `${actorStr} ${t.eventRequestedApproval || 'requested'} ${entry.detail ? (t[actionKey[entry.detail]] || entry.detail.replace(/_/g, ' ')) : 'sensitive action'}`;
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
        </div>

        {/* Small Expandable Technical Audit for Judges */}
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 10 }}>
          <button
            type="button"
            className="btn-text-link"
            onClick={() => setShowTechnical(!showTechnical)}
            style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}
          >
            <span>{t.technicalAuditToggle || 'Technical audit details (for judges)'}</span>
            {showTechnical ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showTechnical && (
            <div style={{ marginTop: 8, maxHeight: 140, overflowY: 'auto', background: 'var(--bg-subtle)', padding: 8, borderRadius: 4, fontSize: '0.74rem', fontFamily: 'monospace' }}>
              {audit.map((e) => (
                <div key={e.id} style={{ marginBottom: 4 }}>
                  [{asUTC(e.timestamp).toISOString()}] actor={e.actor} event={e.event} detail={e.detail}
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="btn btn-secondary btn-full" onClick={onClose}>
          {t.closeBtn || 'Close'}
        </button>
      </div>
    </div>
  );
}
