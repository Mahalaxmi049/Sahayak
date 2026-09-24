import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { T } from '../i18n';

export default function WelcomeView({ lang, onContinueCitizen, onContinueHelper, onOpenHowItWorks }) {
  const t = T[lang] || T.en;

  return (
    <div className="welcome-screen">
      <div className="welcome-shield-icon">
        <ShieldCheck size={24} />
      </div>

      <h1 className="welcome-title">{t.appName}</h1>

      <h2 className="welcome-headline">
        {t.welcomeHeadline || 'Get help with digital public services without giving away control.'}
      </h2>

      <p className="welcome-subtext">
        {t.welcomeSubtext || 'Give a trusted person limited permission to complete specific tasks for you. Sensitive actions remain under your control.'}
      </p>

      <div className="welcome-choices">
        <div className="choice-card">
          <div>
            <div className="choice-label">{t.choiceCitizenLabel || "I'm a citizen"}</div>
            <div className="choice-desc">{t.choiceCitizenDesc || 'I need help with a digital public service.'}</div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onContinueCitizen}
          >
            <span>{t.continueAsCitizen || 'Continue as Citizen'}</span>
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="choice-card">
          <div>
            <div className="choice-label">{t.choiceHelperLabel || "I'm a helper"}</div>
            <div className="choice-desc">
              {t.choiceHelperDesc || "I'm assisting someone at a CSC, service centre, or as a trusted person."}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onContinueHelper}
          >
            <span>{t.continueAsHelper || 'Continue as Helper'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      <div className="welcome-footer-note">
        <p>{t.disclaimer}</p>
        <button
          type="button"
          className="how-it-works-link"
          onClick={onOpenHowItWorks}
        >
          {t.howDoesThisWork || 'How does this work?'}
        </button>
      </div>
    </div>
  );
}
