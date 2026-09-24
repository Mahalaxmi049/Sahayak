import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { T } from '../i18n';

export default function CitizenSignInView({
  lang,
  citizens = [],
  onBack,
  onSignInSuccess,
}) {
  const t = T[lang] || T.en;

  const citizenRoles = {
    1: 'Pension beneficiary',
    2: 'Student applicant',
    3: 'Citizen services applicant',
  };

  const list = citizens.length > 0
    ? citizens.map((c) => ({
        id: c.id,
        name: c.name,
        role: citizenRoles[c.id] || 'Citizen',
      }))
    : [
        { id: 1, name: 'Savitri Devi', role: 'Pension beneficiary' },
        { id: 2, name: 'Anil Kumar', role: 'Student applicant' },
        { id: 3, name: 'Meena', role: 'Citizen services applicant' },
      ];

  const [selectedId, setSelectedId] = useState(list[0]?.id || 1);

  const handleContinue = () => {
    const selected = list.find((c) => c.id === selectedId) || list[0];
    onSignInSuccess(selected);
  };

  return (
    <div className="signin-screen">
      <button type="button" className="btn-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>{t.back || 'Back'}</span>
      </button>

      <div className="screen-header">
        <h2>{t.signInTitle || 'Sign in to Sahayak Pass'}</h2>
        <p className="screen-subtext">{t.signInSub || 'Select a profile to continue and explore assisted access.'}</p>
      </div>

      <div className="form-field">
        <label className="form-label">{t.chooseCitizenAccount || 'Select your citizen profile:'}</label>
        <div className="profiles-list">
          {list.map((c) => {
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

      <div className="prototype-disclaimer-box">
        <ShieldCheck size={14} className="text-subtle" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{t.prototypeDisclaimer}</span>
      </div>
    </div>
  );
}
