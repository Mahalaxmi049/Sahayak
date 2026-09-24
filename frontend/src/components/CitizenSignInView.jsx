import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Info, Check } from 'lucide-react';
import { T } from '../i18n';

export default function CitizenSignInView({
  lang,
  onBack,
  onSignInSuccess,
}) {
  const t = T[lang] || T.en;

  const demoCitizens = [
    { id: 1, name: 'Savitri Devi', role: t.rolePensionBeneficiary || 'Pension beneficiary' },
    { id: 2, name: 'Anil Kumar', role: t.roleStudent || 'Student' },
    { id: 3, name: 'Meena', role: t.roleCitizenServices || 'Citizen services' },
  ];

  const [selectedId, setSelectedId] = useState(1);

  const handleContinue = () => {
    const selected = demoCitizens.find((c) => c.id === selectedId) || demoCitizens[0];
    onSignInSuccess(selected);
  };

  return (
    <div className="signin-screen">
      <button type="button" className="btn-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>{t.back || 'Back'}</span>
      </button>

      <div className="screen-header">
        <h2>{t.welcome || 'Welcome'}</h2>
        <p className="screen-subtext">{t.demoSignInTitle || 'Demo sign-in'}</p>
      </div>

      <div className="simulation-note">
        <Info size={16} className="text-subtle" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          {t.demoSignInSub || 'This prototype uses simulated sign-in. No real passwords, OTPs, or identity documents are collected.'}
        </span>
      </div>

      <div className="form-field">
        <label className="form-label">{t.chooseDemoCitizen || 'Choose a demo citizen'}</label>
        <div className="profiles-list">
          {demoCitizens.map((c) => {
            const isSelected = c.id === selectedId;
            return (
              <div
                key={c.id}
                className={`profile-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedId(c.id)}
                role="button"
                tabIndex={0}
              >
                <div className="profile-radio-circle">
                  {isSelected && <div className="profile-radio-inner" />}
                </div>
                <div className="profile-info">
                  <strong>{c.name}</strong>
                  <span>{c.role}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="btn btn-primary btn-large btn-full"
        onClick={handleContinue}
      >
        <span>{t.continueBtn || 'Continue'}</span>
        <ArrowRight size={16} />
      </button>

      <p className="welcome-footer-note" style={{ margin: '18px auto 0 auto' }}>
        {t.demoAuthNote || 'Demo mode — authentication is simulated.'}
      </p>
    </div>
  );
}
