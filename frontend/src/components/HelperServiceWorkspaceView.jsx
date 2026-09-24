import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, ArrowRight, Eye, Download, Lock, CheckCircle2,
  XCircle, Clock, Loader2, AlertTriangle, ShieldCheck
} from 'lucide-react';
import { T, actionKey } from '../i18n';
import { helperAct, getStepUp, asUTC } from '../api';

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

  const helperName = helper?.name || 'Ravi Kumar';
  const citizenName = citizen?.name || 'Savitri Devi';
  const serviceName = t.srvWelfarePensions || 'Welfare & Pensions';

  /* ── Action State ── */
  const [executing, setExecuting] = useState(null);
  const [actionResult, setActionResult] = useState(null);
  // shape: { type: 'pension_status' | 'cert_preview' | 'step_up_waiting' | 'step_up_approved' | 'action_completed' | 'denied' | 'out_of_scope', data?: any, stepUpId?: number }

  const [waitingForCitizen, setWaitingForCitizen] = useState(false);
  const [activeStepUpId, setActiveStepUpId] = useState(null);

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
          if (res.status === 'executed') {
            setWaitingForCitizen(false);
            setActionResult({
              type: 'action_completed',
              data: res.result || { bank_account: 'XXXX-5678' },
            });
            refreshAll?.();
          } else if (res.status === 'blocked') {
            setWaitingForCitizen(false);
            setActionResult({
              type: 'denied',
              reason: res.reason,
            });
            refreshAll?.();
          } else if (res.status === 'already_executed') {
            setWaitingForCitizen(false);
            setActionResult({
              type: 'action_completed',
              data: res.result || { bank_account: 'XXXX-5678' },
            });
          }
        } catch {
          // ignore transient poll error
        }
      }, 1500);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [waitingForCitizen, activeStepUpId, passToken]);

  /* ── Perform Action ── */
  const handlePerformAction = async (actionCode) => {
    if (!passToken || !activePass) return;
    setExecuting(actionCode);
    setActionResult(null);

    try {
      const res = await helperAct(passToken, actionCode);

      if (res.status === 'executed') {
        if (actionCode === 'view_pension_status' || actionCode === 'view_citizen_service_status') {
          setActionResult({
            type: 'pension_status',
            data: res.result,
          });
        } else if (actionCode.startsWith('download_')) {
          setActionResult({
            type: 'cert_preview',
            data: res.result,
          });
        } else {
          setActionResult({
            type: 'action_completed',
            data: res.result,
          });
        }
        refreshAll?.();
      } else if (res.status === 'step_up_required') {
        setActiveStepUpId(res.step_up_id);
        setWaitingForCitizen(true);
        setActionResult({
          type: 'step_up_waiting',
          stepUpId: res.step_up_id,
        });
        refreshAll?.();
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('outside this pass') || err.status === 403) {
        setActionResult({ type: 'out_of_scope' });
      } else if (msg.includes('expired') || err.status === 401) {
        setIsExpired(true);
      } else {
        setActionResult({ type: 'out_of_scope' });
      }
      refreshAll?.();
    } finally {
      setExecuting(null);
    }
  };

  /* ── Download Simulation ── */
  const triggerDownload = () => {
    const text = `DEMO DOCUMENT — NOT AN OFFICIAL GOVERNMENT CERTIFICATE
============================================================
Beneficiary: ${citizenName}
Monthly Entitlement: ₹8,500
Status: ACTIVE / VERIFIED
Disbursement Account: XXXX-1234
Authorized Helper: ${helperName}
Service: Welfare & Pensions
Date: ${new Date().toLocaleDateString()}
============================================================
Sahayak Pass Delegation Prototype`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'pension-certificate-demo.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!activePass || activePass.status !== 'active' || isExpired) {
    const isRevoked = activePass?.status === 'revoked';
    return (
      <div className="service-workspace">
        <button type="button" className="btn-back" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>{t.backToAssistedServices || 'Back to Assisted Services'}</span>
        </button>

        <div className="empty-state-simple" style={{ padding: '36px 20px' }}>
          <strong style={{ fontSize: '1.1rem', color: isRevoked ? 'var(--color-danger)' : 'var(--text-main)' }}>
            {isRevoked ? (t.accessRevokedTitle || 'Access revoked') : (t.accessExpiredTitle || 'Access expired')}
          </strong>
          <p style={{ maxWidth: 420, margin: '8px auto 16px auto' }}>
            {isRevoked
              ? (t.accessRevokedDesc ? t.accessRevokedDesc.replace('{name}', helperName) : `${helperName} can no longer use this pass.`)
              : (t.sessionCanNoLongerBeUsed || 'This session has ended and can no longer be used.')}
          </p>
          {onSwitchToCitizen && (
            <button type="button" className="btn btn-secondary" onClick={onSwitchToCitizen}>
              <span>{t.switchToCitizenBtn || 'Switch to Citizen'} →</span>
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
        <span>{t.backToAssistedServices || 'Back to Assisted Services'}</span>
      </button>

      {/* ── Workspace Header ── */}
      <div className="workspace-header-card">
        <h2>{t.helpingCitizen ? t.helpingCitizen.replace('{name}', citizenName) : `Helping ${citizenName}`}</h2>
        <p className="workspace-subhead">{serviceName}</p>
        <div className="workspace-timer-badge">
          <Clock size={14} />
          <span>{t.passActive || 'Pass active'} · {t.expiresIn || 'Expires in'} {countdown}</span>
        </div>
      </div>

      {/* ── Available Tasks (Low-risk) ── */}
      <div className="tasks-block">
        <div className="section-title">{t.availableTasksHeader || 'Available tasks'}</div>

        <div className="task-item-row">
          <div className="task-item-info">
            <strong>{t.actPensionStatus || 'View pension status'}</strong>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handlePerformAction('view_pension_status')}
            disabled={executing !== null}
          >
            {executing === 'view_pension_status' ? <Loader2 size={14} className="spin-icon" /> : null}
            <span>{t.viewBtn || 'View'}</span>
          </button>
        </div>

        <div className="task-item-row">
          <div className="task-item-info">
            <strong>{t.actPensionCert || 'Download pension certificate'}</strong>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handlePerformAction('download_pension_certificate')}
            disabled={executing !== null}
          >
            {executing === 'download_pension_certificate' ? <Loader2 size={14} className="spin-icon" /> : null}
            <span>{t.downloadCertBtn || 'Download'}</span>
          </button>
        </div>
      </div>

      {/* ── Needs Citizen Approval (Sensitive) ── */}
      <div className="tasks-block">
        <div className="section-title" style={{ color: 'var(--color-amber)' }}>
          {t.needsCitizenApprovalHeader || 'Needs citizen approval'}
        </div>

        <div className="task-item-row">
          <div className="task-item-info">
            <strong>{t.actBank || 'Change bank account'}</strong>
            <span className="task-sensitive-label">{t.sensitiveActionTag || 'Sensitive action'}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handlePerformAction('change_bank_account')}
            disabled={executing !== null || waitingForCitizen}
          >
            {executing === 'change_bank_account' ? (
              <Loader2 size={14} className="spin-icon" />
            ) : (
              <Lock size={13} style={{ color: 'var(--color-amber)' }} />
            )}
            <span>{waitingForCitizen ? (t.waiting || 'Waiting…') : (t.requestApprovalBtn || 'Request approval')}</span>
          </button>
        </div>

        <div className="task-item-row">
          <div className="task-item-info">
            <strong>{t.actMobile || 'Change registered mobile number'}</strong>
            <span className="task-sensitive-label">{t.sensitiveActionTag || 'Sensitive action'}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => handlePerformAction('update_mobile_number')}
            disabled={executing !== null || waitingForCitizen}
          >
            <Lock size={13} style={{ color: 'var(--color-amber)' }} />
            <span>{t.requestApprovalBtn || 'Request approval'}</span>
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RESULTS DISPLAY AREA
      ══════════════════════════════════════════════════════════════ */}

      {/* 1. Sensitive Action: Step-Up Waiting */}
      {actionResult?.type === 'step_up_waiting' && (
        <div className="step-up-card-helper">
          <strong>{t.approvalRequiredTitle || 'Approval required'}</strong>
          <p>
            {t.stepUpExplanation || `This action needs ${citizenName}'s approval.`}
          </p>
          <div style={{ fontSize: '0.84rem', color: '#78350f', marginBottom: 12 }}>
            <div><strong>{t.requestedActionLabel || 'Requested action'}:</strong> {t.actBank || 'Change bank account'}</div>
            <div><strong>{t.requestedByLabel || 'Requested by'}:</strong> {helperName}</div>
            <div style={{ marginTop: 4 }}>
              <strong>{t.whyLabel || 'Why?'}:</strong> {t.whyBankText || "This action can affect the citizen's account information."}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div className="waiting-indicator">
              <Loader2 size={15} className="spin-icon" />
              <span>{t.waitingForCitizenApprovalText || 'Waiting for citizen approval...'}</span>
            </div>

            {onSwitchToCitizen && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={onSwitchToCitizen}
              >
                <span>Switch to Citizen Screen to Approve →</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 2. Realistic Low-Risk Result: Pension Status */}
      {actionResult?.type === 'pension_status' && (
        <div className="result-card-realistic">
          <div className="result-header-row">
            <strong>{t.pensionRecordTitle || 'Pension Status'}</strong>
            <span className="mock-service-tag">{t.mockServiceNote || 'MOCK SERVICE'}</span>
          </div>

          <div className="result-grid-clean">
            <div className="result-grid-cell">
              <span className="cell-label">{t.beneficiaryLabel || 'Beneficiary'}</span>
              <span className="cell-val">{citizenName}</span>
            </div>

            <div className="result-grid-cell">
              <span className="cell-label">{t.statusLabel || 'Status'}</span>
              <span className="cell-val" style={{ color: 'var(--color-primary)' }}>
                ● {t.activeStatus || 'Active'}
              </span>
            </div>

            <div className="result-grid-cell">
              <span className="cell-label">{t.monthlyPensionLabel || 'Monthly benefit'}</span>
              <span className="cell-val">₹8,500</span>
            </div>

            <div className="result-grid-cell">
              <span className="cell-label">{t.lastCreditedLabel || 'Last credited'}</span>
              <span className="cell-val">01-Sep-2026</span>
            </div>

            <div className="result-grid-cell" style={{ gridColumn: 'span 2' }}>
              <span className="cell-label">{t.accountLabel || 'Bank Account'}</span>
              <span className="cell-val" style={{ fontFamily: 'monospace' }}>
                {actionResult.data?.bank_account || 'XXXX-1234'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Certificate Preview Result */}
      {actionResult?.type === 'cert_preview' && (
        <div className="result-card-realistic">
          <div className="result-header-row">
            <strong>{t.certPreviewTitle || 'Pension Sanction Certificate'}</strong>
            <span className="mock-service-tag">{t.mockServiceNote || 'MOCK SERVICE'}</span>
          </div>

          <div className="cert-preview-box">
            <div style={{ fontWeight: 600, color: 'var(--color-navy)', marginBottom: 6 }}>
              {t.certDemoNotice || 'DEMO DOCUMENT · NOT AN OFFICIAL GOVERNMENT CERTIFICATE'}
            </div>
            <div>Beneficiary: <strong>{citizenName}</strong></div>
            <div>Monthly Amount: <strong>₹8,500</strong></div>
            <div>Scheme: <strong>NSAP Old Age Pension</strong></div>
            <div>Ref: <strong>DOC-NSAP-2026-8842</strong></div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={triggerDownload}
          >
            <Download size={14} />
            <span>{t.downloadDocBtn || 'Download Certificate'}</span>
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
            <span className="mock-service-tag">{t.mockServiceNote || 'MOCK SERVICE'}</span>
          </div>

          <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: 10 }}>
            {t.bankUpdatedSuccess || 'The bank account was successfully updated.'}
          </p>

          <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
            <span>{t.accountLabel || 'Account'}: </span>
            <strong style={{ color: 'var(--color-primary)', fontFamily: 'monospace' }}>
              {actionResult.data?.bank_account || 'XXXX-5678'}
            </strong>
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
            {t.citizenDidNotApprove || 'The citizen did not approve this action.'}
          </p>
        </div>
      )}

      {/* 6. Out of Scope Action Blocked */}
      {actionResult?.type === 'out_of_scope' && (
        <div className="panel" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', marginTop: 16 }}>
          <strong style={{ display: 'block', color: 'var(--color-danger)', fontSize: '0.95rem' }}>
            {t.outOfScopeTitle || 'Action not permitted'}
          </strong>
          <p style={{ fontSize: '0.86rem', color: '#7f1d1d', marginTop: 4 }}>
            {t.outOfScopeDesc || 'This task was not included in the access granted by the citizen. The action was blocked.'}
          </p>
        </div>
      )}
    </div>
  );
}
