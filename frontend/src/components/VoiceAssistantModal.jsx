import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Check, AlertCircle, ArrowRight, Volume2 } from 'lucide-react';
import { T } from '../i18n';

export default function VoiceAssistantModal({
  lang,
  isOpen,
  onClose,
  onNavigate,
  onSelectService,
  onOpenApprovals,
  onOpenHelp,
  onOpenMyAccess,
  pendingStepUp,
  onResolveApproval,
}) {
  const t = T[lang] || T.en;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [pendingConfirmation, setPendingConfirmation] = useState(null); // { actionType, label, callback }
  const [manualText, setManualText] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [permissionError, setPermissionError] = useState(false);

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
    }
  }, []);

  // Process text commands (whether from voice or manual text input)
  const processCommand = (cmdText) => {
    const clean = (cmdText || '').toLowerCase().trim();
    if (!clean) return;

    setTranscript(cmdText);

    // 1. "I need help" / "get help"
    if (/help|need help|मदद|ಸಹಾಯ/i.test(clean) && !/how|what/i.test(clean)) {
      if (/how|info|kare/i.test(clean)) {
        onOpenHelp();
        setFeedback(t.howItWorksTitle || 'Opening Help & Guide');
        setTimeout(onClose, 1200);
        return;
      }
      onNavigate('citizen_delegation');
      setFeedback('Opening service delegation wizard…');
      setTimeout(onClose, 1200);
      return;
    }

    // 2. "Show my access passes" / "my passes"
    if (/access|pass|passes|ಪಾಸ್|पास/i.test(clean) && !/create|new/i.test(clean)) {
      onOpenMyAccess();
      setFeedback('Opening your access passes…');
      setTimeout(onClose, 1200);
      return;
    }

    // 3. Service selections
    if (/certificate|document|प्रमाणपत्र|ದಾಖಲೆ/i.test(clean)) {
      onSelectService('certificates_documents');
      setFeedback('Selecting Certificates & Documents…');
      setTimeout(onClose, 1200);
      return;
    }

    if (/education|scholarship|छात्रवृत्ति|ವಿದ್ಯಾರ್ಥಿವೇತನ/i.test(clean)) {
      onSelectService('education_scholarships');
      setFeedback('Selecting Education & Scholarships…');
      setTimeout(onClose, 1200);
      return;
    }

    if (/pension|welfare|पेंशन|ಪಿಂಚಣಿ/i.test(clean)) {
      onSelectService('welfare_pensions');
      setFeedback('Selecting Welfare & Pensions…');
      setTimeout(onClose, 1200);
      return;
    }

    if (/health|abha|स्वास्थ्य|ಆರೋಗ್ಯ/i.test(clean)) {
      onSelectService('health_services');
      setFeedback('Selecting Health Services…');
      setTimeout(onClose, 1200);
      return;
    }

    if (/citizen service|civic|नागरिक|ನಾಗರಿಕ/i.test(clean)) {
      onSelectService('citizen_services');
      setFeedback('Selecting Citizen Services…');
      setTimeout(onClose, 1200);
      return;
    }

    // 4. "Show pending approvals"
    if (/approval|approvals|pending|स्वीकृति|ಒಪ್ಪಿಗೆ/i.test(clean) && !/yes|no|approve|deny/i.test(clean)) {
      onOpenApprovals();
      setFeedback('Checking pending approvals…');
      setTimeout(onClose, 1200);
      return;
    }

    // 5. Sensitive approval / denial — ALWAYS requires explicit confirmation step!
    if (/approve|allow|accept|स्वीकार|ಹೌದು/i.test(clean)) {
      if (pendingStepUp) {
        setPendingConfirmation({
          decision: 'approve',
          label: 'Approve pending sensitive request',
        });
        setFeedback('Confirmation required: Please confirm to approve this sensitive request.');
      } else {
        setFeedback('No pending approval requests right now.');
      }
      return;
    }

    if (/deny|reject|block|अस्वीकार|ತಿರಸ್ಕರಿಸು/i.test(clean)) {
      if (pendingStepUp) {
        setPendingConfirmation({
          decision: 'deny',
          label: 'Deny pending sensitive request',
        });
        setFeedback('Confirmation required: Please confirm to deny this sensitive request.');
      } else {
        setFeedback('No pending approval requests right now.');
      }
      return;
    }

    // 6. Generic "Help"
    onOpenHelp();
    setFeedback('Opening Help & How It Works…');
    setTimeout(onClose, 1200);
  };

  const startListening = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      setSpeechSupported(false);
      return;
    }

    setPermissionError(false);
    setFeedback('');
    setPendingConfirmation(null);

    try {
      const recognition = new SpeechRec();
      recognition.lang = lang === 'hi' ? 'hi-IN' : lang === 'kn' ? 'kn-IN' : 'en-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        processCommand(text);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setPermissionError(true);
        } else {
          setFeedback('Could not recognize speech. Please try speaking clearly or typing your command below.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      setSpeechSupported(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    processCommand(manualText.trim());
    setManualText('');
  };

  const handleConfirmAction = () => {
    if (pendingConfirmation && pendingStepUp) {
      onResolveApproval(pendingStepUp.id, pendingConfirmation.decision, 'voice_confirmed');
      setPendingConfirmation(null);
      setFeedback(`Action confirmed: ${pendingConfirmation.decision}`);
      setTimeout(onClose, 1200);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="voice-modal-title">
      <div className="modal-card voice-assistant-card">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Volume2 size={18} style={{ color: 'var(--color-primary)' }} />
            <h3 id="voice-modal-title">{t.voiceAssistanceTitle || 'Voice Assistance'}</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {/* Listening / Microphone Area */}
        <div className="voice-mic-container">
          <button
            type="button"
            className={`voice-mic-button ${isListening ? 'active-pulse' : ''}`}
            onClick={isListening ? stopListening : startListening}
            aria-label={isListening ? 'Stop listening' : 'Start listening'}
          >
            {isListening ? <MicOff size={28} /> : <Mic size={28} />}
          </button>
          <div className="voice-status-text">
            {isListening ? (
              <span style={{ color: 'var(--color-primary-dark)', fontWeight: 600 }}>
                {t.voiceListening || 'Listening… speak your command'}
              </span>
            ) : (
              <span>Click the microphone to speak</span>
            )}
          </div>
        </div>

        {/* Transcript & Feedback */}
        {transcript && (
          <div className="voice-transcript-box">
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', textTransform: 'uppercase' }}>
              {t.voiceRecognizedText || 'Recognized speech'}:
            </span>
            <div style={{ fontWeight: 600, color: 'var(--text-main)', marginTop: 2 }}>
              "{transcript}"
            </div>
          </div>
        )}

        {feedback && (
          <div className="voice-feedback-message">
            {feedback}
          </div>
        )}

        {/* Sensitive Action Explicit Confirmation Step (Crucial Requirement!) */}
        {pendingConfirmation && (
          <div className="voice-confirmation-dialog">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-amber)', fontWeight: 600, fontSize: '0.9rem' }}>
              <AlertCircle size={16} />
              <span>{t.voiceConfirmPrompt || 'Confirmation required'}</span>
            </div>
            <p style={{ fontSize: '0.85rem', margin: '6px 0 12px 0', color: 'var(--text-main)' }}>
              Are you sure you want to <strong>{pendingConfirmation.decision}</strong> the sensitive request from {pendingStepUp?.helper_name || 'Helper'}?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => setPendingConfirmation(null)}
              >
                {t.voiceConfirmNo || 'Cancel'}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleConfirmAction}
              >
                <Check size={14} />
                <span>{t.voiceConfirmYes || 'Yes, Proceed'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Permission Error / Unsupported notice */}
        {permissionError && (
          <div className="panel" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--color-danger)' }}>
              {t.voiceErrorPermission || 'Microphone access denied. Please allow microphone permission in your browser.'}
            </span>
          </div>
        )}

        {!speechSupported && (
          <div className="panel" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-color)', padding: '10px 14px' }}>
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
              {t.voiceUnsupported || 'Speech recognition is not supported in this browser. Please use text commands below.'}
            </span>
          </div>
        )}

        {/* Manual Text Command Fallback */}
        <form onSubmit={handleManualSubmit} style={{ marginTop: 8 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', display: 'block', marginBottom: 4 }}>
            {t.voiceTextFallbackPlaceholder || 'Or type a command here (e.g. "I need help")'}
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="text-input"
              style={{ flex: 1, padding: '8px 12px', fontSize: '0.88rem' }}
              placeholder='e.g. "I need help", "Show passes", "Certificates"'
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              <ArrowRight size={14} />
            </button>
          </div>
        </form>

        <div className="voice-examples-list">
          <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 600 }}>Try saying:</span>
          <div className="voice-chips-row">
            <button type="button" className="voice-chip" onClick={() => processCommand('I need help')}>
              "I need help"
            </button>
            <button type="button" className="voice-chip" onClick={() => processCommand('Show my access passes')}>
              "Show my access passes"
            </button>
            <button type="button" className="voice-chip" onClick={() => processCommand('Certificates')}>
              "Choose certificates"
            </button>
            <button type="button" className="voice-chip" onClick={() => processCommand('Help')}>
              "Help"
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
