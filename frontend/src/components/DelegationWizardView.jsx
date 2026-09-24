import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Check, FileText, Landmark,
  GraduationCap, HeartPulse, Building2, User, Users, Clock, Loader2
} from 'lucide-react';
import { T, actionKey } from '../i18n';
import { createPass, createHelper } from '../api';

const SERVICE_ICONS = {
  certificates_documents: FileText,
  welfare_pensions: Landmark,
  education_scholarships: GraduationCap,
  health_services: HeartPulse,
  citizen_services: Building2,
};

export default function DelegationWizardView({
  lang,
  citizen,
  actions = [],
  savedHelpers = [],
  onCancel,
  onPassCreated,
}) {
  const t = T[lang] || T.en;

  /* ── Current Step: 1 | 2 | 3 | 4 ── */
  const [step, setStep] = useState(1);

  /* ── Step 1 State: Helper ── */
  const [helperTab, setHelperTab] = useState('saved'); // 'saved' | 'new'
  const [selectedHelper, setSelectedHelper] = useState({
    id: 1,
    name: 'Ravi Kumar',
    role: t.typeCsc || 'CSC Operator',
    type: 'csc_operator',
    desc: 'Service Centre',
  });

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('csc_operator');
  const [newPhone, setNewPhone] = useState('');
  const [savingHelper, setSavingHelper] = useState(false);

  /* ── Step 2 State: Service ── */
  const [selectedService, setSelectedService] = useState('welfare_pensions');

  /* ── Step 3 State: Actions ── */
  const [selectedActions, setSelectedActions] = useState([
    'view_pension_status',
    'download_pension_certificate',
    'change_bank_account',
  ]);

  /* ── Step 4 State: Duration ── */
  const [duration, setDuration] = useState(30);
  const [creatingPass, setCreatingPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  /* Pre-seeded demo helpers */
  const demoHelpersList = [
    { id: 1, name: 'Ravi Kumar', role: t.typeCsc || 'CSC Operator', type: 'csc_operator', desc: t.helperRaviDesc || 'Service Centre' },
    { id: 2, name: 'Anil Kumar', role: t.typeFamily || 'Family member', type: 'family', desc: t.helperAnilDesc || 'Son · Primary Contact' },
    { id: 3, name: 'Meena', role: t.typeNeighbour || 'Trusted neighbour', type: 'neighbour', desc: t.helperMeenaDesc || 'Community Volunteer' },
  ];

  /* 5 Mock Services */
  const services = [
    { id: 'certificates_documents', title: t.srvCertificatesDocuments || 'Certificates & Documents', desc: t.srvCertDesc || 'Civil documents & domicile' },
    { id: 'welfare_pensions', title: t.srvWelfarePensions || 'Welfare & Pensions', desc: t.srvWelfareDesc || 'Pension and benefit services' },
    { id: 'education_scholarships', title: t.srvEducationScholarships || 'Education & Scholarships', desc: t.srvEduDesc || 'Student applications and benefits' },
    { id: 'health_services', title: t.srvHealthServices || 'Health Services', desc: t.srvHealthDesc || 'Appointments and health documents' },
    { id: 'citizen_services', title: t.srvCitizenServices || 'Citizen Services', desc: t.srvCitizenDesc || 'Applications and acknowledgements' },
  ];

  /* Service change handler */
  const handleSelectService = (srvId) => {
    setSelectedService(srvId);
    // Auto-select standard low-risk actions and one sensitive action for this service
    const srvActions = actions.filter((a) => (a.service || 'welfare_pensions') === srvId);
    const low = srvActions.filter((a) => a.risk === 'LOW').map((a) => a.action);
    const high = srvActions.filter((a) => a.risk === 'HIGH').slice(0, 1).map((a) => a.action);
    setSelectedActions([...low, ...high]);
  };

  /* Toggle action */
  const toggleAction = (act) => {
    setSelectedActions((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  /* Add new helper handler */
  const handleAddNewHelper = async () => {
    if (!newName.trim()) return;
    setSavingHelper(true);
    try {
      const created = await createHelper({ name: newName.trim(), helper_type: newType });
      const helperObj = {
        id: created.id,
        name: created.name,
        role: newType === 'family' ? (t.typeFamily || 'Family member') : newType === 'neighbour' ? (t.typeNeighbour || 'Trusted neighbour') : (t.typeCsc || 'CSC Operator'),
        type: newType,
        desc: 'Custom helper',
      };
      setSelectedHelper(helperObj);
      setStep(2);
    } catch {
      // Fallback
      setSelectedHelper({
        id: 1,
        name: newName.trim(),
        role: t.typeCsc || 'CSC Operator',
        type: newType,
        desc: 'Custom helper',
      });
      setStep(2);
    } finally {
      setSavingHelper(false);
    }
  };

  /* Submit Pass Creation */
  const handleFinalSubmit = async () => {
    if (selectedActions.length === 0) {
      setErrorMsg(t.selectAtLeastOne || 'Please select at least one action.');
      return;
    }
    setErrorMsg('');
    setCreatingPass(true);
    try {
      const srvItem = services.find((s) => s.id === selectedService) || services[1];
      const taskLabel = `${srvItem.title}: ${selectedActions.join(', ')}`;
      const backendHelperId = selectedHelper.id > 2 ? 1 : selectedHelper.id;

      const newPass = await createPass({
        citizen_id: citizen?.id || 1,
        helper_id: backendHelperId,
        task_label: taskLabel,
        allowed_actions: selectedActions,
        duration_minutes: duration,
      });

      onPassCreated({
        ...newPass,
        helper_name: selectedHelper.name,
        helper_role: selectedHelper.role,
        service_name: srvItem.title,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create access pass.');
    } finally {
      setCreatingPass(false);
    }
  };

  // Group actions for selected service
  const currentServiceActions = actions.filter((a) => (a.service || 'welfare_pensions') === selectedService);
  const lowRiskActions = currentServiceActions.filter((a) => a.risk === 'LOW');
  const sensitiveActions = currentServiceActions.filter((a) => a.risk === 'HIGH');

  const selectedServiceName = services.find((s) => s.id === selectedService)?.title || 'Welfare & Pensions';

  return (
    <div className="flow-container">
      {/* ── Top Bar: Back / Cancel ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          type="button"
          className="btn-back"
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else onCancel();
          }}
          style={{ marginBottom: 0 }}
        >
          <ArrowLeft size={16} />
          <span>{step > 1 ? (t.back || 'Back') : (t.cancelBtn || 'Cancel')}</span>
        </button>

        <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
          {t.stepCount ? t.stepCount.replace('{curr}', step).replace('{total}', 4) : `Step ${step} of 4`}
        </span>
      </div>

      {/* ── Visual Progress Indicator ── */}
      <div className="flow-progress">
        <div className={`step-indicator ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
          <span className="step-num">{step > 1 ? '✓' : '1'}</span>
          <span>{t.navStepHelper || 'Helper'}</span>
        </div>
        <div className={`step-indicator ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
          <span className="step-num">{step > 2 ? '✓' : '2'}</span>
          <span>{t.navStepService || 'Service'}</span>
        </div>
        <div className={`step-indicator ${step === 3 ? 'active' : step > 3 ? 'completed' : ''}`}>
          <span className="step-num">{step > 3 ? '✓' : '3'}</span>
          <span>{t.navStepPermissions || 'Permissions'}</span>
        </div>
        <div className={`step-indicator ${step === 4 ? 'active' : ''}`}>
          <span className="step-num">4</span>
          <span>{t.navStepDuration || 'Duration'}</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEP 1: WHO IS HELPING YOU?
      ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div>
          <div className="screen-header">
            <h2>{t.whoIsHelpingYou || 'Who is helping you?'}</h2>
            <p className="screen-subtext">
              {t.whoIsHelpingSub || 'Choose a trusted person or service operator.'}
            </p>
          </div>

          <div className="tab-pills-row">
            <button
              type="button"
              className={`tab-pill ${helperTab === 'saved' ? 'active' : ''}`}
              onClick={() => setHelperTab('saved')}
            >
              {t.chooseSomeoneAlreadyTrust || 'Choose someone I already trust'}
            </button>
            <button
              type="button"
              className={`tab-pill ${helperTab === 'new' ? 'active' : ''}`}
              onClick={() => setHelperTab('new')}
            >
              {t.addNewHelper || '+ Add a new helper'}
            </button>
          </div>

          {helperTab === 'saved' ? (
            <div className="profiles-list">
              {demoHelpersList.map((h) => {
                const isSelected = selectedHelper.id === h.id;
                return (
                  <div
                    key={h.id}
                    className={`profile-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedHelper(h)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="profile-radio-circle">
                      {isSelected && <div className="profile-radio-inner" />}
                    </div>
                    <div className="profile-info">
                      <strong>{h.name}</strong>
                      <span>{h.role} · {h.desc}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="panel" style={{ marginBottom: 20 }}>
              <div className="form-field">
                <label className="form-label">{t.helperNameLabel || 'Helper Name'}</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Ramesh Kumar"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">{t.helperTypeLabel || 'Helper Type'}</label>
                <select
                  className="form-select"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="csc_operator">{t.typeCscOperator || 'CSC / Service Centre'}</option>
                  <option value="family">{t.typeFamilyMember || 'Family member'}</option>
                  <option value="neighbour">{t.typeNeighbourTrusted || 'Trusted neighbour'}</option>
                </select>
              </div>

              <div className="form-field">
                <label className="form-label">{t.phoneLabel || 'Phone Number (Optional)'}</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="flow-actions-bottom">
            <button type="button" className="btn btn-secondary" onClick={onCancel}>
              {t.cancelBtn || 'Cancel'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (helperTab === 'new') handleAddNewHelper();
                else setStep(2);
              }}
              disabled={helperTab === 'new' && (!newName.trim() || savingHelper)}
            >
              <span>{t.continueBtn || 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2: SERVICE SELECTION
      ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          <div className="screen-header">
            <h2>{t.whatDoYouNeedHelpWith || 'What do you need help with?'}</h2>
            <p className="screen-subtext">
              {t.selectServiceSub || 'Select the public service category you want assistance with.'}
            </p>
          </div>

          <div className="services-simple-grid">
            {services.map((srv) => {
              const isSelected = selectedService === srv.id;
              const Icon = SERVICE_ICONS[srv.id] || Landmark;
              return (
                <div
                  key={srv.id}
                  className={`service-selectable-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectService(srv.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="service-meta-left">
                    <div className="service-icon-box">
                      <Icon size={20} />
                    </div>
                    <div className="service-title-text">
                      <strong>{srv.title}</strong>
                      <span>{srv.desc}</span>
                    </div>
                  </div>
                  <span className="mock-service-tag">{t.mockServiceNote || 'MOCK SERVICE'}</span>
                </div>
              );
            })}
          </div>

          <div className="flow-actions-bottom">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>
              {t.back || 'Back'}
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
              <span>{t.continueBtn || 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3: PERMISSIONS
      ══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div>
          <div className="screen-header">
            <h2>{t.whatShouldHelperBeAbleToDo ? t.whatShouldHelperBeAbleToDo.replace('{name}', selectedHelper.name) : `What should ${selectedHelper.name} be able to do?`}</h2>
            <p className="screen-subtext">{selectedServiceName}</p>
          </div>

          <div className="permissions-container">
            {/* Low-Risk Actions */}
            <div className="perm-section">
              <span className="perm-section-title">
                {t.canDoWithoutAskingAgain || 'Can do without asking again'}
              </span>

              {lowRiskActions.map((act) => {
                const isChecked = selectedActions.includes(act.action);
                return (
                  <div
                    key={act.action}
                    className={`perm-checkbox-item ${isChecked ? 'checked' : ''}`}
                    onClick={() => toggleAction(act.action)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="perm-item-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                      />
                      <span>{t[actionKey[act.action]] || act.label || act.action.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="perm-tag-low">{t.lowRiskActionTag || 'Standard task'}</span>
                  </div>
                );
              })}
            </div>

            {/* Sensitive Actions */}
            <div className="perm-section">
              <span className="perm-section-title" style={{ color: 'var(--color-amber)' }}>
                {t.needsYourApprovalGroup || 'Needs your approval'}
              </span>

              {sensitiveActions.map((act) => {
                const isChecked = selectedActions.includes(act.action);
                return (
                  <div
                    key={act.action}
                    className={`perm-checkbox-item ${isChecked ? 'checked' : ''}`}
                    onClick={() => toggleAction(act.action)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="perm-item-left">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        style={{ cursor: 'pointer', accentColor: 'var(--color-amber)' }}
                      />
                      <span>{t[actionKey[act.action]] || act.label || act.action.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="perm-tag-sensitive">{t.sensitiveActionTag || 'Sensitive action'}</span>
                  </div>
                );
              })}
            </div>

            <div className="perm-explanation-box">
              {t.sensitiveExplanationText || 'Sensitive actions can never be completed automatically. You will be asked before they happen.'}
            </div>
          </div>

          <div className="flow-actions-bottom">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(2)}>
              {t.back || 'Back'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setStep(4)}
              disabled={selectedActions.length === 0}
            >
              <span>{t.continueBtn || 'Continue'}</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 4: DURATION & SUMMARY
      ══════════════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div>
          <div className="screen-header">
            <h2>{t.howLongShouldHelperHelp ? t.howLongShouldHelperHelp.replace('{name}', selectedHelper.name) : `How long should ${selectedHelper.name} be able to help?`}</h2>
            <p className="screen-subtext">
              {t.durationSubtext || 'Access automatically ends after this time.'}
            </p>
          </div>

          <div className="duration-selector">
            {[15, 30, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                className={`duration-btn ${duration === mins ? 'active' : ''}`}
                onClick={() => setDuration(mins)}
              >
                {mins} {t.minutesLabel || 'minutes'}
              </button>
            ))}
          </div>

          <div className="summary-compact-box">
            <div className="summary-row">
              <span className="summary-row-label">{t.helperLabel || 'Helper'}:</span>
              <span className="summary-row-val">{selectedHelper.name} ({selectedHelper.role})</span>
            </div>

            <div className="summary-row">
              <span className="summary-row-label">{t.serviceLabel || 'Service'}:</span>
              <span className="summary-row-val">{selectedServiceName}</span>
            </div>

            <div className="summary-row">
              <span className="summary-row-label">{t.canDoLabel || 'Can do'}:</span>
              <span className="summary-row-val">
                {selectedActions.filter((a) => !['change_bank_account', 'update_mobile_number', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'modify_citizen_information'].includes(a))
                  .map((a) => t[actionKey[a]] || a.replace(/_/g, ' ')).join(', ') || 'None selected'}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-row-label">{t.sensitiveActionsLabel || 'Sensitive actions'}:</span>
              <span className="summary-row-val" style={{ color: 'var(--color-amber)' }}>
                {selectedActions.some((a) => ['change_bank_account', 'update_mobile_number', 'modify_certificate_details', 'update_disbursement_bank', 'modify_student_profile', 'link_new_beneficiary', 'modify_citizen_information'].includes(a))
                  ? (t.approvalRequiredTag || 'Approval required')
                  : (t.none || 'None')}
              </span>
            </div>

            <div className="summary-row">
              <span className="summary-row-label">{t.accessExpiresLabel || 'Access expires'}:</span>
              <span className="summary-row-val">{duration} {t.minutesLabel || 'minutes'} after activation</span>
            </div>
          </div>

          {errorMsg && (
            <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: 14 }}>
              {errorMsg}
            </div>
          )}

          <div className="flow-actions-bottom">
            <button type="button" className="btn btn-secondary" onClick={() => setStep(3)}>
              {t.back || 'Back'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-large"
              onClick={handleFinalSubmit}
              disabled={creatingPass}
            >
              {creatingPass ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Creating pass…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>{t.giveAccessBtn || 'Give Access'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
