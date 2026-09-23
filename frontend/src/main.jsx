import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ShieldCheck, RotateCcw, ArrowRight, Layers } from 'lucide-react';
import { T } from './i18n';
import { resetDemo } from './api';
import CitizenView from './components/CitizenView';
import HelperView from './components/HelperView';
import './styles/app.css';

function App() {
  const [view, setView] = useState('citizen');
  const [lang, setLang] = useState('en');
  const [passToken, setPassToken] = useState('');
  const [passId, setPassId] = useState(null);
  const [resetting, setResetting] = useState(false);

  const t = T[lang];

  const handleReset = async () => {
    setResetting(true);
    try {
      await resetDemo();
      setPassToken('');
      setPassId(null);
      setView('citizen');
      window.location.reload();
    } catch {
      setResetting(false);
    }
  };

  return (
    <>
      {/* ── Top Header ── */}
      <header className="app-header">
        <div className="nav-brand">
          <ShieldCheck />
          <span>Sahayak <strong>Pass</strong></span>
        </div>

        <nav className="nav-tabs">
          <button
            className={`nav-tab ${view === 'citizen' ? 'active' : ''}`}
            onClick={() => setView('citizen')}
          >
            {t.citizen}
          </button>
          <button
            className={`nav-tab ${view === 'helper' ? 'active' : ''}`}
            onClick={() => setView('helper')}
          >
            {t.helper}
          </button>
        </nav>

        <div className="nav-right">
          <div className="lang-switcher">
            {[['en', 'English'], ['hi', 'हिन्दी'], ['kn', 'ಕನ್ನಡ']].map(([id, label]) => (
              <button
                key={id}
                className={`lang-btn ${lang === id ? 'active' : ''}`}
                onClick={() => setLang(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <button className="btn-reset" onClick={handleReset} disabled={resetting}>
            <RotateCcw />
            {t.resetDemo}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="app-content">
        {/* Core Architecture Pipeline Pill */}
        <div className="arch-banner">
          <Layers />
          <span><strong>Architecture:</strong></span>
          <span className="arch-pipeline-pill">Service</span>
          <ArrowRight style={{ width: 12, height: 12 }} />
          <span className="arch-pipeline-pill">Action</span>
          <ArrowRight style={{ width: 12, height: 12 }} />
          <span className="arch-pipeline-pill">Risk Level</span>
          <ArrowRight style={{ width: 12, height: 12 }} />
          <span className="arch-pipeline-pill" style={{ background: '#d4eddc', color: '#1B5E3B' }}>Sahayak Pass Scoped Access</span>
        </div>

        {/* Reusable Delegation Notice */}
        <div className="reusable-banner">
          <ShieldCheck />
          <span>{t.reusableNotice}</span>
        </div>

        {view === 'citizen' ? (
          <CitizenView
            lang={lang}
            setLang={setLang}
            passToken={passToken}
            setPassToken={setPassToken}
            passId={passId}
            setPassId={setPassId}
          />
        ) : (
          <HelperView
            lang={lang}
            passToken={passToken}
            setPassToken={setPassToken}
          />
        )}

        {/* Subtle Prototype Disclaimer */}
        <footer className="subtle-disclaimer">
          {t.disclaimer}
        </footer>
      </main>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
