import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, Info } from 'lucide-react';
import { T } from '../i18n';

export default function HelperSignInView({
  lang,
  onBack,
  onSignInSuccess,
}) {
  const t = T[lang] || T.en;

  const demoHelpers = [
    { id: 1, name: 'Ravi Kumar', role: t.typeCsc || 'CSC Operator', desc: 'Service Centre' },
    { id: 2, name: 'Anil Kumar', role: t.typeFamily || 'Family Member', desc: 'Son · Primary Contact' },
    { id: 3, name: 'Meena', role: t.typeNeighbour || 'Neighbour', desc: 'Community Volunteer' },
  ];

  const [selectedId, setSelectedId] = useState(1);

  const handleContinue = () => {
    const selected = demoHelpers.find((h) => h.id === selectedId) || demoHelpers[0];
    onSignInSuccess(selected);
  };

  return (
    <div className="signin-screen">
      <button type="button" className="btn-back" onClick={onBack}>
        <ArrowLeft size={16} />
        <span>{t.back || 'Back'}</span>
      </button>

      <div className="screen-header">
        <h2>{t.appName || 'Sahayak Pass'}</h2>
        <p className="screen-subtext">{t.helperCscSignIn || 'Helper / CSC · Demo sign-in'}</p>
      </div>

      <div className="simulation-note">
        <Info size={16} className="text-subtle" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>
          {t.demoAuthNote || 'Demo authentication only. No real credentials collected.'}
        </span>
      </div>

      <div className="form-field">
        <label className="form-label">{t.chooseDemoHelper || 'Choose a demo helper account'}</label>
        <div className="profiles-list">
          {demoHelpers.map((h) => {
            const isSelected = h.id === selectedId;
            return (
              <div
                key={h.id}
                className={`profile-card ${isSelected ? 'selected' : ''}`}
                onClick={() => setSelectedId(h.id)}
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
        {t.demoModeSimulated || 'Demo mode — authentication is simulated.'}
      </p>
    </div>
  );
}
