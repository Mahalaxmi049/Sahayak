import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, Download, Lock, CheckCircle2,
  XCircle, Clock, Loader2, ExternalLink, Check, Eye, AlertCircle
} from 'lucide-react';
import { T, actionKey, getServiceIdFromActions, getServiceLabel, ACTION_EXPLANATIONS } from '../i18n';
import { helperAct, getStepUp, asUTC } from '../api';
import { getOfficialPortal } from '../config/officialPortals';

const ACTION_RISKS = {
  // Welfare & Pensions
  view_pension_status: 'LOW',
  download_pension_certificate: 'LOW',
  update_mobile_number: 'HIGH',
  change_bank_account: 'HIGH',
  // Certificates & Documents
  view_certificate_status: 'LOW',
  download_issued_certificate: 'LOW',
  request_certificate_reissuance: 'HIGH',
  modify_certificate_details: 'HIGH',
  // Education & Scholarships
  view_scholarship_status: 'LOW',
  download_scholarship_sanction: 'LOW',
  update_disbursement_bank: 'HIGH',
  modify_student_profile: 'HIGH',
  // Health Services
  view_health_coverage: 'LOW',
  download_abha_card: 'LOW',
  link_new_beneficiary: 'HIGH',
  update_primary_health_center: 'HIGH',
  // Citizen Services
  view_citizen_service_status: 'LOW',
  download_service_acknowledgement: 'LOW',
  modify_citizen_information: 'HIGH',
};

export default function HelperServiceWorkspaceView({
  lang,
  activePass,
  passToken,
  citizen,
  helper,
  onBack,
  onSwitchToCitizen,
  refreshAll,
}) {
  const t = T[lang] || T.en;

  const helperName = helper?.name || activePass?.helper_name || 'Ravi Kumar';
  const citizenName = citizen?.name || activePass?.citizen_name || 'Savitri Devi';

  const serviceId = activePass?.service || getServiceIdFromActions(activePass?.allowed_actions);
  const serviceName = getServiceLabel(serviceId, t);
  const officialPortal = getOfficialPortal(serviceId);

  const allowedActions = activePass?.allowed_actions || [];
  const lowRiskActions = allowedActions.filter((a) => ACTION_RISKS[a] === 'LOW');
  const sensitiveActions = allowedActions.filter((a) => ACTION_RISKS[a] === 'HIGH');

  /* ── Action State ── */
  const [executing, setExecuting] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  const [completedActions, setCompletedActions] = useState([]);

  const [waitingForCitizen, setWaitingForCitizen] = useState(false);
  const [activeStepUpId, setActiveStepUpId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);

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
        setCountdown('00:00');
        setIsExpired(true);
        refreshAll?.();
        return;
      }

      setIsExpired(false);
      const totalSec = Math.floor(diff / 1000);
      const m = Math.floor(totalSec / 60);
      const s = totalSec % 60;
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [activePass]);

  /* ── Polling for Step-Up Approval ── */
  useEffect(() => {
    let interval = null;
    if (waitingForCitizen && activeStepUpId && passToken) {
      interval = setInterval(async () => {
        try {
          const res = await getStepUp(passToken, activeStepUpId);
          if (res.status === 'executed' || res.status === 'already_executed') {
            setWaitingForCitizen(false);
            setCompletedActions((prev) => [...prev, pendingAction]);
            setActionResult({
              type: 'action_completed',
              action: pendingAction,
              data: res.result || {},
            });
            setPendingAction(null);
            refreshAll?.();
          } else if (res.status === 'blocked') {
            setWaitingForCitizen(false);
            setActionResult({
              type: 'denied',
              action: pendingAction,
              reason: res.reason,
            });
            setPendingAction(null);
            refreshAll?.();
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waitingForCitizen, activeStepUpId, passToken, pendingAction]);

  /* ── Perform Action ── */
  const handlePerformAction = async (actionCode) => {
    if (!passToken || !activePass) return;
    setExecuting(actionCode);
    setActionResult(null);

    try {
      const res = await helperAct(passToken, actionCode);

      if (res.status === 'executed') {
        setCompletedActions((prev) => [...new Set([...prev, actionCode])]);
        if (actionCode.startsWith('view_')) {
          setActionResult({
            type: 'view_record',
            action: actionCode,
            data: res.result,
          });
        } else if (actionCode.startsWith('download_')) {
          setActionResult({
            type: 'download_doc',
            action: actionCode,
            data: res.result,
          });
        } else {
          setActionResult({
            type: 'action_completed',
            action: actionCode,
            data: res.result,
          });
        }
        refreshAll?.();
      } else if (res.status === 'step_up_required') {
        setActiveStepUpId(res.step_up_id);
        setPendingAction(actionCode);
        setWaitingForCitizen(true);
        setActionResult({
          type: 'step_up_waiting',
          action: actionCode,
          stepUpId: res.step_up_id,
        });
        refreshAll?.();
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('outside this pass') || err.status === 403) {
        setActionResult({ type: 'out_of_scope', action: actionCode });
      } else if (msg.includes('expired') || err.status === 401) {
        setIsExpired(true);
      } else {
        setActionResult({ type: 'out_of_scope', action: actionCode });
      }
      refreshAll?.();
    } finally {
      setExecuting(null);
    }
  };

  /* ── Document Download Simulation ── */
  const triggerDownload = (actionCode) => {
    let filename = 'document-preview.txt';
    let title = 'OFFICIAL DOCUMENT RECORD';
    let details = '';

    switch (actionCode) {
      case 'download_issued_certificate':
        filename = 'income-certificate-preview.txt';
        title = 'INCOME & ASSET CERTIFICATE';
        details = `Applicant: ${citizenName}\nCertificate No: CERT-2024-9912\nType: Income & Asset Certificate\nIssuing Authority: Revenue Department\nStatus: APPROVED / ISSUED\nValid Until: 31-Mar-2027\nAuthorized Helper: ${helperName}`;
        break;
      case 'download_scholarship_sanction':
        filename = 'scholarship-sanction-preview.txt';
        title = 'SCHOLARSHIP SANCTION ORDER';
        details = `Student / Applicant: ${citizenName}\nScheme: Post-Matric Merit Scholarship (2024-25)\nSanctioned Amount: ₹12,000\nDisbursement Account: XXXX-1234\nStatus: SANCTIONED\nAuthorized Helper: ${helperName}`;
        break;
      case 'download_abha_card':
        filename = 'abha-health-card-preview.txt';
        title = 'AYUSHMAN BHARAT HEALTH ACCOUNT (ABHA) CARD';
        details = `Beneficiary: ${citizenName}\nABHA Number: 91-4421-8890-1234\nScheme: Universal Health Protection Scheme\nAnnual Coverage: ₹5,00,000\nStatus: ACTIVE / VERIFIED\nAuthorized Helper: ${helperName}`;
        break;
      case 'download_service_acknowledgement':
        filename = 'service-acknowledgement-preview.txt';
        title = 'CITIZEN SERVICE REQUEST ACKNOWLEDGEMENT';
        details = `Applicant: ${citizenName}\nToken / Grievance ID: CIT-4491\nService: Civic Grievance & Service Request\nSubject: Water Supply Line Repair\nStatus: IN PROGRESS\nAuthorized Helper: ${helperName}`;
        break;
      case 'download_pension_certificate':
      default:
        filename = 'pension-sanction-preview.txt';
        title = 'PENSION SANCTION & BENEFIT RECORD';
        details = `Beneficiary: ${citizenName}\nMonthly Entitlement: ₹8,500\nStatus: ACTIVE / VERIFIED\nDisbursement Account: XXXX-1234\nScheme: National Social Assistance Programme (NSAP)\nAuthorized Helper: ${helperName}`;
        break;
    }

    const text = `SAHAYAK PASS — ASSISTED CITIZEN SERVICE RECORD
============================================================
${title}
============================================================
${details}
Date Issued: ${new Date().toLocaleDateString()}
============================================================
Assisted authorization provided via Sahayak Pass.`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  /* Helper action state resolver */
  const getActionState = (act) => {
    if (activePass?.status === 'revoked') return 'Revoked';
    if (isExpired || activePass?.status === 'expired') return 'Expired';
    if (completedActions.includes(act)) return 'Completed';
    if (waitingForCitizen && pendingAction === act) return 'Waiting for citizen approval';
    return 'Available';
  };

  if (!activePass || activePass.status !== 'active' || isExpired) {
    const isRevoked = activePass?.status === 'revoked';
    return (
      <div className="service-workspace">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t.back || 'Back to Assisted Sessions'}</span>
        </button>

        <div className="empty-state-simple" style={{ padding: '36px 20px' }}>
          <strong style={{ fontSize: '1.1rem', color: isRevoked ? 'var(--color-danger)' : 'var(--text-main)' }}>
            {isRevoked ? (t.accessRevokedTitle || 'Access revoked') : (t.passExpiredMessage || 'This access pass has expired.')}
          </strong>
          <p style={{ maxWidth: 420, margin: '8px auto 16px auto' }}>
            {isRevoked
              ? (t.accessRevokedDesc ? t.accessRevokedDesc.replace('{name}', helperName) : `${helperName} can no longer use this pass.`)
              : (t.passExpiredMessage || 'This access pass has expired and can no longer be used.')}
          </p>
          {onSwitchToCitizen && (
            <button type="button" className="btn btn-secondary" onClick={onSwitchToCitizen}>
              <span>{t.continueCitizen || 'Switch to Citizen'} →</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="service-workspace">
      {/* ── Top Back Button ── */}
      <button type="button" className="btn-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>Back to Assisted Sessions</span>
      </button>

      {/* ── Workspace Header ── */}
      <div className="workspace-header-card">
        <h2>{t.helpingCitizen ? t.helpingCitizen.replace('{name}', citizenName) : `Helping ${citizenName}`}</h2>
        <p className="workspace-subhead">{serviceName}</p>
        <div className="workspace-timer-badge">
          <Clock size={14} />
          <span>{t.passActive || 'Access pass active'} · {t.expiresIn || 'Expires in'} {countdown}</span>
        </div>
      </div>

      {/* ── Official Government Destination Portal Button (Section 6 & 9) ── */}
      <div className="official-portal-banner">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', color: 'var(--color-navy)' }}>
              {officialPortal.name}
            </strong>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {t.portalClarification}
            </span>
          </div>
          <a
            href={officialPortal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            <span>{t.continueToOfficialWebsite || 'Continue to official website'}</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>

      {/* ── Available Tasks (Low-risk) ── */}
      {lowRiskActions.length > 0 && (
        <div className="tasks-block">
          <div className="section-title">{t.availableTasksHeader || 'Permitted tasks'}</div>

          {lowRiskActions.map((act) => {
            const state = getActionState(act);
            return (
              <div key={act} className="task-item-row">
                <div className="task-item-info">
                  <strong>{t[actionKey[act]] || act.replace(/_/g, ' ')}</strong>
                  <span className={`task-state-badge state-${state.toLowerCase().replace(/\s+/g, '-')}`}>
                    {state}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePerformAction(act)}
                  disabled={executing !== null}
                >
                  {executing === act ? <Loader2 size={14} className="spin-icon" /> : null}
                  <span>
                    {act.startsWith('download_')
                      ? (t.downloadCertBtn || 'Download')
                      : (t.viewBtn || 'View')}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Needs Citizen Approval (Sensitive) ── */}
      {sensitiveActions.length > 0 && (
        <div className="tasks-block">
          <div className="section-title" style={{ color: 'var(--color-amber)' }}>
            {t.needsCitizenApprovalHeader || 'Requires citizen approval'}
          </div>

          {sensitiveActions.map((act) => {
            const state = getActionState(act);
            const isWaiting = waitingForCitizen && pendingAction === act;
            return (
              <div key={act} className="task-item-row">
                <div className="task-item-info">
                  <strong>{t[actionKey[act]] || act.replace(/_/g, ' ')}</strong>
                  <span className={`task-state-badge state-${state.toLowerCase().replace(/\s+/g, '-')}`}>
                    {state}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePerformAction(act)}
                  disabled={executing !== null || waitingForCitizen}
                >
                  {executing === act ? (
                    <Loader2 size={14} className="spin-icon" />
                  ) : (
                    <Lock size={13} style={{ color: 'var(--color-amber)' }} />
                  )}
                  <span>
                    {isWaiting
                      ? (t.waiting || 'Waiting for citizen…')
                      : (t.requestApprovalBtn || 'Request approval')}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          RESULTS DISPLAY AREA
      ══════════════════════════════════════════════════════════════ */}

      {/* 1. Sensitive Action: Step-Up Waiting */}
      {actionResult?.type === 'step_up_waiting' && (
        <div className="step-up-card-helper">
          <strong>{t.approvalRequiredTitle || 'Approval required'}</strong>
          <p>
            This action requires <strong>{citizenName}</strong>'s live approval before it can be completed.
          </p>
          <div style={{ fontSize: '0.84rem', color: '#78350f', marginBottom: 12 }}>
            <div>
              <strong>{t.requestedActionLabel || 'Requested action'}:</strong>{' '}
              {t[actionKey[actionResult.action]] || actionResult.action?.replace(/_/g, ' ')}
            </div>
            <div>
              <strong>{t.requestedByLabel || 'Requested by'}:</strong> {helperName}
            </div>
            <div style={{ marginTop: 4 }}>
              <strong>{t.whyLabel || 'Why approval is needed'}:</strong>{' '}
              {ACTION_EXPLANATIONS[actionResult.action]?.why || 'Sensitive actions require explicit citizen confirmation to prevent unauthorized modifications.'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="waiting-indicator">
              <Loader2 size={15} className="spin-icon" />
              <span>{t.waitingForCitizenApprovalText || 'Waiting for citizen to confirm on their screen…'}</span>
            </div>

            {onSwitchToCitizen && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onSwitchToCitizen}
              >
                <span>Switch to Citizen Screen to Review →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Low-Risk Result: Record Details */}
      {actionResult?.type === 'view_record' && (
        <div className="result-card-realistic">
          <div className="result-header-row">
            <strong>
              {t[actionKey[actionResult.action]] || serviceName}
            </strong>
            <span className="service-badge-pill">{serviceName}</span>
          </div>

          {/* Welfare & Pensions */}
          {actionResult.action === 'view_pension_status' && (
            <div className="result-grid-clean">
              <div className="result-grid-cell">
                <span className="cell-label">{t.beneficiaryLabel || 'Beneficiary'}</span>
                <span className="cell-val">{actionResult.data?.beneficiary || citizenName}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">{t.statusLabel || 'Status'}</span>
                <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                  ● {actionResult.data?.pension_status || t.activeStatus || 'Active'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">{t.monthlyPensionLabel || 'Monthly entitlement'}</span>
                <span className="cell-val">{actionResult.data?.monthly_pension || '₹8,500'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">{t.lastCreditedLabel || 'Last credited date'}</span>
                <span className="cell-val">{actionResult.data?.last_credited || '01-Sep-2026'}</span>
              </div>
              <div className="result-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="cell-label">{t.accountLabel || 'Disbursement account'}</span>
                <span className="cell-val" style={{ fontFamily: 'monospace' }}>
                  {actionResult.data?.bank_account || 'XXXX-1234'}
                </span>
              </div>
            </div>
          )}

          {/* Certificates & Documents */}
          {actionResult.action === 'view_certificate_status' && (
            <div className="result-grid-clean">
              <div className="result-grid-cell">
                <span className="cell-label">Application ID</span>
                <span className="cell-val" style={{ fontFamily: 'monospace' }}>
                  {actionResult.data?.application_id || 'CERT-2024-9912'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Status</span>
                <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                  ● {actionResult.data?.status || 'Approved / Issued'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Certificate Type</span>
                <span className="cell-val">{actionResult.data?.certificate_type || 'Income & Asset Certificate'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Valid Until</span>
                <span className="cell-val">{actionResult.data?.valid_until || '31-Mar-2027'}</span>
              </div>
            </div>
          )}

          {/* Education & Scholarships */}
          {actionResult.action === 'view_scholarship_status' && (
            <div className="result-grid-clean">
              <div className="result-grid-cell">
                <span className="cell-label">Scholarship Scheme</span>
                <span className="cell-val">{actionResult.data?.scheme || 'Post-Matric Merit Scholarship'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Status</span>
                <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                  ● {actionResult.data?.status || 'Sanctioned'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Academic Year</span>
                <span className="cell-val">{actionResult.data?.academic_year || '2024-25'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Sanctioned Amount</span>
                <span className="cell-val">{actionResult.data?.amount || '₹12,000'}</span>
              </div>
              <div className="result-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="cell-label">Disbursed Account</span>
                <span className="cell-val" style={{ fontFamily: 'monospace' }}>
                  {actionResult.data?.disbursed_to || 'XXXX-1234'}
                </span>
              </div>
            </div>
          )}

          {/* Health Services */}
          {actionResult.action === 'view_health_coverage' && (
            <div className="result-grid-clean">
              <div className="result-grid-cell">
                <span className="cell-label">Health Scheme</span>
                <span className="cell-val">{actionResult.data?.scheme || 'Universal Health Protection Scheme'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Policy Status</span>
                <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                  ● {actionResult.data?.policy_status || 'Active'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Annual Coverage</span>
                <span className="cell-val">{actionResult.data?.coverage_amount || '₹5,00,000'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Beneficiary</span>
                <span className="cell-val">{actionResult.data?.beneficiary || citizenName}</span>
              </div>
            </div>
          )}

          {/* Citizen Services */}
          {actionResult.action === 'view_citizen_service_status' && (
            <div className="result-grid-clean">
              <div className="result-grid-cell">
                <span className="cell-label">Token Number</span>
                <span className="cell-val" style={{ fontFamily: 'monospace' }}>
                  {actionResult.data?.token_no || 'CIT-4491'}
                </span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Status</span>
                <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                  ● {actionResult.data?.status || 'In Progress'}
                </span>
              </div>
              <div className="result-grid-cell" style={{ gridColumn: 'span 2' }}>
                <span className="cell-label">Subject</span>
                <span className="cell-val">{actionResult.data?.subject || 'Water Supply Line Repair'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Service Type</span>
                <span className="cell-val">{actionResult.data?.service || 'Civic Grievance'}</span>
              </div>
              <div className="result-grid-cell">
                <span className="cell-label">Applicant</span>
                <span className="cell-val">{actionResult.data?.applicant || citizenName}</span>
              </div>
            </div>
          )}

          {/* Fallback for other view actions */}
          {!['view_pension_status', 'view_certificate_status', 'view_scholarship_status', 'view_health_coverage', 'view_citizen_service_status'].includes(actionResult.action) && (
            <div className="result-grid-clean">
              {Object.entries(actionResult.data || {}).map(([k, v]) => (
                <div key={k} className="result-grid-cell">
                  <span className="cell-label">{k.replace(/_/g, ' ')}</span>
                  <span className="cell-val">{String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. Document Download Preview */}
      {actionResult?.type === 'download_doc' && (
        <div className="result-card-realistic">
          <div className="result-header-row">
            <strong>
              {t[actionKey[actionResult.action]] || 'Document Ready'}
            </strong>
            <span className="service-badge-pill">{serviceName}</span>
          </div>

          <div className="cert-preview-box">
            <div style={{ fontWeight: 600, color: 'var(--color-navy)', marginBottom: 6 }}>
              {t.documentNotice || 'ILLUSTRATIVE PREVIEW · OFFICIAL CERTIFICATE ISSUED VIA RELEVANT PORTAL'}
            </div>

            {actionResult.action === 'download_pension_certificate' && (
              <>
                <div>Beneficiary: <strong>{citizenName}</strong></div>
                <div>Monthly Amount: <strong>₹8,500</strong></div>
                <div>Scheme: <strong>National Social Assistance Programme (NSAP)</strong></div>
                <div>Ref: <strong>DOC-NSAP-2026-8842</strong></div>
              </>
            )}

            {actionResult.action === 'download_issued_certificate' && (
              <>
                <div>Applicant: <strong>{citizenName}</strong></div>
                <div>Certificate: <strong>Income & Asset Certificate</strong></div>
                <div>Application Ref: <strong>CERT-2024-9912</strong></div>
                <div>Validity: <strong>31-Mar-2027</strong></div>
              </>
            )}

            {actionResult.action === 'download_scholarship_sanction' && (
              <>
                <div>Student: <strong>{citizenName}</strong></div>
                <div>Scheme: <strong>Post-Matric Merit Scholarship (2024-25)</strong></div>
                <div>Sanctioned Amount: <strong>₹12,000</strong></div>
                <div>Sanction Ref: <strong>SCH-2024-5510</strong></div>
              </>
            )}

            {actionResult.action === 'download_abha_card' && (
              <>
                <div>Cardholder: <strong>{citizenName}</strong></div>
                <div>Health ID (ABHA): <strong>91-4421-8890-1234</strong></div>
                <div>Scheme: <strong>Universal Health Protection Scheme</strong></div>
                <div>Status: <strong>ACTIVE / VERIFIED</strong></div>
              </>
            )}

            {actionResult.action === 'download_service_acknowledgement' && (
              <>
                <div>Applicant: <strong>{citizenName}</strong></div>
                <div>Token No: <strong>CIT-4491</strong></div>
                <div>Subject: <strong>Water Supply Line Repair</strong></div>
                <div>Status: <strong>IN PROGRESS</strong></div>
              </>
            )}
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => triggerDownload(actionResult.action)}
          >
            <Download size={14} />
            <span>{t.downloadDocBtn || 'Download Document'}</span>
          </button>
        </div>
      )}

      {/* 4. Sensitive Action Completed */}
      {actionResult?.type === 'action_completed' && (
        <div className="result-card-realistic">
          <div className="result-header-row">
            <strong style={{ color: 'var(--color-primary-dark)' }}>
              ✓ {t.actionCompletedTitle || 'Action completed'}
            </strong>
            <span className="service-badge-pill">{serviceName}</span>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 10 }}>
            {actionResult.action === 'change_bank_account' && 'The bank account was successfully updated.'}
            {actionResult.action === 'update_mobile_number' && 'The registered mobile number was successfully updated.'}
            {actionResult.action === 'request_certificate_reissuance' && 'Certificate reissuance request was successfully submitted.'}
            {actionResult.action === 'modify_certificate_details' && 'Certificate details update request was successfully recorded.'}
            {actionResult.action === 'update_disbursement_bank' && 'Scholarship disbursement bank account was successfully updated.'}
            {actionResult.action === 'modify_student_profile' && 'Student profile details were successfully updated.'}
            {actionResult.action === 'link_new_beneficiary' && 'New beneficiary member was successfully linked.'}
            {actionResult.action === 'update_primary_health_center' && 'Primary Health Centre was successfully updated.'}
            {actionResult.action === 'modify_citizen_information' && 'Citizen communication information was successfully updated.'}
            {!ACTION_RISKS[actionResult.action] && 'The requested action was successfully executed.'}
          </p>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            {actionResult.data?.bank_account && (
              <div>
                <span>Account:{' '}</span>
                <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                  {actionResult.data.bank_account}
                </strong>
                {actionResult.data.previous_account && (
                  <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                    (previous: {actionResult.data.previous_account})
                  </span>
                )}
              </div>
            )}
            {actionResult.data?.phone && (
              <div>
                <span>Registered Mobile:{' '}</span>
                <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                  {actionResult.data.phone}
                </strong>
              </div>
            )}
            {actionResult.data?.acknowledgement_no && (
              <div>
                <span>Acknowledgement:{' '}</span>
                <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
                  {actionResult.data.acknowledgement_no}
                </strong>
              </div>
            )}
            {actionResult.data?.member && (
              <div>
                <span>Linked Member:{' '}</span>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {actionResult.data.member}
                </strong>
              </div>
            )}
            {actionResult.data?.phc && (
              <div>
                <span>Updated Centre:{' '}</span>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {actionResult.data.phc}
                </strong>
              </div>
            )}
            {actionResult.data?.updated_field && (
              <div>
                <span>Updated Field:{' '}</span>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {actionResult.data.updated_field}
                </strong>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Citizen Denied Action */}
      {actionResult?.type === 'denied' && (
        <div className="panel" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', marginTop: 16 }}>
          <strong style={{ display: 'block', color: 'var(--color-danger)', fontSize: '0.95rem' }}>
            {t.actionNotApproved || 'Action not approved'}
          </strong>
          <p style={{ fontSize: '0.86rem', color: '#7f1d1d', marginTop: 4 }}>
            {t.citizenDidNotApprove || 'The citizen declined permission for this action.'}
          </p>
        </div>
      )}

      {/* 6. Out of Scope Action Blocked */}
      {actionResult?.type === 'out_of_scope' && (
        <div className="panel" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', marginTop: 16 }}>
          <strong style={{ display: 'block', color: 'var(--color-danger)', fontSize: '0.95rem' }}>
            Action not permitted
          </strong>
          <p style={{ fontSize: '0.86rem', color: '#7f1d1d', marginTop: 4 }}>
            {t.outOfScopeMessage || 'This action is not included in the access pass.'}
          </p>
        </div>
      )}
    </div>
  );
}
