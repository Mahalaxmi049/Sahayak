import React from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { T } from '../i18n';

export default function HowItWorksModal({ lang, onClose }) {
  const t = T[lang] || T.en;

  const points = [
    { num: 1, text: t.hwPoint1 || 'Choose a trusted helper (service operator, family member, or neighbour).' },
    { num: 2, text: t.hwPoint2 || 'Choose specific tasks they are allowed to complete for you.' },
    { num: 3, text: t.hwPoint3 || 'Give time-limited access (15, 30, or 60 minutes).' },
    { num: 4, text: t.hwPoint4 || 'Sensitive actions (like changing bank accounts) always need your approval.' },
    { num: 5, text: t.hwPoint5 || 'Every action is recorded in a tamper-evident log.' },
    { num: 6, text: t.hwPoint6 || 'Access automatically expires or can be revoked by you at any time.' },
  ];

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} style={{ color: 'var(--color-primary)' }} />
            <h3>{t.howSahayakPassWorks || 'How Sahayak Pass Works'}</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, margin: '8px 0' }}>
          {points.map((p) => (
            <div key={p.num} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                backgroundColor: 'var(--color-primary-light)',
                color: 'var(--color-primary-dark)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.76rem',
                fontWeight: 700,
                flexShrink: 0
              }}>
                {p.num}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: 1.4 }}>
                {p.text}
              </span>
            </div>
          ))}
        </div>

        <div className="panel-subtle" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {t.disclaimer}
        </div>

        <button type="button" className="btn btn-primary btn-full" onClick={onClose}>
          {t.gotIt || 'Got it'}
        </button>
      </div>
    </div>
  );
}
