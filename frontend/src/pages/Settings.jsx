import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  Eye,
  Globe2,
  HeartPulse,
  LogOut,
  Mic,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldCheck,
  Sliders,
  Trash2,
  Volume2,
  Video,
} from 'lucide-react';
import {
  getSettings,
  saveSettings,
  getLanguage,
  saveLanguage,
  clearHistory,
  saveProfile,
  defaultProfile,
  getBackendUrl,
  saveBackendUrl,
  getAuthUser,
} from '../lib/storage';
import { getSupabaseConfig, saveSupabaseConfig, testSupabaseConnection } from '../lib/supabase';
import { checkApiHealth, logoutUser } from '../lib/api';
import { languages } from '../data/i18n';
import { speakAnnouncement, playChime, isMicSupported, unlockAudio } from '../lib/speech';

export function Settings({ currentLang, onLanguageChange }) {
  const navigate = useNavigate();
  const [settings, setSettingsState] = useState(getSettings());
  const [lang, setLang] = useState(currentLang || getLanguage());
  const [notice, setNotice] = useState('');

  // Backend & Cloud Config States
  const [backendUrl, setBackendUrlState] = useState(getBackendUrl());
  const [apiHealth, setApiHealth] = useState(null);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());
  const [sbUrl, setSbUrl] = useState(sbConfig.url || '');
  const [sbKey, setSbKey] = useState(sbConfig.key || '');
  const [isTestingSb, setIsTestingSb] = useState(false);
  const [sbNotice, setSbNotice] = useState(null);
  const [authUser, setAuthUser] = useState(getAuthUser());

  useEffect(() => {
    checkApiHealth().then(setApiHealth);
  }, []);

  const handleSaveBackendUrl = () => {
    saveBackendUrl(backendUrl);
    showNotice('Backend URL saved');
    handleTestApi();
  };

  const handleTestApi = async () => {
    setIsTestingApi(true);
    const res = await checkApiHealth();
    setApiHealth(res);
    setIsTestingApi(false);
    showNotice(res.online ? 'Backend connected successfully!' : 'Could not reach backend');
  };

  const handleSaveSupabase = () => {
    saveSupabaseConfig(sbUrl, sbKey);
    const updated = getSupabaseConfig();
    setSbConfig(updated);
    showNotice('Supabase credentials saved');
  };

  const handleTestSupabase = async () => {
    setIsTestingSb(true);
    saveSupabaseConfig(sbUrl, sbKey);
    const updated = getSupabaseConfig();
    setSbConfig(updated);
    const res = await testSupabaseConnection();
    setSbNotice(res);
    setIsTestingSb(false);
    showNotice(res.success ? 'Supabase connected!' : `Supabase error: ${res.message}`);
  };

  const handleClearSupabase = () => {
    saveSupabaseConfig('', '');
    setSbUrl('');
    setSbKey('');
    setSbConfig({ url: '', key: '', isConfigured: false });
    showNotice('Supabase credentials cleared');
  };

  const handleSignOut = () => {
    logoutUser();
    setAuthUser(null);
    showNotice('Signed out');
    setTimeout(() => {
      navigate('/auth');
    }, 400);
  };

  const updateSetting = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettingsState(updated);
    saveSettings(updated);
    showNotice('Setting saved');
  };

  const handleLangChange = (code) => {
    setLang(code);
    saveLanguage(code);
    if (onLanguageChange) onLanguageChange(code);
    showNotice('Language updated');
  };

  const showNotice = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 3000);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your workout session logs?')) {
      clearHistory();
      showNotice('Workout history cleared');
    }
  };

  const handleResetProfile = () => {
    if (window.confirm('Reset all profile and onboarding preferences to default?')) {
      saveProfile(defaultProfile);
      showNotice('Profile reset to defaults');
    }
  };

  return (
    <div className="page fade-in settings-page">
      <section className="page-title">
        <div>
          <p className="eyebrow">PREFERENCES & CONTROLS</p>
          <h1>Settings</h1>
          <p className="lede">Customize your AI coach, audio cues, vision engine, and language.</p>
        </div>
        {notice && <span className="settings-saved-pill"><Check size={14} /> {notice}</span>}
      </section>

      <div className="settings-grid">
        {/* Language Selection */}
        <section className="settings-section">
          <div className="settings-section-head">
            <div className="settings-head-icon">
              <Globe2 size={18} />
            </div>
            <div>
              <h3>Language & Localization</h3>
              <p>Choose your preferred language across all navigation, guidance, and instructions.</p>
            </div>
          </div>

          <div className="language-options-grid">
            {languages.map((l) => (
              <button
                key={l.code}
                className={`lang-card ${lang === l.code ? 'active' : ''}`}
                onClick={() => handleLangChange(l.code)}
                data-testid={`settings-lang-${l.code}`}
              >
                <div>
                  <strong>{l.native}</strong>
                  <span>{l.label}</span>
                </div>
                {lang === l.code && <Check size={16} color="#a8f368" />}
              </button>
            ))}
          </div>
        </section>

        {/* Voice Coach & Audio */}
        <section className="settings-section">
          <div className="settings-section-head">
            <div className="settings-head-icon" style={{ background: '#25203e', color: '#bcaaff' }}>
              <Volume2 size={18} />
            </div>
            <div>
              <h3>Voice Coach & Audio Guidance</h3>
              <p>Control live speech synthesis, verbal cues, and rep completion chimes.</p>
            </div>
          </div>

          <div className="toggles-list">
            <label className="setting-toggle-row">
              <div>
                <strong>Voice Coach Guidance</strong>
                <span>Spoken rep counts, encouragement, and form cues during workout</span>
              </div>
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => updateSetting('voiceEnabled', e.target.checked)}
                data-testid="settings-voice-toggle"
              />
            </label>

            <label className="setting-toggle-row">
              <div>
                <strong>Rep Completion Chime</strong>
                <span>Plays a brief audio chime whenever a full rep is registered</span>
              </div>
              <input
                type="checkbox"
                checked={settings.repBeep}
                onChange={(e) => updateSetting('repBeep', e.target.checked)}
              />
            </label>

            <label className="setting-toggle-row">
              <div>
                <strong>Form Correction Prompts</strong>
                <span>Audio advice when joint angles or posture drift out of optimal range</span>
              </div>
              <input
                type="checkbox"
                checked={settings.formTips}
                onChange={(e) => updateSetting('formTips', e.target.checked)}
              />
            </label>

            <div className="setting-slider-row">
              <div>
                <strong>Coach Speaking Pace</strong>
                <span>Adjust voice synthesis cadence</span>
              </div>
              <div className="speech-rate-buttons">
                {[0.85, 1.0, 1.15].map((rate) => (
                  <button
                    key={rate}
                    className={`rate-btn ${settings.speechRate === rate ? 'active' : ''}`}
                    onClick={() => updateSetting('speechRate', rate)}
                  >
                    {rate === 0.85 ? 'Slow' : rate === 1.0 ? 'Normal' : 'Brisk'}
                  </button>
                ))}
              </div>
            </div>

            <div className="setting-slider-row" style={{ marginTop: 14 }}>
              <div>
                <strong>Audio & Mic Announcement Check</strong>
                <span>Test speech synthesis volume, speed, and verify microphone readiness</span>
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  className="secondary"
                  style={{ minHeight: 36, padding: '0 14px', fontSize: 11 }}
                  onClick={() => {
                    unlockAudio();
                    playChime(659.25, 'success');
                    speakAnnouncement(
                      `Welcome to Physiosaathi. Voice announcement is working properly at ${
                        settings.speechRate === 0.85 ? 'slow' : settings.speechRate === 1.15 ? 'brisk' : 'normal'
                      } pace. Real-time rep counts and form cues are active!`,
                      { priority: true, voiceEnabled: true, rate: settings.speechRate }
                    );
                    showNotice('Voice announcement test played');
                  }}
                  data-testid="test-voice-announcement-btn"
                >
                  <Volume2 size={14} /> Test Voice Announcement
                </button>
                <span className="mic-support-tag" data-testid="mic-support-status">
                  <Mic size={12} /> {isMicSupported() ? 'Mic Ready' : 'Mic Unavailable'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Computer Vision & Camera */}
        <section className="settings-section">
          <div className="settings-section-head">
            <div className="settings-head-icon" style={{ background: '#123835', color: '#26d9c2' }}>
              <Video size={18} />
            </div>
            <div>
              <h3>Pose Tracking & Vision</h3>
              <p>Tune camera display, visual skeleton overlays, and joint angle telemetry.</p>
            </div>
          </div>

          <div className="toggles-list">
            <label className="setting-toggle-row">
              <div>
                <strong>Mirror Camera View</strong>
                <span>Flips video feed horizontally for intuitive self-correction</span>
              </div>
              <input
                type="checkbox"
                checked={settings.mirrorCamera}
                onChange={(e) => updateSetting('mirrorCamera', e.target.checked)}
              />
            </label>

            <label className="setting-toggle-row">
              <div>
                <strong>Skeleton Overlay Lines</strong>
                <span>Renders glowing joint connections directly on your camera feed</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showSkeleton}
                onChange={(e) => updateSetting('showSkeleton', e.target.checked)}
              />
            </label>

            <label className="setting-toggle-row">
              <div>
                <strong>Joint Angle Readout HUD</strong>
                <span>Displays real-time degrees (knee angle, elbow flexion) on screen</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showAngles}
                onChange={(e) => updateSetting('showAngles', e.target.checked)}
              />
            </label>
          </div>

          <div className="privacy-badge-box">
            <ShieldCheck size={18} color="#a8f368" />
            <div>
              <strong>100% On-Device Vision Engine</strong>
              <span>Camera frames are processed entirely in browser memory. Video is never streamed to or stored on any cloud server.</span>
            </div>
          </div>
        </section>

        {/* Backend & Cloud Configuration */}
        <section className="settings-section" data-testid="settings-configuration-section">
          <div className="settings-section-head">
            <div className="settings-head-icon" style={{ background: '#1c2838', color: '#38bdf8' }}>
              <Server size={18} />
            </div>
            <div>
              <h3>Backend & Cloud Configuration</h3>
              <p>Manage FastAPI server routing, Supabase database keys, and account sessions.</p>
            </div>
          </div>

          <div className="config-form-container">
            {/* Backend Server Routing */}
            <div className="config-card-item">
              <div className="config-card-header">
                <div>
                  <strong>Backend FastAPI Service</strong>
                  <p>Handles real workout analytics, Coach Nova streaming, and account persistence.</p>
                </div>
                {apiHealth && (
                  <span className={`config-badge ${apiHealth.online ? 'success' : 'warn'}`}>
                    {apiHealth.online ? (
                      <>
                        <CheckCircle2 size={12} /> Connected (FastAPI v2.0.0)
                      </>
                    ) : (
                      <>
                        <AlertCircle size={12} /> Offline / Fallback
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="config-input-group">
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrlState(e.target.value)}
                  placeholder="http://localhost:8001"
                  data-testid="settings-backend-url-input"
                />
                <button
                  type="button"
                  className="secondary"
                  onClick={handleSaveBackendUrl}
                  data-testid="settings-save-backend-url-btn"
                >
                  Save URL
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleTestApi}
                  disabled={isTestingApi}
                  data-testid="settings-test-api-btn"
                >
                  {isTestingApi ? <RefreshCw size={14} className="spin" /> : 'Ping API'}
                </button>
              </div>
            </div>

            {/* Supabase Cloud Connection */}
            <div className="config-card-item">
              <div className="config-card-header">
                <div>
                  <strong>Supabase Cloud Credentials (Optional)</strong>
                  <p>Configure custom Supabase PostgreSQL & Auth instance keys.</p>
                </div>
                <span className={`config-badge ${sbConfig.isConfigured ? 'success' : 'neutral'}`}>
                  {sbConfig.isConfigured ? 'Configured' : 'Local Auth Active'}
                </span>
              </div>

              <div className="config-two-inputs">
                <label>
                  <span>Project URL</span>
                  <input
                    type="text"
                    value={sbUrl}
                    onChange={(e) => setSbUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    data-testid="settings-supabase-url-input"
                  />
                </label>
                <label>
                  <span>Publishable / Anon Key</span>
                  <input
                    type="password"
                    value={sbKey}
                    onChange={(e) => setSbKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    data-testid="settings-supabase-key-input"
                  />
                </label>
              </div>

              <div className="config-actions-row">
                <button
                  type="button"
                  className="secondary"
                  onClick={handleSaveSupabase}
                  data-testid="settings-save-supabase-btn"
                >
                  Save Supabase Keys
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={handleTestSupabase}
                  disabled={isTestingSb || !sbUrl || !sbKey}
                  data-testid="settings-test-supabase-btn"
                >
                  {isTestingSb ? <RefreshCw size={14} className="spin" /> : 'Test Connection'}
                </button>
                {sbConfig.isConfigured && (
                  <button
                    type="button"
                    className="secondary danger-btn"
                    onClick={handleClearSupabase}
                  >
                    Clear Keys
                  </button>
                )}
              </div>
              {sbNotice && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.825rem', color: sbNotice.success ? '#10b981' : '#f87171' }}>
                  {sbNotice.success ? '✓ ' : '✕ '} {sbNotice.message}
                </div>
              )}
            </div>

            {/* Authenticated Account Status */}
            <div className="config-card-item">
              <div className="config-card-header">
                <div>
                  <strong>Active User Session</strong>
                  <p>Current authentication context and credentials stored on this device.</p>
                </div>
                <span className="config-badge success">
                  <CheckCircle2 size={12} /> Active Session
                </span>
              </div>

              <div className="session-details-grid">
                <div>
                  <small>USER EMAIL</small>
                  <strong>{authUser?.email || 'Not signed in'}</strong>
                </div>
                <div>
                  <small>USER NAME</small>
                  <strong>{authUser?.name || 'Athlete'}</strong>
                </div>
                <div>
                  <small>AUTH ENGINE</small>
                  <strong style={{ color: '#a8f368' }}>
                    {sbConfig.isConfigured ? 'Supabase Auth' : 'Pysiosaathi Built-in Auth'}
                  </strong>
                </div>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="secondary danger-btn"
                  onClick={handleSignOut}
                  data-testid="settings-signout-btn"
                >
                  <LogOut size={14} /> End Session & Sign Out
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Data & Reset */}
        <section className="settings-section danger-zone">
          <div className="settings-section-head">
            <div className="settings-head-icon" style={{ background: '#3b2023', color: '#f87171' }}>
              <Sliders size={18} />
            </div>
            <div>
              <h3>Data & Account Controls</h3>
              <p>Manage your stored workout history, cached sessions, and local presets.</p>
            </div>
          </div>

          <div className="action-buttons-row">
            <button
              className="secondary danger-btn"
              onClick={handleClearHistory}
              data-testid="settings-clear-history-btn"
            >
              <Trash2 size={15} /> Clear Workout History
            </button>
            <button
              className="secondary"
              onClick={handleResetProfile}
              data-testid="settings-reset-profile-btn"
            >
              <RotateCcw size={15} /> Reset Profile to Defaults
            </button>
          </div>
        </section>

        {/* Medical & Safety Disclaimer */}
        <section className="settings-disclaimer">
          <HeartPulse size={20} color="#8b5cf6" />
          <div>
            <strong>Medical & Fitness Safety Disclaimer</strong>
            <p>
              Pysiosaathi provides general athletic coaching, movement tracking, and fitness structure. It does not provide medical diagnosis, rehabilitation therapy, or personalized treatment. Consult a licensed physician or physical therapist before starting any new fitness regime, especially if you have pre-existing injuries or health conditions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

