import React, { useState } from 'react';
import {
  ArrowLeft, ArrowRight, Check, FileText, Landmark,
  GraduationCap, HeartPulse, Building2, User, Users, Clock, Loader2, Lock, ShieldCheck
} from 'lucide-react';
import { T, actionKey, ACTION_EXPLANATIONS } from '../i18n';
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
  initialService = 'certificates_documents',
  onCancel,
  onPassCreated,
}) {
  const t = T[lang] || T.en;

  /* ── 3 Clear Steps: 1: Service -> 2: Helper -> 3: Permissions & Duration ── */
  const [step, setStep] = useState(1);

  /* ── Step 1: Selected Service ── */
  const [selectedService, setSelectedService] = useState(initialService);

  /* ── Step 2: Helper ── */
  const [helperTab, setHelperTab] = useState('saved'); // 'saved' | 'new'
  const [selectedHelper, setSelectedHelper] = useState(null);

  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('csc_operator');
  const [savingHelper, setSavingHelper] = useState(false);

  /* ── Step 3: Permissions & Duration ── */
  const [selectedActions, setSelectedActions] = useState([]);
  const [duration, setDuration] = useState(30);
  const [creatingPass, setCreatingPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const helperRoles = {
    csc_operator: t.typeCsc || 'CSC Operator',
    family: t.typeFamily || 'Family member',
    neighbour: t.typeNeighbour || 'Trusted neighbour',
  };

  const helperDescs = {
    csc_operator: 'Village Service Centre · Counter #3',
    family: 'Son · Primary Contact',
    neighbour: 'Trusted Community Volunteer',
  };

  const availableHelpers = savedHelpers.length > 0
    ? savedHelpers.map((h) => ({
        id: h.id,
        name: h.name,
        role: helperRoles[h.helper_type] || h.helper_type,
        type: h.helper_type,
        desc: helperDescs[h.helper_type] || 'Authorized Helper',
      }))
    : [
        { id: 1, name: 'Ravi Kumar', role: t.typeCsc || 'CSC Operator', type: 'csc_operator', desc: 'Village Service Centre · Counter #3' },
        { id: 2, name: 'Anil Kumar', role: t.typeFamily || 'Family member', type: 'family', desc: 'Son · Primary Contact' },
        { id: 3, name: 'Meena', role: t.typeNeighbour || 'Trusted neighbour', type: 'neighbour', desc: 'Trusted Community Volunteer' },
      ];

  const currentHelper = selectedHelper || availableHelpers[0];

  /* 5 Clean Public Services */
  const services = [
    {
      id: 'certificates_documents',
      title: t.srvCertificatesDocuments || 'Certificates and documents',
      desc: t.srvCertDesc || 'Income, caste, residence & civil documents',
    },
    {
      id: 'welfare_pensions',
      title: t.srvWelfarePensions || 'Welfare and pensions',
      desc: t.srvWelfareDesc || 'Pension status, disbursement & entitlements',
    },
    {
      id: 'education_scholarships',
      title: t.srvEducationScholarships || 'Education and scholarships',
      desc: t.srvEduDesc || 'Student scholarship status & applications',
    },
    {
      id: 'health_services',
      title: t.srvHealthServices || 'Health services',
      desc: t.srvHealthDesc || 'Digital health coverage & ABHA cards',
    },
    {
      id: 'citizen_services',
      title: t.srvCitizenServices || 'Citizen services',
      desc: t.srvCitizenDesc || 'Civic utility requests & acknowledgements',
    },
  ];

  /* Handle Service Selection (Step 1 -> Step 2) */
  const handleSelectService = (srvId) => {
    setSelectedService(srvId);
    // Pre-populate standard low-risk actions and one sensitive action for this service
    const srvActions = actions.filter((a) => (a.service || 'welfare_pensions') === srvId);
    const low = srvActions.filter((a) => a.risk === 'LOW').map((a) => a.action);
    const high = srvActions.filter((a) => a.risk === 'HIGH').slice(0, 1).map((a) => a.action);
    setSelectedActions([...low, ...high]);
    setStep(2);
  };

  /* Handle Helper Selection (Step 2 -> Step 3) */
  const handleSelectHelper = (h) => {
    setSelectedHelper(h);
    setStep(3);
  };

  /* Add new helper handler */
  const handleAddNewHelper = async () => {
    if (!newName.trim()) return;
    setSavingHelper(true);
    try {
      const created = await createHelper({ name: newName.trim(), helper_type: newType });
      const newH = {
        id: created.id,
        name: created.name,
        role: helperRoles[created.helper_type] || created.helper_type,
        type: created.helper_type,
        desc: 'Trusted Helper',
      };
      setSelectedHelper(newH);
      setStep(3);
    } catch {
      // fallback
      const fakeH = {
        id: Date.now(),
        name: newName.trim(),
        role: helperRoles[newType] || 'Helper',
        type: newType,
        desc: 'Trusted Helper',
      };
      setSelectedHelper(fakeH);
      setStep(3);
    } finally {
      setSavingHelper(false);
    }
  };

  /* Toggle an action checkbox */
  const toggleAction = (act) => {
    setSelectedActions((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    );
  };

  /* Submit Pass Creation */
  const handleCreatePass = async () => {
    if (selectedActions.length === 0) {
      setErrorMsg(t.selectAtLeastOne || 'Please select at least one action.');
      return;
    }
    setErrorMsg('');
    setCreatingPass(true);
    try {
      const srvItem = services.find((s) => s.id === selectedService) || services[0];
      const taskLabel = `${srvItem.title}: ${selectedActions.join(', ')}`;
      const backendHelperId = currentHelper.id || 1;

      const newPass = await createPass({
        citizen_id: citizen?.id || 1,
        helper_id: backendHelperId,
        task_label: taskLabel,
        allowed_actions: selectedActions,
        duration_minutes: duration,
      });

      onPassCreated({
        ...newPass,
        service: selectedService,
        service_name: srvItem.title,
        helper_name: currentHelper.name,
        helper_role: currentHelper.role,
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to create access pass.');
    } finally {
      setCreatingPass(false);
    }
  };

  // Group actions for the active service
  const currentServiceActions = actions.filter((a) => (a.service || 'welfare_pensions') === selectedService);
  const lowRiskActions = currentServiceActions.filter((a) => a.risk === 'LOW');
  const sensitiveActions = currentServiceActions.filter((a) => a.risk === 'HIGH');
  const selectedServiceName = services.find((s) => s.id === selectedService)?.title || 'Public Service';

  return (
    <div className="flow-container">
      {/* ── Top Bar: Back / Cancel ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
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
          <span>{step > 1 ? t.back || 'Back' : t.cancelBtn || 'Cancel'}</span>
        </button>

        <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', fontWeight: 600 }}>
          Step {step} of 3
        </span>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          STEP 1: SERVICE SELECTION
      ══════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div>
          <div className="step-header-box">
            <h2>{t.step2Title || 'Step 1: What do you need help with?'}</h2>
            <p className="step-subtitle">
              Select the digital public service you would like your helper to assist you with.
            </p>
          </div>

          <div className="services-grid-clean">
            {services.map((srv) => {
              const IconComp = SERVICE_ICONS[srv.id] || FileText;
              return (
                <div
                  key={srv.id}
                  className="service-card-clean"
                  onClick={() => handleSelectService(srv.id)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="service-card-top">
                    <div className="service-icon-box">
                      <IconComp size={20} />
                    </div>
                    <strong>{srv.title}</strong>
                  </div>
                  <p className="service-card-desc">{srv.desc}</p>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ alignSelf: 'flex-start' }}>
                    <span>{t.selectServiceBtn || 'Select service'}</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 2: TRUSTED HELPER SELECTION
      ══════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          <div className="step-header-box">
            <h2>{t.step1Title || 'Step 2: Choose a trusted helper'}</h2>
            <p className="step-subtitle">
              Helping with: <strong>{selectedServiceName}</strong>. Select who will assist you.
            </p>
          </div>

          <div className="tab-pills-row">
            <button
              type="button"
              className={`tab-pill ${helperTab === 'saved' ? 'active' : ''}`}
              onClick={() => setHelperTab('saved')}
            >
              {t.selectSavedHelper || 'Choose a trusted helper'}
            </button>
            <button
              type="button"
              className={`tab-pill ${helperTab === 'new' ? 'active' : ''}`}
              onClick={() => setHelperTab('new')}
            >
              {t.addNewHelperTab || '+ Add a new helper'}
            </button>
          </div>

          {helperTab === 'saved' ? (
            <div className="profiles-list">
              {availableHelpers.map((h) => (
                <div
                  key={h.id}
                  className="profile-card"
                  onClick={() => handleSelectHelper(h)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="profile-radio-circle">
                    <User size={16} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <div className="profile-info">
                    <strong>{h.name}</strong>
                    <span>{h.role} · {h.desc}</span>
                  </div>
                  <button type="button" className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>
                    <span>Choose helper</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel" style={{ backgroundColor: '#ffffff', marginTop: 12 }}>
              <div className="form-field">
                <label className="form-label">{t.helperNameLabel || 'Helper Name'}</label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="e.g. Ramesh Gowda"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label">{t.helperTypeLabel || 'Relationship / Role'}</label>
                <select
                  className="select-input"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="csc_operator">{t.typeCsc || 'CSC Operator'}</option>
                  <option value="family">{t.typeFamily || 'Family member'}</option>
                  <option value="neighbour">{t.typeNeighbour || 'Trusted neighbour'}</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleAddNewHelper}
                disabled={!newName.trim() || savingHelper}
                style={{ marginTop: 8 }}
              >
                {savingHelper ? <Loader2 size={15} className="spin-icon" /> : null}
                <span>{t.addHelperBtn || 'Save & Choose Helper'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          STEP 3: PERMISSIONS & DURATION SELECTION
      ══════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div>
          <div className="step-header-box">
            <h2>{t.step3Title || 'Step 3: What can this helper do for you?'}</h2>
            <p className="step-subtitle">
              Helper: <strong>{currentHelper.name}</strong> ({currentHelper.role}) · Service: <strong>{selectedServiceName}</strong>
            </p>
          </div>

          {errorMsg && (
            <div className="panel" style={{ backgroundColor: 'var(--color-danger-bg)', borderColor: 'var(--color-danger-border)', padding: '10px 14px', marginBottom: 14 }}>
              <span style={{ fontSize: '0.86rem', color: 'var(--color-danger)' }}>{errorMsg}</span>
            </div>
          )}

          {/* Group 1: Allowed without additional approval (Low-Risk) */}
          <div className="tasks-block">
            <div className="section-title">
              {t.allowedWithoutApprovalHeader || 'Allowed without additional approval'}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lowRiskActions.map((act) => {
                const checked = selectedActions.includes(act.action);
                return (
                  <div
                    key={act.action}
                    className={`checkbox-item ${checked ? 'checked' : ''}`}
                    onClick={() => toggleAction(act.action)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="checkbox-box">{checked && <Check size={14} />}</div>
                    <div className="checkbox-label">
                      <strong>{t[actionKey[act.action]] || act.label || act.action.replace(/_/g, ' ')}</strong>
                      <span className="checkbox-subtext">Low-risk task · Can be performed within the active session.</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group 2: Requires your approval (Sensitive) */}
          <div className="tasks-block">
            <div className="section-title" style={{ color: 'var(--color-amber)' }}>
              {t.requiresApprovalHeader || 'Requires your approval'}
            </div>

            <div className="panel" style={{ backgroundColor: 'var(--color-amber-bg)', borderColor: 'var(--color-amber-border)', padding: '10px 14px', marginBottom: 10 }}>
              <span style={{ fontSize: '0.82rem', color: '#78350f' }}>
                {t.sensitiveNotice || 'Sensitive actions are protected. The helper cannot complete them without your explicit approval at the time of the action.'}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sensitiveActions.map((act) => {
                const checked = selectedActions.includes(act.action);
                const exp = ACTION_EXPLANATIONS[act.action] || {};
                return (
                  <div
                    key={act.action}
                    className={`checkbox-item ${checked ? 'checked' : ''}`}
                    onClick={() => toggleAction(act.action)}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="checkbox-box">{checked && <Check size={14} />}</div>
                    <div className="checkbox-label">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <strong>{t[actionKey[act.action]] || act.label || act.action.replace(/_/g, ' ')}</strong>
                        <span className="task-sensitive-label">
                          <Lock size={10} style={{ display: 'inline', marginRight: 3 }} />
                          {t.requiresApprovalBadge || 'Needs your approval'}
                        </span>
                      </div>
                      <span className="checkbox-subtext" style={{ color: '#78350f' }}>
                        {exp.why || 'Requires your direct approval before it can take effect.'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duration Selector */}
          <div className="tasks-block" style={{ marginTop: 20 }}>
            <div className="section-title">
              {t.step4Title || 'How long should access last?'}
            </div>

            <div className="duration-selector-row">
              {[
                [15, t.duration15 || '15 minutes'],
                [30, t.duration30 || '30 minutes'],
                [60, t.duration60 || '1 hour'],
              ].map(([mins, label]) => (
                <button
                  key={mins}
                  type="button"
                  className={`btn-duration ${duration === mins ? 'selected' : ''}`}
                  onClick={() => setDuration(mins)}
                >
                  <Clock size={15} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Final Create Access Pass Button */}
          <div style={{ marginTop: 24 }}>
            <button
              type="button"
              className="btn btn-primary btn-large btn-full"
              onClick={handleCreatePass}
              disabled={creatingPass || selectedActions.length === 0}
            >
              {creatingPass ? <Loader2 size={16} className="spin-icon" /> : <ShieldCheck size={16} />}
              <span>{t.createPassBtn || 'Create access pass'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
