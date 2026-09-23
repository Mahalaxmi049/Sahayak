import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ShieldCheck, Clock, Eye, Download, Phone, Landmark, Lock,
  CheckCircle2, XCircle, AlertTriangle, Loader2, Copy, Check,
  Mic, MicOff, Target, ClipboardList, ShieldAlert, Info,
} from 'lucide-react';
import { T, actionKey, helperTypeKey } from '../i18n';
import {
  getCitizen, getHelpers, getCitizenPasses, createPass, getPass,
  revokePass, getPendingStepUps, resolveStepUp, getAudit, getSummary,
  getActions, asUTC,
} from '../api';

const CITIZEN_ID = 1; // Seeded demo citizen
const ICONS = { view_pension_status: Eye, download_pension_certificate: Download, update_mobile_number: Phone, change_bank_account: Landmark };
const fmt = (n) => {
  const s = Math.max(0, n);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export default function CitizenView({ lang, setLang, passToken, setPassToken, passId, setPassId }) {
  const t = T[lang];

  /* ── Data state ── */
  const [citizen, setCitizen] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [actions, setMeta] = useState([]);
  const [activePass, setActivePass] = useState(null);
  const [pending, setPending] = useState([]);
  const [audit, setAudit] = useState([]);
  const [summary, setSummary] = useState('');
  const [seconds, setSeconds] = useState(0);

  const hasInitLang = useRef(false);

  /* ── UI state ── */
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdPass, setCreatedPass] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [revoking, setRevoking] = useState(false);

  /* ── Form state ── */
  const [selectedHelper, setSelectedHelper] = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  const [duration, setDuration] = useState(30);

  /* ── Voice state ── */
  const [isListening, setIsListening] = useState(false);

  /* ── Fetch data ── */
  const refresh = useCallback(async () => {
    try {
      const [c, h, m] = await Promise.all([
        getCitizen(CITIZEN_ID),
        getHelpers(),
        getActions(lang),
      ]);
      setCitizen(c);
      if (!hasInitLang.current && c?.language && setLang) {
        hasInitLang.current = true;
        setLang(c.language);
      }
      setHelpers(h);
      setMeta(m);
      const passes = await getCitizenPasses(CITIZEN_ID);
      const act = passes.find(
        (p) => p.status === 'active' && asUTC(p.expires_at) > new Date()
      );
      // If pass was active but now expired in UI, still show it so citizen sees the expired state
      const mostRecent = act || passes.find((p) => p.status === 'active') || passes[0];
      setActivePass(act || null);
      if (act) {
        const [pend, aud, sum] = await Promise.all([
          getPendingStepUps(CITIZEN_ID),
          getAudit(act.id),
          getSummary(act.id, lang),
        ]);
        setPending(pend);
        setAudit(aud);
        setSummary(sum.summary);
      } else if (mostRecent && !act) {
        // Show audit for most recent pass even if expired/revoked
        const [aud, sum] = await Promise.all([
          getAudit(mostRecent.id),
          getSummary(mostRecent.id, lang),
        ]);
        setAudit(aud);
        setSummary(sum.summary);
        // If it just expired, show the expired pass
        if (mostRecent.status === 'active' && asUTC(mostRecent.expires_at) <= new Date()) {
          setActivePass(null); // trigger creation form
        }
      } else {
        setPending([]);
        setAudit([]);
        setSummary('');
      }
    } catch { /* ignore fetch errors during polling */ }
    setLoading(false);
  }, [lang]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [refresh]);

  /* ── Countdown ── */
  useEffect(() => {
    if (!activePass) { setSeconds(0); return; }
    const tick = () => setSeconds(Math.ceil((asUTC(activePass.expires_at) - Date.now()) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activePass?.id, activePass?.expires_at]);

  /* ── Voice TTS for step-up ── */
  useEffect(() => {
    if (!pending[0] || !activePass) return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    const helperName = helpers.find((h) => h.id === activePass.helper_id)?.name || t.helperLabel;
    const actionLabel = t[actionKey[pending[0].action]] || pending[0].action;
    const text = t.voicePrompt.replace('{action}', actionLabel);
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'en' ? 'en-IN' : lang + '-IN';
    synth.speak(utter);
    return () => synth.cancel();
  }, [pending[0]?.id, lang]);

  /* ── Create pass ── */
  const handleCreate = async () => {
    if (selectedActions.length === 0) { setError(t.selectAtLeast); return; }
    setCreating(true);
    setError('');
    try {
      const labels = selectedActions.map((a) => t[actionKey[a]]).join(', ');
      const p = await createPass({
        citizen_id: CITIZEN_ID,
        helper_id: Number(selectedHelper || helpers[0]?.id),
        task_label: labels,
        allowed_actions: selectedActions,
        duration_minutes: duration,
      });
      setCreatedPass(p);
      setPassToken(p.token);
      setPassId(p.id);
      setShowConfirmation(true);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
    setCreating(false);
  };

  /* ── Revoke ── */
  const handleRevoke = async () => {
    if (!activePass) return;
    setRevoking(true);
    try {
      await revokePass(activePass.id);
      await refresh();
      setShowConfirmation(false);
    } catch (e) {
      setError(e.message);
    }
    setRevoking(false);
  };

  /* ── Resolve step-up ── */
  const handleResolve = async (decision, via = 'button') => {
    if (!pending[0]) return;
    try {
      await resolveStepUp(pending[0].id, decision, via);
      await refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  /* ── Voice recognition ── */
  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'en' ? 'en-IN' : lang + '-IN';
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (e) => {
      const text = e.results[0][0].transcript.toLowerCase();
      const approve = /^(yes|allow|approve|हाँ|हां|अनुमति|ಹೌದು|ಅನುಮತಿಸಿ)/i.test(text);
      handleResolve(approve ? 'approve' : 'deny', 'voice');
    };
    recognition.start();
  };

  /* ── Copy token ── */
  const copyToken = () => {
    const token = createdPass?.token || passToken;
    navigator.clipboard?.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Toggle action checkbox ── */
  const toggleAction = (action) => {
    setSelectedActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  };

  const hasVoice = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  if (loading) {
    return <div className="loading"><Loader2 /></div>;
  }

  const lowRisk = actions.filter((a) => a.risk === 'LOW');
  const highRisk = actions.filter((a) => a.risk === 'HIGH');
  const helperName = activePass ? helpers.find((h) => h.id === activePass.helper_id)?.name || t.helperLabel : '';
  const helperType = activePass ? helpers.find((h) => h.id === activePass.helper_id)?.helper_type : '';

  return (
    <div>
      {/* ── Error ── */}
      {error && (
        <div className="error-msg">
          <AlertTriangle />
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ marginLeft: 'auto' }}><XCircle /></button>
        </div>
      )}

      {/* ══════════════════ STEP-UP APPROVAL MODAL ══════════════════ */}
      {pending[0] && activePass && (
        <div className="stepup-overlay" onClick={(e) => e.target === e.currentTarget && null}>
          <div className="stepup-modal">
            <div className="stepup-modal-header">
              <AlertTriangle />
              <h3>{t.approvalRequired}</h3>
            </div>
            <div className="stepup-modal-body">
              <p style={{ color: '#5F7068', marginBottom: 8 }}>
                {t.isTryingTo.replace('{name}', helperName)}
              </p>
              <div className="stepup-action-name">
                {t[actionKey[pending[0].action]] || pending[0].action}
              </div>
              <p style={{ fontSize: '.88rem', color: '#5F7068' }}>{t.sensitiveAction}</p>

              <div className="stepup-meta">
                <div><strong>{t.requestedBy}:</strong> {helperName} — {t[helperTypeKey[helperType]] || helperType}</div>
                <div><strong>Pass:</strong> Sahayak Pass</div>
                <div><strong>{t.requestedAt}:</strong> {asUTC(pending[0].created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>

              <div className="stepup-buttons">
                <button className="btn btn-danger" onClick={() => handleResolve('deny')}>
                  <XCircle /> {t.deny}
                </button>
                <button className="btn btn-primary" onClick={() => handleResolve('approve')}>
                  <CheckCircle2 /> {t.approve}
                </button>
              </div>

              {/* Voice section */}
              <div className="voice-section">
                <p style={{ fontWeight: 600, marginBottom: 6 }}>{t.approveVia}: {t.viaVoice}</p>
                {hasVoice ? (
                  <>
                    <div
                      className={`voice-icon ${isListening ? 'listening' : ''}`}
                      onClick={startVoice}
                      role="button"
                      aria-label={t.viaVoice}
                    >
                      {isListening ? <MicOff /> : <Mic />}
                    </div>
                    <p className="voice-text">
                      {isListening
                        ? t.listening
                        : t.voicePrompt.replace('{action}', t[actionKey[pending[0].action]] || pending[0].action)}
                    </p>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
                      <button className="btn btn-sm btn-primary" onClick={() => handleResolve('approve', 'voice')}>
                        {t.yesAllow}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleResolve('deny', 'voice')}>
                        {t.noDeny}
                      </button>
                    </div>
                    <p className="voice-proto">{t.voiceProto}</p>
                  </>
                ) : (
                  <p style={{ fontSize: '.82rem', color: '#8A9790' }}>{t.voiceNotAvailable}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════ CONFIRMATION (after creation) ══════════════════ */}
      {showConfirmation && createdPass && (
        <div className="confirmation-card" style={{ marginBottom: 20 }}>
          <div className="check-icon"><CheckCircle2 /></div>
          <h2>{t.passReady}</h2>

          <div className="pass-details">
            <div className="pass-detail-row">
              <span className="detail-label">{t.helperLabel}</span>
              <span className="detail-value">
                {helpers.find((h) => h.id === createdPass.helper_id)?.name}
                <br />
                <small style={{ fontWeight: 400, color: '#5F7068' }}>
                  {t[helperTypeKey[helpers.find((h) => h.id === createdPass.helper_id)?.helper_type]] || ''}
                </small>
              </span>
            </div>
            <div className="pass-detail-row">
              <span className="detail-label">{t.taskLabel}</span>
              <span className="detail-value">{createdPass.task_label}</span>
            </div>
            <div className="pass-detail-row">
              <span className="detail-label">{t.access}</span>
              <span className="detail-value">
                {createdPass.allowed_actions.map((a) => t[actionKey[a]]).join(', ')}
              </span>
            </div>
            <div className="pass-detail-row">
              <span className="detail-label">{t.expiresIn}</span>
              <span className="detail-value">{createdPass.duration_minutes} {t.minutes}</span>
            </div>
            <div className="pass-detail-row">
              <span className="detail-label">{t.status}</span>
              <span className="detail-value">
                <span className="badge badge-active">● {t.active}</span>
              </span>
            </div>
          </div>

          <label style={{ textAlign: 'left', marginBottom: 4 }}>{t.passToken}</label>
          <div className="token-display">
            <code>{createdPass.token}</code>
            <button className="btn-icon copy-btn" onClick={copyToken} aria-label={t.copyToken}>
              {copied ? <Check /> : <Copy />}
            </button>
          </div>
          {copied && <p style={{ fontSize: '.8rem', color: '#059669', marginBottom: 8 }}>{t.copied}</p>}

          <div className="share-note">
            <ShieldCheck />
            <span>{t.shareNote}</span>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowConfirmation(false)}>
              {t.activePass} →
            </button>
            <button className="btn btn-danger" style={{ flex: 1 }} onClick={handleRevoke} disabled={revoking}>
              <XCircle /> {t.revokePass}
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════ ACTIVE PASS VIEW ══════════════════ */}
      {activePass && !showConfirmation && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="active-pass-card">
            <div className="active-pass-header">
              <h3><ShieldCheck /> {t.activePass}</h3>
              <span className="badge badge-active">● {t.active}</span>
            </div>
            <div className="active-pass-body">
              {/* Pass details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div>
                  <small style={{ color: '#5F7068' }}>{t.helperLabel}</small>
                  <div style={{ fontWeight: 600 }}>{helperName}</div>
                  <div style={{ fontSize: '.82rem', color: '#5F7068' }}>{t[helperTypeKey[helperType]] || helperType}</div>
                </div>
                <div>
                  <small style={{ color: '#5F7068' }}>{t.expiresIn}</small>
                  <div className={`countdown ${seconds < 120 ? 'expiring' : ''}`}>
                    <Clock />
                    {seconds > 0 ? fmt(seconds) : t.expired}
                  </div>
                </div>
              </div>

              {/* Allowed actions */}
              <div className="actions-list">
                {activePass.allowed_actions.map((a) => {
                  const risk = actions.find((m) => m.action === a)?.risk || 'LOW';
                  const Icon = ICONS[a] || Eye;
                  return (
                    <span key={a} className={`action-tag ${risk.toLowerCase()}`}>
                      {risk === 'HIGH' ? <Lock /> : <Icon />}
                      {t[actionKey[a]] || a}
                    </span>
                  );
                })}
              </div>

              <hr className="divider" />

              {/* Revoke */}
              <button
                className="btn btn-danger btn-full"
                onClick={handleRevoke}
                disabled={revoking}
              >
                {revoking ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <XCircle />}
                {t.revokePass}
              </button>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div style={{ marginTop: 20 }}>
              <h4 style={{ fontSize: '.92rem', fontWeight: 700, color: '#5F7068', marginBottom: 8 }}>{t.whatHappened}</h4>
              <div className="summary-box">{summary}</div>
            </div>
          )}

          {/* Audit Log */}
          <AuditLog audit={audit} lang={lang} citizenName={citizen?.name} helperName={helperName} />
        </div>
      )}

      {/* ══════════════════ EXPIRED / REVOKED PASS (show status + audit) ══════════════════ */}
      {!activePass && !showConfirmation && audit.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          {summary && (
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ fontSize: '.92rem', fontWeight: 700, color: '#5F7068', marginBottom: 8 }}>{t.whatHappened}</h4>
              <div className="summary-box">{summary}</div>
            </div>
          )}
          <AuditLog audit={audit} lang={lang} citizenName={citizen?.name} helperName={helperName} />
        </div>
      )}

      {/* ══════════════════ PASS CREATION FORM ══════════════════ */}
      {!activePass && !showConfirmation && (
        <div className="card">
          <div className="creation-header">
            <h2>{t.giveAccess}</h2>
            <p>{t.giveAccessSub}</p>
          </div>

          {/* STEP 1: Choose helper */}
          <div className="step">
            <div className="step-label">
              <span className="step-num">1</span>
              {t.step1}
            </div>
            <select
              value={selectedHelper}
              onChange={(e) => setSelectedHelper(e.target.value)}
            >
              {helpers.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {t[helperTypeKey[h.helper_type]] || h.helper_type}
                </option>
              ))}
            </select>
          </div>

          {/* STEP 2: Choose actions */}
          <div className="step">
            <div className="step-label">
              <span className="step-num">2</span>
              {t.step2}
            </div>

            {/* Low risk */}
            <div className="risk-section low">
              <CheckCircle2 /> {t.lowRisk}
            </div>
            {lowRisk.map((a) => {
              const Icon = ICONS[a.action] || Eye;
              return (
                <label
                  key={a.action}
                  className={`action-checkbox ${selectedActions.includes(a.action) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(a.action)}
                    onChange={() => toggleAction(a.action)}
                  />
                  <Icon />
                  <span className="action-label">{a.label}</span>
                  <span className="badge badge-low">{t.lowRisk}</span>
                </label>
              );
            })}

            {/* High risk */}
            <div className="risk-section high">
              <Lock /> {t.highRisk}
            </div>
            {highRisk.map((a) => {
              const Icon = ICONS[a.action] || Landmark;
              return (
                <label
                  key={a.action}
                  className={`action-checkbox ${selectedActions.includes(a.action) ? 'checked' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedActions.includes(a.action)}
                    onChange={() => toggleAction(a.action)}
                  />
                  <Icon />
                  <span className="action-label">{a.label}</span>
                  <span className="badge badge-high"><Lock style={{ width: 10, height: 10 }} /> {t.highRiskNote}</span>
                </label>
              );
            })}
          </div>

          {/* STEP 3: Duration */}
          <div className="step">
            <div className="step-label">
              <span className="step-num">3</span>
              {t.step3}
            </div>
            <div className="duration-group">
              {[15, 30, 60].map((d) => (
                <button
                  key={d}
                  className={`dur-btn ${duration === d ? 'active' : ''}`}
                  onClick={() => setDuration(d)}
                >
                  {d} {t.minutes}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 4: Create */}
          <button
            className="btn btn-primary btn-full"
            onClick={handleCreate}
            disabled={creating || selectedActions.length === 0}
            style={{ marginTop: 8 }}
          >
            {creating ? <Loader2 style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck />}
            {t.createPass}
          </button>
        </div>
      )}

      {/* ══════════════════ SECURITY EXPLAINER ══════════════════ */}
      {!activePass && !showConfirmation && (
        <div className="security-explainer">
          <h4>{t.howProtects}</h4>
          <div className="security-grid">
            <div className="sec-step">
              <Target /><h5>{t.secScope}</h5><p>{t.secScopeDesc}</p>
            </div>
            <div className="sec-step">
              <Clock /><h5>{t.secTime}</h5><p>{t.secTimeDesc}</p>
            </div>
            <div className="sec-step">
              <ShieldAlert /><h5>{t.secStepUp}</h5><p>{t.secStepUpDesc}</p>
            </div>
            <div className="sec-step">
              <ClipboardList /><h5>{t.secAudit}</h5><p>{t.secAuditDesc}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════ AUDIT LOG SUB-COMPONENT ════════════════════════════ */

function AuditLog({ audit, lang, citizenName, helperName }) {
  const t = T[lang];
  if (!audit.length) return null;

  const eventMap = {
    pass_created: { text: 'evtPassCreated', icon: 'info' },
    pass_expired: { text: 'evtPassExpired', icon: 'warning' },
    pass_revoked: { text: 'evtPassRevoked', icon: 'danger' },
    action_executed: { text: 'evtActionExecuted', icon: 'success' },
    step_up_executed: { text: 'evtStepUpExecuted', icon: 'success' },
    step_up_requested: { text: 'evtStepUpRequested', icon: 'warning' },
    step_up_approved: { text: 'evtStepUpApproved', icon: 'success' },
    step_up_denied: { text: 'evtStepUpDenied', icon: 'danger' },
    blocked_out_of_scope: { text: 'evtBlockedScope', icon: 'danger' },
    blocked_expired: { text: 'evtBlockedExpired', icon: 'danger' },
    blocked_revoked: { text: 'evtBlockedRevoked', icon: 'danger' },
  };

  const getActorLabel = (actor) => {
    if (actor === 'citizen') return citizenName || t.citizen;
    if (actor === 'helper') return helperName || t.helper;
    return t.evtSystem || 'System';
  };

  const iconComponent = (type) => {
    if (type === 'success') return <CheckCircle2 />;
    if (type === 'warning') return <AlertTriangle />;
    if (type === 'danger') return <XCircle />;
    return <Info />;
  };

  return (
    <div className="audit-section">
      <h4>{t.recentActivity}</h4>
      {[...audit].reverse().map((entry) => {
        const mapped = eventMap[entry.event] || { text: null, icon: 'info' };
        const label = mapped.text ? t[mapped.text] : entry.event.replace(/_/g, ' ');
        const detail = entry.detail ? (t[actionKey[entry.detail]] || entry.detail) : '';
        const actor = getActorLabel(entry.actor);
        return (
          <div className="audit-entry" key={entry.id}>
            <div className={`audit-icon ${mapped.icon}`}>
              {iconComponent(mapped.icon)}
            </div>
            <div className="audit-event">
              <div><strong>{label}</strong> <span style={{ color: '#8A9790', fontSize: '.78rem' }}>· {actor}</span></div>
              {detail && <small>{detail}</small>}
            </div>
            <div className="audit-time">
              {asUTC(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
