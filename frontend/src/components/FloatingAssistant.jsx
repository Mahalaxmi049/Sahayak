import React, { useState, useEffect } from 'react';
import { HelpCircle, X, ChevronRight, ExternalLink, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { T } from '../i18n';
import { OFFICIAL_PORTALS } from '../config/officialPortals';

export default function FloatingAssistant({
  lang,
  onOpenApprovals,
  onOpenDelegation,
  onOpenActivity,
  hasPendingStepUps,
}) {
  const t = T[lang] || T.en;
  const [isOpen, setIsOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const faqs = [
    { id: 'faq1', q: t.assistantFaq1Q || 'What can I do here?', a: t.assistantFaq1A },
    { id: 'faq2', q: t.assistantFaq2Q || 'How does access work?', a: t.assistantFaq2A },
    { id: 'faq3', q: t.assistantFaq3Q || 'What is a sensitive action?', a: t.assistantFaq3A },
    { id: 'faq4', q: t.assistantFaq4Q || 'How do I revoke access?', a: t.assistantFaq4A },
    {
      id: 'faq5',
      q: t.assistantFaq5Q || 'Show pending approvals',
      a: t.assistantFaq5A,
      action: () => {
        onOpenApprovals?.();
        setIsOpen(false);
      },
    },
    {
      id: 'faq6',
      q: t.assistantFaq6Q || 'Open official government services',
      a: t.assistantFaq6A,
      isPortalsList: true,
    },
  ];

  return (
    <div className="floating-assistant-wrapper">
      {/* Floating Trigger Button */}
      <button
        type="button"
        className="floating-assistant-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close assistant' : 'Open Sahayak Assistant'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X size={20} /> : <HelpCircle size={20} />}
        <span className="floating-assistant-label">{t.assistantTitle || 'Sahayak Assistant'}</span>
        {hasPendingStepUps && <span className="floating-assistant-badge" />}
      </button>

      {/* Assistant Card / Panel */}
      {isOpen && (
        <div className="floating-assistant-panel" role="region" aria-label="Sahayak Assistant Help Panel">
          <div className="assistant-panel-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck size={16} style={{ color: 'var(--color-primary)' }} />
              <strong>{t.assistantTitle || 'Sahayak Assistant'}</strong>
            </div>
            <button
              type="button"
              className="btn-close-modal"
              onClick={() => setIsOpen(false)}
              aria-label="Close assistant"
            >
              <X size={16} />
            </button>
          </div>

          <p className="assistant-panel-intro">
            {t.assistantGreeting || 'How can we help you? Select a topic below:'}
          </p>

          <div className="assistant-faq-list">
            {faqs.map((faq) => {
              const isSelected = activeFaq === faq.id;
              return (
                <div key={faq.id} className="assistant-faq-item">
                  <button
                    type="button"
                    className={`assistant-faq-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      if (faq.action) {
                        faq.action();
                      } else {
                        setActiveFaq(isSelected ? null : faq.id);
                      }
                    }}
                  >
                    <span>{faq.q}</span>
                    <ChevronRight size={14} className={`chevron-icon ${isSelected ? 'open' : ''}`} />
                  </button>

                  {isSelected && (
                    <div className="assistant-faq-body">
                      <p>{faq.a}</p>

                      {faq.isPortalsList && (
                        <div className="assistant-portals-container">
                          <a
                            href={OFFICIAL_PORTALS.umang.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="official-portal-chip"
                          >
                            <span>UMANG Portal</span>
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href={OFFICIAL_PORTALS.digilocker.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="official-portal-chip"
                          >
                            <span>DigiLocker</span>
                            <ExternalLink size={12} />
                          </a>
                          <a
                            href={OFFICIAL_PORTALS.indiaGov.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="official-portal-chip"
                          >
                            <span>India.gov.in</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="assistant-panel-footer">
            <span style={{ fontSize: '0.76rem', color: 'var(--text-subtle)' }}>
              {t.portalClarification}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
