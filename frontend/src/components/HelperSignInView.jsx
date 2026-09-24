import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { T } from '../i18n';

export default function HelperSignInView({
  lang,
  helpers = [],
  onBack,
  onSignInSuccess,
}) {
  const t = T[lang] || T.en;

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

  const list = helpers.length > 0
    ? helpers.map((h) => ({
        id: h.id,
        name: h.name,
        role: helperRoles[h.helper_type] || h.helper_type,
        desc: helperDescs[h.helper_type] || 'Authorized Helper',
        type: h.helper_type,
      }))
    : [
        { id: 1, name: 'Ravi Kumar', role: t.typeCsc || 'CSC Operator', desc: 'Village Service Centre · Counter #3', type: 'csc_operator' },
        { id: 2, name: 'Anil Kumar', role: t.typeFamily || 'Family member', desc: 'Son · Primary Contact', type: 'family' },
        { id: 3, name: 'Meena', role: t.typeNeighbour || 'Trusted neighbour', desc: 'Trusted Community Volunteer', type: 'neighbour' },
      ];

  const [selectedId, setSelectedId] = useState(list[0]?.id || 1);

  const handleContinue = () => {
    const selected = list.find((h) => h.id === selectedId) || list[0];
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
        <label className="form-label">{t.chooseHelperAccount || 'Select your helper profile:'}</label>
        <div className="profiles-list">
          {list.map((h) => {
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

      <div className="prototype-disclaimer-box">
        <ShieldCheck size={14} className="text-subtle" style={{ flexShrink: 0, marginTop: 2 }} />
        <span>{t.prototypeDisclaimer}</span>
      </div>
    </div>
  );
}
