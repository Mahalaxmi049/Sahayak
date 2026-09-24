import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, RotateCcw } from 'lucide-react';
import { T } from './i18n';
import {
  getCitizen, getHelpers, getCitizenPasses, getPendingStepUps,
  getAudit, getSummary, resetDemo, getActions, asUTC
} from './api';

import WelcomeView from './components/WelcomeView';
import CitizenSignInView from './components/CitizenSignInView';
import CitizenHomeView from './components/CitizenHomeView';
import DelegationWizardView from './components/DelegationWizardView';
import AccessCreatedView from './components/AccessCreatedView';
import HelperSignInView from './components/HelperSignInView';
import HelperHomeView from './components/HelperHomeView';
import HelperServiceWorkspaceView from './components/HelperServiceWorkspaceView';
import CitizenApprovalModal from './components/CitizenApprovalModal';
import ActivityHistoryModal from './components/ActivityHistoryModal';
import RevokeModal from './components/RevokeModal';
import HowItWorksModal from './components/HowItWorksModal';

import './styles/app.css';

const DEFAULT_CITIZEN_ID = 1;

function App() {
  /* ── Current Navigation Screen ──
     'welcome' | 'citizen_signin' | 'citizen_home' | 'citizen_delegation' | 'access_created' | 'helper_signin' | 'helper_home' | 'helper_workspace'
  ── */
  const [screen, setScreen] = useState('welcome');
  const [lang, setLang] = useState('en');

  /* ── Users ── */
  const [currentCitizen, setCurrentCitizen] = useState({
    id: 1,
    name: 'Savitri Devi',
    role: 'Pension beneficiary',
  });

  const [currentHelper, setCurrentHelper] = useState({
    id: 1,
    name: 'Ravi Kumar',
    role: 'CSC Operator',
  });

  /* ── Backend Data ── */
  const [citizen, setCitizen] = useState(null);
  const [helpers, setHelpers] = useState([]);
  const [actions, setActions] = useState([]);
  const [activePass, setActivePass] = useState(null);
  const [createdPass, setCreatedPass] = useState(null);
  const [passToken, setPassToken] = useState('');
  const [pendingStepUps, setPendingStepUps] = useState([]);
  const [audit, setAudit] = useState([]);
  const [summary, setSummary] = useState('');
  const [resetting, setResetting] = useState(false);

  /* ── Modals ── */
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);

  const t = T[lang] || T.en;

  /* ── Fetch Core State from Real Backend ── */
  const refresh = useCallback(async () => {
    try {
      const [c, h, aList] = await Promise.all([
        getCitizen(DEFAULT_CITIZEN_ID),
        getHelpers(),
        getActions(lang),
      ]);
      setCitizen(c);
      setHelpers(h);
      setActions(aList);

      // Check citizen's passes
      const passes = await getCitizenPasses(DEFAULT_CITIZEN_ID);
      const active = passes.find(
        (p) => p.status === 'active' && asUTC(p.expires_at) > new Date()
      );
      const mostRecent = active || passes[0] || null;

      setActivePass(active || null);
      if (active) {
        setPassToken(active.token);
      } else if (mostRecent) {
        setPassToken(mostRecent.token);
      }

      // Check pending step-ups
      const pendings = await getPendingStepUps(DEFAULT_CITIZEN_ID);
      setPendingStepUps(pendings || []);

      // If a pending step-up appears while on citizen screens, open the approval modal
      if (pendings && pendings.length > 0 && ['citizen_home', 'access_created'].includes(screen)) {
        setIsApprovalOpen(true);
      }

      // Check audit and summary for current/recent pass
      if (mostRecent) {
        const [aud, sum] = await Promise.all([
          getAudit(mostRecent.id),
          getSummary(mostRecent.id, lang),
        ]);
        setAudit(aud || []);
        setSummary(sum?.summary || '');
      } else {
        setAudit([]);
        setSummary('');
      }
    } catch {
      // Ignore background poll errors
    }
  }, [lang, screen]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  /* ── Reset Demo ── */
  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemo();
      setActivePass(null);
      setCreatedPass(null);
      setPassToken('');
      setPendingStepUps([]);
      setAudit([]);
      setSummary('');
      setIsApprovalOpen(false);
      setIsActivityOpen(false);
      setIsRevokeOpen(false);
      setIsHowItWorksOpen(false);
      setScreen('welcome');
      await refresh();
    } catch {
      // ignore
    } finally {
      setResetting(false);
    }
  };

  /* ── Role Navigation Handlers ── */
  const handleSwitchToCitizen = () => {
    if (['welcome', 'helper_signin'].includes(screen)) {
      setScreen('citizen_signin');
    } else {
      setScreen('citizen_home');
    }
  };

  const handleSwitchToHelper = () => {
    if (['welcome', 'citizen_signin'].includes(screen)) {
      setScreen('helper_signin');
    } else {
      setScreen(activePass ? 'helper_workspace' : 'helper_home');
    }
  };

  const isCitizenMode = ['citizen_signin', 'citizen_home', 'citizen_delegation', 'access_created'].includes(screen);
  const isHelperMode = ['helper_signin', 'helper_home', 'helper_workspace'].includes(screen);

  return (
    <div className="app-layout">
      {/* ══════════════════════════════════════════════════════════════
          TOP NAVIGATION (SIMPLE, CALM & PURPOSEFUL)
      ══════════════════════════════════════════════════════════════ */}
      <header className="top-header">
        <div className="top-header-inner">
          {/* Brand */}
          <button
            type="button"
            className="brand-link"
            onClick={() => setScreen('welcome')}
          >
            <div className="brand-icon-shield">
              <ShieldCheck size={18} />
            </div>
            <span className="brand-text">Sahayak Pass</span>
          </button>

          {/* Navigation Controls */}
          <div className="top-nav-actions">
            {/* Language Switcher */}
            <div className="lang-switcher">
              {[
                ['en', 'English'],
                ['hi', 'हिन्दी'],
                ['kn', 'ಕನ್ನಡ'],
              ].map(([code, label]) => (
                <button
                  key={code}
                  type="button"
                  className={`lang-btn ${lang === code ? 'active' : ''}`}
                  onClick={() => setLang(code)}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Mode Toggle: Citizen | Helper */}
            <div className="role-toggle">
              <button
                type="button"
                className={`role-btn ${isCitizenMode ? 'active' : ''}`}
                onClick={handleSwitchToCitizen}
              >
                {t.roleCitizen || 'Citizen'}
                {pendingStepUps.length > 0 && (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--color-amber)', display: 'inline-block' }} />
                )}
              </button>
              <button
                type="button"
                className={`role-btn ${isHelperMode ? 'active' : ''}`}
                onClick={handleSwitchToHelper}
              >
                {t.roleHelper || 'Helper'}
              </button>
            </div>

            {/* Reset Demo */}
            <button
              type="button"
              className="btn-reset-simple"
              onClick={handleReset}
              disabled={resetting}
              title="Reset all demo state"
            >
              <RotateCcw size={13} className={resetting ? 'spin-icon' : ''} />
              <span>{t.resetDemo || 'Reset Demo'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════════ */}
      <main className="app-content">
        {/* Screen 1: Welcome */}
        {screen === 'welcome' && (
          <WelcomeView
            lang={lang}
            onContinueCitizen={() => setScreen('citizen_signin')}
            onContinueHelper={() => setScreen('helper_signin')}
            onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          />
        )}

        {/* Screen 2: Citizen Demo Sign-in */}
        {screen === 'citizen_signin' && (
          <CitizenSignInView
            lang={lang}
            onBack={() => setScreen('welcome')}
            onSignInSuccess={(chosen) => {
              setCurrentCitizen(chosen);
              setScreen('citizen_home');
            }}
          />
        )}

        {/* Screen 3: Citizen Home */}
        {screen === 'citizen_home' && (
          <CitizenHomeView
            lang={lang}
            citizen={currentCitizen}
            activePass={activePass}
            pendingStepUps={pendingStepUps}
            audit={audit}
            onGetHelp={() => setScreen('citizen_delegation')}
            onViewPass={() => setScreen('access_created')}
            onRevokeClick={() => setIsRevokeOpen(true)}
            onOpenApproval={() => setIsApprovalOpen(true)}
            onViewActivity={() => setIsActivityOpen(true)}
          />
        )}

        {/* Screens 4-7: Delegation Flow (4-Step Wizard) */}
        {screen === 'citizen_delegation' && (
          <DelegationWizardView
            lang={lang}
            citizen={currentCitizen}
            actions={actions}
            savedHelpers={helpers}
            onCancel={() => setScreen('citizen_home')}
            onPassCreated={(newPass) => {
              setCreatedPass(newPass);
              setActivePass(newPass);
              setPassToken(newPass.token);
              setScreen('access_created');
              refresh();
            }}
          />
        )}

        {/* Screen 8: Access Created Confirmation */}
        {screen === 'access_created' && (
          <AccessCreatedView
            lang={lang}
            pass={createdPass || activePass}
            onContinueHome={() => setScreen('citizen_home')}
            onRevokeAccess={() => setIsRevokeOpen(true)}
            onSwitchToHelper={() => setScreen('helper_workspace')}
          />
        )}

        {/* Screen 9: Helper Demo Sign-in */}
        {screen === 'helper_signin' && (
          <HelperSignInView
            lang={lang}
            onBack={() => setScreen('welcome')}
            onSignInSuccess={(chosen) => {
              setCurrentHelper(chosen);
              setScreen(activePass ? 'helper_workspace' : 'helper_home');
            }}
          />
        )}

        {/* Screen 10: Helper Home */}
        {screen === 'helper_home' && (
          <HelperHomeView
            lang={lang}
            helper={currentHelper}
            activePass={activePass}
            citizen={currentCitizen}
            onOpenService={() => setScreen('helper_workspace')}
            onSwitchToCitizen={() => setScreen('citizen_home')}
          />
        )}

        {/* Screens 11-13, 15, 16: Helper Service Workspace */}
        {screen === 'helper_workspace' && (
          <HelperServiceWorkspaceView
            lang={lang}
            activePass={activePass}
            passToken={passToken}
            citizen={currentCitizen}
            helper={currentHelper}
            onBack={() => setScreen('helper_home')}
            onSwitchToCitizen={() => {
              setScreen('citizen_home');
              if (pendingStepUps.length > 0) setIsApprovalOpen(true);
            }}
            refreshAll={refresh}
          />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════
          MODALS: APPROVAL, ACTIVITY, REVOKE, HOW IT WORKS
      ══════════════════════════════════════════════════════════════ */}

      {/* Screen 14: Citizen Approval Modal (The Most Important Screen) */}
      {isApprovalOpen && pendingStepUps[0] && (
        <CitizenApprovalModal
          lang={lang}
          stepUp={pendingStepUps[0]}
          helperName={activePass?.helper_name || 'Ravi Kumar'}
          serviceName={t.srvWelfarePensions || 'Welfare & Pensions'}
          onClose={() => setIsApprovalOpen(false)}
          onResolved={() => {
            refresh();
          }}
        />
      )}

      {/* Screen 17: Activity History Modal */}
      {isActivityOpen && (
        <ActivityHistoryModal
          lang={lang}
          audit={audit}
          summary={summary}
          citizenName={currentCitizen.name}
          helperName={activePass?.helper_name || 'Ravi Kumar'}
          onClose={() => setIsActivityOpen(false)}
        />
      )}

      {/* Screen 18: Revoke Confirmation Dialog */}
      {isRevokeOpen && (activePass || createdPass) && (
        <RevokeModal
          lang={lang}
          passId={activePass?.id || createdPass?.id}
          helperName={activePass?.helper_name || createdPass?.helper_name || 'Ravi Kumar'}
          onClose={() => setIsRevokeOpen(false)}
          onRevoked={() => {
            setActivePass(null);
            setCreatedPass(null);
            refresh();
            if (screen === 'access_created') {
              setScreen('citizen_home');
            }
          }}
        />
      )}

      {/* Screen 20: How It Works Info Modal */}
      {isHowItWorksOpen && (
        <HowItWorksModal
          lang={lang}
          onClose={() => setIsHowItWorksOpen(false)}
        />
      )}

      {/* ── Public Service Prototype Footer ── */}
      <footer className="app-footer">
        <div className="footer-inner">
          <p>{t.disclaimer}</p>
          <button
            type="button"
            className="footer-link"
            onClick={() => setIsHowItWorksOpen(true)}
          >
            {t.howDoesThisWork || 'How does this work?'}
          </button>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
