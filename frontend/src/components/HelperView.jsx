import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Eye, Download, Phone, Landmark, Lock, CheckCircle2, XCircle, AlertTriangle, Loader2, Copy, ArrowRight, FileText } from 'lucide-react';
import { T, actionKey, helperTypeKey } from '../i18n';
import { getHelperPass, helperAct, getStepUp, getActions, asUTC } from '../api';

const actionIcons = {
  view_pension_status: Eye,
  download_pension_certificate: Download,
  update_mobile_number: Phone,
  change_bank_account: Landmark
};

export default function HelperView({ lang, passToken, setPassToken }) {
  const [passData, setPassData] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeAction, setActiveAction] = useState(null);
  const [result, setResult] = useState({ type: 'empty' });
  const [timeRemaining, setTimeRemaining] = useState('');
  
  const pollIntervalRef = useRef(null);

  // Initialize if token already exists
  useEffect(() => {
    if (passToken && !passData) {
      handleUsePass(passToken);
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!passData?.expires_at) return;

    const updateTimer = () => {
      const expiresAt = asUTC(passData.expires_at).getTime();
      const now = new Date().getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeRemaining(`${m}:${s.toString().padStart(2, '0')} ${T[lang].minutes}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [passData, lang]);

  // Polling for StepUp effect
  useEffect(() => {
    if (result.type === 'waiting' && result.stepUpId) {
      pollIntervalRef.current = setInterval(async () => {
        try {
          const stepUpRes = await getStepUp(passToken, result.stepUpId);
          if (stepUpRes.status === 'executed') {
            setResult({ type: 'success', data: stepUpRes.result, action: result.action || activeAction, stepUpApproved: true });
            clearInterval(pollIntervalRef.current);
          } else if (stepUpRes.status === 'blocked') {
            setResult({ type: 'denied' });
            clearInterval(pollIntervalRef.current);
          } else if (stepUpRes.status === 'already_executed') {
            setResult({ type: 'blocked', message: T[lang].actionAlreadyDone });
            clearInterval(pollIntervalRef.current);
          }
        } catch (err) {
          console.error(err);
        }
      }, 1500);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [result, passToken, lang, activeAction]);

  const handleUsePass = async (tokenToUse) => {
    setLoading(true);
    setError(null);
    try {
      const pData = await getHelperPass(tokenToUse);
      setPassData(pData);
      setPassToken(tokenToUse);
      
      const acts = await getActions(lang);
      setActions(acts);
    } catch (err) {
      setError(T[lang].invalidToken);
      setPassData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (actionItem) => {
    setActiveAction(actionItem.action);
    setResult({ type: 'loading' });
    
    try {
      const res = await helperAct(passToken, actionItem.action);
      
      if (res.status === 'executed') {
        setResult({ type: 'success', data: res.result, action: actionItem.action });
      } else if (res.status === 'step_up_required') {
        setResult({ type: 'waiting', stepUpId: res.step_up_id, action: actionItem.action });
      } else {
        setResult({ type: 'blocked', message: res.error || T[lang].actionBlocked });
      }
    } catch (err) {
      let msg = err.message || T[lang].actionBlocked;
      if (err.message && err.message.toLowerCase().includes('revoked')) {
        msg = T[lang].passRevoked;
      } else if (err.message && err.message.toLowerCase().includes('expired')) {
        msg = T[lang].passExpired;
      }
      setResult({ type: 'blocked', message: msg });
    }
  };

  const downloadMockCert = (certName) => {
    const content = `MOCK GOVERNMENT PENSION SERVICE
==================================================
PENSION DISBURSEMENT CERTIFICATE
Beneficiary: ${passData.citizen_name || 'Savitri Devi'}
PPO Number: PPO-2024-88421
Monthly Pension: ₹3,000
Bank Account: XXXX-1234
Status: ACTIVE / VERIFIED
Authorized Helper: ${passData.helper_name || 'Ravi'} (${passData.helper_type || 'CSC Operator'})
Issued via: Sahayak Pass Delegated Access
Date: ${new Date().toLocaleDateString()}
==================================================
This is a mock pension certificate for demonstration purposes only.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = certName || 'mock-pension-certificate.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!passData) {
    return (
      <div className="card">
        <div className="helper-header">
          <h2><ShieldCheck className="icon" /> {T[lang].helperCounter}</h2>
          <p>{T[lang].helperCounterSub}</p>
        </div>
        
        <div className="mock-banner">
          <AlertTriangle className="icon-sm" />
          {T[lang].mockService}: {T[lang].mockDisclaimer}
        </div>

        <div style={{ marginTop: '20px' }}>
          <label>{T[lang].pasteSahayakPass}</label>
          <div className="token-input-group">
            <input 
              type="text" 
              placeholder={T[lang].tokenPlaceholder} 
              value={passToken} 
              onChange={e => setPassToken(e.target.value)}
              className="input-field" 
            />
            <button className="btn btn-primary" onClick={() => handleUsePass(passToken)} disabled={loading || !passToken}>
              {loading ? <Loader2 className="spin" size={18} /> : T[lang].usePass}
            </button>
          </div>
          {error && <div className="error-msg">{error}</div>}
        </div>
      </div>
    );
  }

  // Filter actions for display
  const authorizedActions = actions.filter(a => passData.allowed_actions.includes(a.action) && a.risk === 'LOW');
  const sensitiveActions = actions.filter(a => a.risk === 'HIGH');

  const renderResultContent = () => {
    if (result.type === 'empty') return (
      <div className="result-empty">
        <Eye /><p>{T[lang].noResultYet}</p>
      </div>
    );
    
    if (result.type === 'loading') return (
      <div className="result-card result-waiting">
        <Loader2 className="result-icon" /><div><h4>…</h4></div>
      </div>
    );

    if (result.type === 'waiting') return (
      <div className="result-card result-waiting">
        <Lock className="result-icon" style={{ color: '#D97706' }} />
        <div>
          <h4>🔐 {T[lang].actionWaiting}</h4>
          <p>{T[lang].actionWaitingSub}</p>
        </div>
      </div>
    );

    if (result.type === 'denied') return (
      <div className="result-card result-denied">
        <XCircle className="result-icon" />
        <div>
          <h4>✕ {T[lang].actionDenied}</h4>
          <p>{T[lang].actionDeniedSub}</p>
        </div>
      </div>
    );

    if (result.type === 'blocked') return (
      <div className="result-card result-blocked">
        <XCircle className="result-icon" />
        <div>
          <h4>✕ {T[lang].actionBlocked}</h4>
          <p>{result.message}</p>
        </div>
      </div>
    );

    if (result.type === 'success') {
      const act = result.action;
      const data = result.data || {};
      return (
        <div className="result-card result-success">
          <CheckCircle2 className="result-icon" />
          <div style={{ flex: 1 }}>
            <h4>{result.stepUpApproved ? `✓ ${T[lang].actionApproved}` : `✓ ${T[lang].actionSuccess}`}</h4>
            
            {act === 'view_pension_status' && (
              <table className="pension-table">
                <tbody>
                  <tr><td>{T[lang].beneficiary}</td><td>{passData.citizen_name}</td></tr>
                  <tr><td>{T[lang].statusLabel}</td><td style={{ color: '#059669', fontWeight: 600 }}>{data.pension_status || 'Active'}</td></tr>
                  <tr><td>{T[lang].monthlyPension}</td><td>{data.monthly_pension || '₹3,000'}</td></tr>
                  <tr><td>{T[lang].account}</td><td>{data.bank_account || 'XXXX-1234'}</td></tr>
                </tbody>
              </table>
            )}
            
            {act === 'download_pension_certificate' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FileText style={{ color: '#059669', width: 22, height: 22 }} />
                  <span>{T[lang].certReady} — <code>{data.certificate || 'mock-pension-certificate.pdf'}</code></span>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => downloadMockCert(data.certificate)}>
                  <Download size={14} /> Download Certificate
                </button>
              </div>
            )}

            {act === 'change_bank_account' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>{T[lang].bankUpdated}:</strong> {data.bank_account || 'XXXX-5678'}
              </p>
            )}
            {act === 'update_mobile_number' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>{T[lang].mobileUpdated}:</strong> {data.phone || 'XXXXXX7890'}
              </p>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="card">
      <div className="helper-header">
        <h2><ShieldCheck className="icon" /> {T[lang].helperCounter}</h2>
      </div>

      <div className="mock-banner">
        <AlertTriangle className="icon-sm" />
        {T[lang].mockService}: {T[lang].mockDisclaimer}
      </div>

      <div className="auth-banner">
        <div className="auth-banner-top">
          <CheckCircle2 size={16} /> <strong>{T[lang].passActive}</strong>
        </div>
        <div className="auth-banner-body">
          <div className="auth-banner-item">
            <span>{T[lang].citizenLabel}:</span>
            <strong>{passData.citizen_name}</strong>
          </div>
          <div className="auth-banner-item">
            <span>Helper:</span>
            <strong>{passData.helper_name}</strong>
            {passData.helper_type && <span className="badge" style={{ marginLeft: '6px' }}>{T[lang][helperTypeKey[passData.helper_type]] || passData.helper_type}</span>}
          </div>
          <div className="auth-banner-item">
            <span>{T[lang].expiresIn}:</span>
            <strong className={`countdown ${timeRemaining === 'Expired' ? 'expiring' : ''}`}>{timeRemaining}</strong>
          </div>
        </div>
      </div>

      <div className="authorized-section" style={{ marginTop: '20px' }}>
        <h3>{T[lang].youreAuthorized}</h3>
        {authorizedActions.map(a => {
          const Icon = actionIcons[a.action] || ArrowRight;
          return (
            <div key={a.action} className="action-row low" onClick={() => handleAction(a)}>
              <Icon className="icon-sm" />
              <div style={{ flex: 1 }}>
                <div className="action-row-label">{T[lang][actionKey[a.action]] || a.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {sensitiveActions.length > 0 && (
        <div className="sensitive-section" style={{ marginTop: '20px' }}>
          <h3><Lock size={16} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}/> {T[lang].sensitiveActions}</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '12px' }}>{T[lang].requiresApproval}</p>
          {sensitiveActions.map(a => {
            const Icon = actionIcons[a.action] || ArrowRight;
            return (
              <div key={a.action} className="action-row high sensitive-row" onClick={() => handleAction(a)}>
                <Icon className="icon-sm" />
                <div style={{ flex: 1 }}>
                  <div className="action-row-label">{T[lang][actionKey[a.action]] || a.label}</div>
                  <div className="action-row-meta">{T[lang].clickToRequest}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        {renderResultContent()}
      </div>
    </div>
  );
}
