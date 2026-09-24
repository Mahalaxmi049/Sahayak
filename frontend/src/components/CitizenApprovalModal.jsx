import React, { useState } from 'react';
import { Lock, Check, X, Mic, MicOff, AlertCircle, Loader2 } from 'lucide-react';
import { T, actionKey } from '../i18n';
import { resolveStepUp } from '../api';

export default function CitizenApprovalModal({
  lang,
  stepUp,
  helperName = 'Ravi Kumar',
  serviceName = 'Welfare & Pensions',
  onClose,
  onResolved,
}) {
  const t = T[lang] || T.en;

  const [resolving, setResolving] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleDecision = async (decision, via = 'button') => {
    if (!stepUp?.id) return;
    setResolving(true);
    try {
      await resolveStepUp(stepUp.id, decision, via);
      onResolved(decision);
      onClose();
    } catch {
      // ignore
    } finally {
      setResolving(false);
    }
  };

  /* Voice approval simulation for browser */
  const handleVoiceToggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'en' ? 'en-IN' : lang + '-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const isApprove = /^(yes|allow|approve|हाँ|हां|अनुमति|मंज़ूर|ಹೌದು|ಅನುಮತಿಸಿ)/i.test(text);
      handleDecision(isApprove ? 'approve' : 'deny', 'voice');
    };
    recognition.start();
  };

  const hasSpeech = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const actionName = stepUp ? (t[actionKey[stepUp.action]] || stepUp.action.replace(/_/g, ' ').toUpperCase()) : 'CHANGE BANK ACCOUNT';

  return (
    <div className="approval-overlay">
      <div className="approval-modal">
        <div className="approval-badge-top">
          <Lock size={12} />
          <span>{t.approvalNeeded || 'Approval needed'}</span>
        </div>

        <div className="approval-headline">
          {t.sahayakPassApproval || 'Sahayak Pass'}
        </div>

        <p className="approval-context-text">
          <strong>{helperName}</strong> {t.isHelpingYouWith || 'is helping you with'}: <strong>{serviceName}</strong>
        </p>

        <div className="approval-action-box">
          <span className="wants-label">{t.wantsTo || 'He wants to'}:</span>
          <span className="action-title-large">{actionName}</span>
          <span className="sensitive-tag-text">{t.sensitiveActionTag || 'Sensitive action'}</span>
        </div>

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

        {hasSpeech && (
          <div style={{ textAlign: 'center', marginTop: 4 }}>
            <button
              type="button"
              className="btn-text-link"
              onClick={handleVoiceToggle}
              style={{ fontSize: '0.8rem', color: isListening ? 'var(--color-primary)' : 'var(--text-subtle)' }}
            >
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
              <span>{isListening ? (t.listening || 'Listening…') : (t.orSpeakToApprove || 'Or speak: "Yes, approve" / "No, deny"')}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
