import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, Eye, Download, Phone, Landmark, Lock, CheckCircle2,
  XCircle, AlertTriangle, Loader2, ArrowRight, FileText,
  GraduationCap, HeartPulse, FileCheck, RefreshCw, UserCheck, UserPlus,
  Building2, Layers, Ban
} from 'lucide-react';
import { T, actionKey, helperTypeKey, servicesList } from '../i18n';
import { getHelperPass, helperAct, getStepUp, getActions, asUTC } from '../api';

const SERVICE_ICONS = {
  welfare_pensions: Landmark,
  certificates_documents: FileText,
  education_scholarships: GraduationCap,
  health_services: HeartPulse,
};

const actionIcons = {
  // Welfare
  view_pension_status: Eye,
  download_pension_certificate: Download,
  update_mobile_number: Phone,
  change_bank_account: Landmark,
  // Certificates
  view_certificate_status: FileCheck,
  download_issued_certificate: Download,
  request_certificate_reissuance: RefreshCw,
  modify_certificate_details: UserCheck,
  // Education
  view_scholarship_status: GraduationCap,
  download_scholarship_sanction: Download,
  update_disbursement_bank: Landmark,
  modify_student_profile: UserCheck,
  // Health
  view_health_coverage: HeartPulse,
  download_abha_card: Download,
  link_new_beneficiary: UserPlus,
  update_primary_health_center: Building2,
};

export default function HelperView({ lang, passToken, setPassToken }) {
  const [passData, setPassData] = useState(null);
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeAction, setActiveAction] = useState(null);
  const [result, setResult] = useState({ type: 'empty' });
  const [timeRemaining, setTimeRemaining] = useState('');
  const [selectedService, setSelectedService] = useState('welfare_pensions');
  
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

      // Auto-focus on service containing allowed actions if possible
      const firstAllowed = acts.find(a => pData.allowed_actions?.includes(a.action));
      if (firstAllowed?.service) {
        setSelectedService(firstAllowed.service);
      }
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

  const downloadMockCert = (certName, serviceId) => {
    let serviceHeader = 'MOCK GOVERNMENT PUBLIC SERVICE';
    if (serviceId === 'welfare_pensions') serviceHeader = 'DEPARTMENT OF PENSIONS & SOCIAL SECURITY';
    else if (serviceId === 'certificates_documents') serviceHeader = 'DEPARTMENT OF REVENUE & CIVIC CERTIFICATES';
    else if (serviceId === 'education_scholarships') serviceHeader = 'DIRECTORATE OF HIGHER EDUCATION & SCHOLARSHIPS';
    else if (serviceId === 'health_services') serviceHeader = 'NATIONAL HEALTH AUTHORITY (ABHA)';

    const content = `==================================================
${serviceHeader} (MOCK)
==================================================
DOCUMENT DISBURSEMENT & VERIFICATION CERTIFICATE
Beneficiary: ${passData.citizen_name || 'Savitri Devi'}
Document Reference: ${certName || 'DOC-2024-88421'}
Status: ACTIVE / VERIFIED
Authorized Helper: ${passData.helper_name || 'Ravi'} (${passData.helper_type || 'CSC Operator'})
Authorization Layer: Sahayak Pass Scoped Delegation
Issue Date: ${new Date().toLocaleDateString()}
==================================================
Sahayak Pass is a hackathon prototype using mock public services.
It is not connected to real government systems.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = certName || 'mock-public-service-document.txt';
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

  // Filter actions for the selected service
  const serviceActions = actions.filter(a => (a.service || 'welfare_pensions') === selectedService);

  // 1. Permitted actions: in passData.allowed_actions AND LOW risk
  const authorizedActions = serviceActions.filter(a => passData.allowed_actions.includes(a.action) && a.risk === 'LOW');
  
  // 2. Sensitive actions: HIGH risk in this service
  const sensitiveActions = serviceActions.filter(a => a.risk === 'HIGH');

  // 3. Out-of-scope actions: LOW risk actions in this service that are NOT in the pass
  const outOfScopeActions = serviceActions.filter(a => !passData.allowed_actions.includes(a.action) && a.risk === 'LOW');

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
            
            {/* ── Welfare & Pensions Results ── */}
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
                <button className="btn btn-sm btn-outline" onClick={() => downloadMockCert(data.certificate, 'welfare_pensions')}>
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

            {/* ── Certificates & Documents Results ── */}
            {act === 'view_certificate_status' && (
              <table className="pension-table">
                <tbody>
                  <tr><td>Applicant</td><td>{passData.citizen_name}</td></tr>
                  <tr><td>Application ID</td><td><code>{data.application_id || 'CERT-2024-9912'}</code></td></tr>
                  <tr><td>Certificate Type</td><td>{data.certificate_type || 'Income & Asset Certificate'}</td></tr>
                  <tr><td>Status</td><td style={{ color: '#059669', fontWeight: 600 }}>{data.status || 'Approved / Issued'}</td></tr>
                  <tr><td>Validity</td><td>{data.valid_until || '31-Mar-2027'}</td></tr>
                </tbody>
              </table>
            )}

            {act === 'download_issued_certificate' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FileCheck style={{ color: '#059669', width: 22, height: 22 }} />
                  <span>{T[lang].certReady} — <code>{data.certificate || 'mock-income-certificate.pdf'}</code></span>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => downloadMockCert(data.certificate, 'certificates_documents')}>
                  <Download size={14} /> Download Issued Certificate
                </button>
              </div>
            )}

            {act === 'request_certificate_reissuance' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Reissuance Request Submitted:</strong> Acknowledgement <code>{data.acknowledgement_no || 'ACK-88129'}</code>
              </p>
            )}

            {act === 'modify_certificate_details' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Applicant Record Updated:</strong> {data.applicant || 'Savitri Devi'}
              </p>
            )}

            {/* ── Education & Scholarships Results ── */}
            {act === 'view_scholarship_status' && (
              <table className="pension-table">
                <tbody>
                  <tr><td>Beneficiary</td><td>{passData.citizen_name}</td></tr>
                  <tr><td>Scheme</td><td>{data.scheme || 'Post-Matric Merit Scholarship'}</td></tr>
                  <tr><td>Academic Year</td><td>{data.academic_year || '2024-25'}</td></tr>
                  <tr><td>Status</td><td style={{ color: '#059669', fontWeight: 600 }}>{data.status || 'Sanctioned'}</td></tr>
                  <tr><td>Amount</td><td>{data.amount || '₹12,000'}</td></tr>
                  <tr><td>Disbursed To</td><td>{data.disbursed_to || 'XXXX-1234'}</td></tr>
                </tbody>
              </table>
            )}

            {act === 'download_scholarship_sanction' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <GraduationCap style={{ color: '#059669', width: 22, height: 22 }} />
                  <span>Sanction order ready — <code>{data.certificate || 'mock-scholarship-sanction.pdf'}</code></span>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => downloadMockCert(data.certificate, 'education_scholarships')}>
                  <Download size={14} /> Download Sanction Letter
                </button>
              </div>
            )}

            {act === 'update_disbursement_bank' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Scholarship Disbursement Bank Updated:</strong> {data.bank_account || 'XXXX-9876'}
              </p>
            )}

            {act === 'modify_student_profile' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Student Profile Updated:</strong> {data.student || 'Anil Kumar'}
              </p>
            )}

            {/* ── Health Services Results ── */}
            {act === 'view_health_coverage' && (
              <table className="pension-table">
                <tbody>
                  <tr><td>Beneficiary</td><td>{passData.citizen_name}</td></tr>
                  <tr><td>Scheme</td><td>{data.scheme || 'Universal Health Protection Scheme'}</td></tr>
                  <tr><td>Coverage Status</td><td style={{ color: '#059669', fontWeight: 600 }}>{data.policy_status || 'Active'}</td></tr>
                  <tr><td>Coverage Limit</td><td>{data.coverage_amount || '₹5,00,000'}</td></tr>
                </tbody>
              </table>
            )}

            {act === 'download_abha_card' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <HeartPulse style={{ color: '#059669', width: 22, height: 22 }} />
                  <span>Health Card (ABHA) ready — <code>{data.certificate || 'mock-health-card.pdf'}</code></span>
                </div>
                <button className="btn btn-sm btn-outline" onClick={() => downloadMockCert(data.certificate, 'health_services')}>
                  <Download size={14} /> Download ABHA Card
                </button>
              </div>
            )}

            {act === 'link_new_beneficiary' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Family Member Linked to Card:</strong> {data.member || 'Anil (Son)'}
              </p>
            )}

            {act === 'update_primary_health_center' && (
              <p style={{ marginTop: 10, fontSize: '.92rem' }}>
                ✓ <strong>Primary Health Center Updated:</strong> {data.phc || 'Community Health Centre - Sector 4'}
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
        <p>{T[lang].helperCounterSub}</p>
      </div>

      {/* Authorized Pass Metadata Banner */}
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
            <span>{T[lang].helperLabel}:</span>
            <strong>{passData.helper_name}</strong>
            {passData.helper_type && <span className="badge" style={{ marginLeft: '6px' }}>{T[lang][helperTypeKey[passData.helper_type]] || passData.helper_type}</span>}
          </div>
          <div className="auth-banner-item">
            <span>{T[lang].accessExpires}:</span>
            <strong className={`countdown ${timeRemaining === 'Expired' ? 'expiring' : ''}`}>{timeRemaining}</strong>
          </div>
        </div>
      </div>

      {/* Service Selector on Helper Counter */}
      <div style={{ marginTop: '24px' }}>
        <div className="service-selector-label">
          <Layers />
          <span>{T[lang].serviceSelector}</span>
        </div>
        <div className="service-filter-bar">
          {servicesList.map(srv => {
            const SrvIcon = SERVICE_ICONS[srv.id] || Landmark;
            const hasScopedActs = passData.allowed_actions?.some(a => {
              const item = actions.find(x => x.action === a);
              return (item?.service || 'welfare_pensions') === srv.id;
            });
            return (
              <button
                key={srv.id}
                type="button"
                className={`service-filter-btn ${selectedService === srv.id ? 'active' : ''}`}
                onClick={() => setSelectedService(srv.id)}
              >
                <SrvIcon />
                <span>{T[lang][srv.labelKey]}</span>
                {hasScopedActs && (
                  <span style={{ fontSize: '.68rem', padding: '1px 5px', borderRadius: 4, background: selectedService === srv.id ? '#144A2F' : '#E8F5EC', color: selectedService === srv.id ? '#fff' : '#059669' }}>
                    Scoped
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. Authorized Permitted Actions */}
      <div className="authorized-section" style={{ marginTop: '16px' }}>
        <h3>{T[lang].youreAuthorized}</h3>
        {authorizedActions.length > 0 ? (
          authorizedActions.map(a => {
            const Icon = actionIcons[a.action] || ArrowRight;
            return (
              <div key={a.action} className="action-row low" onClick={() => handleAction(a)}>
                <Icon className="icon-sm" />
                <div style={{ flex: 1 }}>
                  <div className="action-row-label">{T[lang][actionKey[a.action]] || a.label}</div>
                  <div className="action-row-meta" style={{ color: '#059669' }}>✓ Scoped in pass — Click to execute</div>
                </div>
                <span className="badge badge-low">{T[lang].lowRisk}</span>
              </div>
            );
          })
        ) : (
          <p style={{ fontSize: '.84rem', color: '#8A9790', fontStyle: 'italic', marginBottom: '8px' }}>
            No low-risk tasks for this service are authorized in the active pass.
          </p>
        )}
      </div>

      {/* 2. Sensitive Actions (Requires Step-Up Approval) */}
      {sensitiveActions.length > 0 && (
        <div className="sensitive-section" style={{ marginTop: '20px' }}>
          <h3><Lock size={15} style={{ marginRight: '6px', verticalAlign: 'text-bottom' }}/> {T[lang].sensitiveActions}</h3>
          <p style={{ fontSize: '13px', color: '#666', marginBottom: '10px' }}>{T[lang].requiresApproval}</p>
          {sensitiveActions.map(a => {
            const Icon = actionIcons[a.action] || ArrowRight;
            const isScoped = passData.allowed_actions?.includes(a.action);
            return (
              <div key={a.action} className="action-row high sensitive-row" onClick={() => handleAction(a)}>
                <Icon className="icon-sm" />
                <div style={{ flex: 1 }}>
                  <div className="action-row-label">{T[lang][actionKey[a.action]] || a.label}</div>
                  <div className="action-row-meta">
                    {isScoped ? T[lang].clickToRequest : `${T[lang].requiresApproval} (Demo test)`}
                  </div>
                </div>
                <span className="badge badge-high"><Lock style={{ width: 10, height: 10 }} /> {T[lang].highRisk}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Out of Scope Actions (Test Policy Enforcement) */}
      {outOfScopeActions.length > 0 && (
        <div className="out-of-scope-section">
          <h3><Ban /> {T[lang].outOfScopeActions}</h3>
          <p style={{ fontSize: '12px', color: '#8A9790', marginBottom: '8px' }}>
            These tasks were not authorized by the citizen and will be blocked by policy.
          </p>
          {outOfScopeActions.map(a => {
            const Icon = actionIcons[a.action] || ArrowRight;
            return (
              <div key={a.action} className="action-row out-of-scope" onClick={() => handleAction(a)}>
                <Icon className="icon-sm" />
                <div style={{ flex: 1 }}>
                  <div className="action-row-label">{T[lang][actionKey[a.action]] || a.label}</div>
                  <div className="action-row-meta">{T[lang].clickToTestScope}</div>
                </div>
                <span className="badge badge-revoked">Out of Scope</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Action Execution Result */}
      <div style={{ marginTop: '24px' }}>
        {renderResultContent()}
      </div>
    </div>
  );
}
