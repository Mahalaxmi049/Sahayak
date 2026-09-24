import React from 'react';
import { ShieldCheck, ArrowRight, UserCheck, HelpCircle } from 'lucide-react';
import { T } from '../i18n';

export default function WelcomeView({ lang, onContinueCitizen, onContinueHelper, onOpenHowItWorks }) {
  const t = T[lang] || T.en;

  return (
    <div className="welcome-screen">
      <div className="welcome-shield-icon">
        <ShieldCheck size={26} />
      </div>

      <h1 className="welcome-title">{t.appName}</h1>

      <h2 className="welcome-headline">
        {t.appTagline || 'Get help with digital public services—without giving away control.'}
      </h2>

      <p className="welcome-subtext">
        {t.appTaglineSub || 'Choose a trusted helper, allow only the actions they need, and approve sensitive actions yourself.'}
      </p>

      <div className="welcome-choices">
        <div className="choice-card">
          <div className="choice-info">
            <div className="choice-label">{t.roleCitizen || 'Citizen'}</div>
            <div className="choice-desc">Get assistance with certificates, pensions, scholarships, or civic services.</div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinueCitizen}
          >
            <span>{t.continueCitizen || 'Continue as Citizen'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="choice-card">
          <div className="choice-info">
            <div className="choice-label">{t.roleHelper || 'Helper'}</div>
            <div className="choice-desc">Assist a citizen at a service centre, as a family member, or volunteer.</div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onContinueHelper}
          >
            <span>{t.continueHelper || 'Continue as Helper'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="welcome-footer-note">
        <button
          type="button"
          className="how-it-works-link"
          onClick={onOpenHowItWorks}
        >
          <HelpCircle size={15} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          <span>{t.howItWorksTitle || 'How Sahayak Pass Works'}</span>
        </button>
      </div>
    </div>
  );
}
