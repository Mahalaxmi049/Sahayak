import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, RotateCcw, Mic, Volume2 } from 'lucide-react';
import { T, getServiceIdFromActions, getServiceLabel } from './i18n';
import {
  getCitizen, getCitizens, getHelpers, getCitizenPasses, getPendingStepUps,
  getAudit, getSummary, resetDemo, getActions, asUTC, resolveStepUp
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
import VoiceAssistantModal from './components/VoiceAssistantModal';
import FloatingAssistant from './components/FloatingAssistant';

import './styles/app.css';

const DEFAULT_CITIZEN_ID = 1;

function App() {
  /* ── Current Navigation Screen ──
     'welcome' | 'citizen_signin' | 'citizen_home' | 'citizen_delegation' | 'access_created' | 'helper_signin' | 'helper_home' | 'helper_workspace'
  ── */
  const [screen, setScreen] = useState('welcome');
  const [lang, setLang] = useState('en');

  /* ── Accessibility State ── */
  const [fontSize, setFontSize] = useState('normal'); // 'normal' | 'lg' | 'xl'
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.body.classList.remove('font-size-lg', 'font-size-xl');
    if (fontSize === 'lg') document.body.classList.add('font-size-lg');
    if (fontSize === 'xl') document.body.classList.add('font-size-xl');
  }, [fontSize]);

  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('contrast-high');
    } else {
      document.body.classList.remove('contrast-high');
    }
  }, [highContrast]);

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
  const [citizensList, setCitizensList] = useState([]);
  const [helpers, setHelpers] = useState([]);
  const [actions, setActions] = useState([]);
  const [activePass, setActivePass] = useState(null);
  const [createdPass, setCreatedPass] = useState(null);
  const [passToken, setPassToken] = useState('');
  const [pendingStepUps, setPendingStepUps] = useState([]);
  const [audit, setAudit] = useState([]);
  const [summary, setSummary] = useState('');
  const [resetting, setResetting] = useState(false);

  /* ── Modals & Assistants ── */
  const [isApprovalOpen, setIsApprovalOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const t = T[lang] || T.en;

  /* ── Fetch Core State from Real Backend ── */
  const refresh = useCallback(async () => {
    try {
      const [c, cList, h, aList] = await Promise.all([
        getCitizen(DEFAULT_CITIZEN_ID),
        getCitizens(),
        getHelpers(),
        getActions(lang),
      ]);
      setCitizen(c);
      setCitizensList(cList || []);
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

  /* ── Reset Prototype Session ── */
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
      setIsVoiceOpen(false);
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
            title="Sahayak Pass - Home"
          >
            <div className="brand-icon-shield">
              <ShieldCheck size={18} />
            </div>
            <span className="brand-text">Sahayak Pass</span>
          </button>

          {/* Clean Navigation Links (Section 4) */}
          <nav className="nav-links-row" aria-label="Main Navigation">
            <button
              type="button"
              className={`nav-link-btn ${['welcome', 'citizen_home', 'helper_home'].includes(screen) ? 'active' : ''}`}
              onClick={() => {
                if (isHelperMode) setScreen('helper_home');
                else if (isCitizenMode) setScreen('citizen_home');
                else setScreen('welcome');
              }}
            >
              {t.navHome || 'Home'}
            </button>

            <button
              type="button"
              className={`nav-link-btn ${['access_created', 'helper_workspace', 'citizen_delegation'].includes(screen) ? 'active' : ''}`}
              onClick={() => {
                if (isHelperMode) {
                  setScreen(activePass ? 'helper_workspace' : 'helper_home');
                } else {
                  setScreen(activePass ? 'access_created' : 'citizen_delegation');
                }
              }}
            >
              {isHelperMode ? (t.navAssistedSessions || 'Assisted Sessions') : (t.navMyAccess || 'My Access')}
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() => setIsActivityOpen(true)}
            >
              {t.navActivity || 'Activity'}
            </button>

            <button
              type="button"
              className="nav-link-btn"
              onClick={() => setIsHowItWorksOpen(true)}
            >
              {t.navHelp || 'Help'}
            </button>
          </nav>

          {/* Navigation Controls */}
          <div className="top-nav-actions">
            {/* Accessibility Controls: Font Size & High Contrast (Section 3 & 11) */}
            <div className="a11y-controls-group" title={t.a11yControls || 'Accessibility'}>
              <button
                type="button"
                className={`a11y-btn ${fontSize === 'normal' ? 'active' : ''}`}
                onClick={() => setFontSize('normal')}
                title={t.fontNormal || 'Standard font'}
                aria-label="Standard font"
              >
                A
              </button>
              <button
                type="button"
                className={`a11y-btn ${fontSize === 'lg' ? 'active' : ''}`}
                onClick={() => setFontSize('lg')}
                title={t.fontLarge || 'Large font'}
                aria-label="Large font"
              >
                A+
              </button>
              <button
                type="button"
                className={`a11y-btn ${fontSize === 'xl' ? 'active' : ''}`}
                onClick={() => setFontSize('xl')}
                title={t.fontExtraLarge || 'Extra large font'}
                aria-label="Extra large font"
              >
                A++
              </button>
              <button
                type="button"
                className={`a11y-btn ${highContrast ? 'active' : ''}`}
                onClick={() => setHighContrast(!highContrast)}
                title={t.contrastToggle || 'High contrast mode'}
                aria-label="Toggle high contrast"
                style={{ borderLeft: '1px solid var(--border-color)', marginLeft: 2 }}
              >
                {highContrast ? '● HC' : '○ HC'}
              </button>
            </div>

            {/* Voice Assistant Button (Section 7) */}
            <button
              type="button"
              className="btn-voice-trigger"
              onClick={() => setIsVoiceOpen(true)}
              title={t.voiceButtonTooltip || 'Voice assistance'}
              aria-label={t.voiceButtonTooltip || 'Voice assistance'}
            >
              <Mic size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="voice-btn-text">Voice</span>
            </button>

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

            {/* Mode Switcher: Citizen | Helper */}
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

            {/* Reset Session (Section 2: professional wording) */}
            <button
              type="button"
              className="btn-reset-simple"
              onClick={handleReset}
              disabled={resetting}
              title="Reset prototype session"
            >
              <RotateCcw size={13} className={resetting ? 'spin-icon' : ''} />
              <span>{t.resetSession || 'Reset session'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════════ */}
      <main className="app-content">
        {/* Screen 1: Clean, welcoming first screen (Section 3) */}
        {screen === 'welcome' && (
          <WelcomeView
            lang={lang}
            onContinueCitizen={() => setScreen('citizen_signin')}
            onContinueHelper={() => setScreen('helper_signin')}
            onOpenHowItWorks={() => setIsHowItWorksOpen(true)}
          />
        )}

        {/* Screen 2: Citizen Sign-in */}
        {screen === 'citizen_signin' && (
          <CitizenSignInView
            lang={lang}
            citizens={citizensList}
            onBack={() => setScreen('welcome')}
            onSignInSuccess={(chosen) => {
              setCurrentCitizen(chosen);
              setScreen('citizen_home');
            }}
          />
        )}

        {/* Screen 3: Citizen Home (Section 5) */}
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

        {/* Screens 4-7: Delegation Flow (Section 5) */}
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

        {/* Screen 8: Access Created Confirmation with Official Portal Link (Section 5 & 6) */}
        {screen === 'access_created' && (
          <AccessCreatedView
            lang={lang}
            pass={createdPass || activePass}
            onContinueHome={() => setScreen('citizen_home')}
            onRevokeAccess={() => setIsRevokeOpen(true)}
            onSwitchToHelper={() => setScreen('helper_workspace')}
          />
        )}

        {/* Screen 9: Helper Sign-in */}
        {screen === 'helper_signin' && (
          <HelperSignInView
            lang={lang}
            helpers={helpers}
            onBack={() => setScreen('welcome')}
            onSignInSuccess={(chosen) => {
              setCurrentHelper(chosen);
              setScreen(activePass ? 'helper_workspace' : 'helper_home');
            }}
          />
        )}

        {/* Screen 10: Helper Home (Section 9) */}
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

        {/* Helper Service Workspace (Section 9) */}
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
          FOOTER (SECTION 2: SINGLE PROFESSIONAL DISCLAIMER)
      ══════════════════════════════════════════════════════════════ */}
      <footer className="app-footer">
        <div className="footer-inner">
          <div style={{ maxWidth: 520, textAlign: 'left' }}>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              {t.prototypeDisclaimer}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-subtle)', marginTop: 4 }}>
              {t.productMission}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <a href="https://web.umang.gov.in/" target="_blank" rel="noopener noreferrer" className="footer-link">
              UMANG
            </a>
            <span>·</span>
            <a href="https://www.digilocker.gov.in/" target="_blank" rel="noopener noreferrer" className="footer-link">
              DigiLocker
            </a>
            <span>·</span>
            <a href="https://www.india.gov.in/" target="_blank" rel="noopener noreferrer" className="footer-link">
              India.gov.in
            </a>
            <span>·</span>
            <button type="button" className="footer-link" onClick={() => setIsHowItWorksOpen(true)}>
              {t.navHelp || 'Help'}
            </button>
          </div>
        </div>
      </footer>

      {/* ══════════════════════════════════════════════════════════════
          FLOATING ASSISTANT (SECTION 8)
      ══════════════════════════════════════════════════════════════ */}
      <FloatingAssistant
        lang={lang}
        onOpenApprovals={() => {
          if (pendingStepUps.length > 0) {
            setIsApprovalOpen(true);
          } else {
            setScreen('citizen_home');
          }
        }}
        onOpenDelegation={() => setScreen('citizen_delegation')}
        onOpenActivity={() => setIsActivityOpen(true)}
        hasPendingStepUps={pendingStepUps.length > 0}
      />

      {/* ══════════════════════════════════════════════════════════════
          MODALS: SENSITIVE APPROVAL, ACTIVITY, REVOKE, HOW IT WORKS, VOICE
      ══════════════════════════════════════════════════════════════ */}

      {/* Citizen Approval Modal (Section 10: Crucial Security Experience) */}
      {isApprovalOpen && pendingStepUps[0] && (
        <CitizenApprovalModal
          lang={lang}
          stepUp={pendingStepUps[0]}
          helperName={activePass?.helper_name || 'Ravi Kumar'}
          citizenName={currentCitizen?.name || 'Savitri Devi'}
          serviceName={getServiceLabel(activePass?.service || getServiceIdFromActions(activePass?.allowed_actions), t)}
          onClose={() => setIsApprovalOpen(false)}
          onResolved={() => {
            refresh();
          }}
        />
      )}

      {/* Activity History Modal */}
      {isActivityOpen && (
        <ActivityHistoryModal
          lang={lang}
          audit={audit}
          summary={summary}
          citizenName={currentCitizen?.name || 'Savitri Devi'}
          helperName={activePass?.helper_name || 'Ravi Kumar'}
          onClose={() => setIsActivityOpen(false)}
        />
      )}

      {/* Revoke Modal */}
      {isRevokeOpen && (activePass || createdPass) && (
        <RevokeModal
          lang={lang}
          passId={activePass?.id || createdPass?.id}
          helperName={activePass?.helper_name || createdPass?.helper_name || 'Ravi Kumar'}
          onClose={() => setIsRevokeOpen(false)}
          onRevoked={() => {
            setActivePass(null);
            setCreatedPass(null);
            setScreen('citizen_home');
            refresh();
          }}
        />
      )}

      {/* How It Works Modal */}
      {isHowItWorksOpen && (
        <HowItWorksModal
          lang={lang}
          onClose={() => setIsHowItWorksOpen(false)}
        />
      )}

      {/* Voice Assistant Modal (Section 7) */}
      <VoiceAssistantModal
        lang={lang}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        onNavigate={(sc) => setScreen(sc)}
        onSelectService={(srv) => {
          setScreen('citizen_delegation');
        }}
        onOpenApprovals={() => {
          if (pendingStepUps[0]) {
            setIsApprovalOpen(true);
          } else {
            setScreen('citizen_home');
          }
        }}
        onOpenHelp={() => setIsHowItWorksOpen(true)}
        onOpenMyAccess={() => {
          if (activePass) setScreen('access_created');
          else setScreen('citizen_home');
        }}
        pendingStepUp={pendingStepUps[0]}
        onResolveApproval={async (id, decision, via) => {
          await resolveStepUp(id, decision, via);
          refresh();
        }}
      />
    </div>
  );
}

const root = createRoot(document.getElementById('root'));
root.render(<App />);
