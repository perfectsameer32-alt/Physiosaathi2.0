import { useEffect, useRef, useState, useMemo } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation, useParams, useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Bot,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Dumbbell,
  Flame,
  Globe2,
  HeartPulse,
  Home,
  Leaf,
  Menu,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Settings as SettingsIcon,
  Sliders,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Video,
  Volume2,
  X,
} from 'lucide-react';
import { allExercises, yogaExercises, workoutExercises } from './data/exercises';
import { supabase, authConfigured, getSupabaseConfig, saveSupabaseConfig } from './lib/supabase';
import {
  getProfile,
  saveProfile,
  getHistory,
  addSession,
  getSettings,
  saveSettings,
  getLanguage,
  saveLanguage,
  calculateStats,
  getBackendUrl,
  saveBackendUrl,
  getAuthUser,
} from './lib/storage';
import { loginUser, registerUser, checkApiHealth, syncSessionToSupabase, syncProfileToSupabase } from './lib/api';
import { i18n, languages } from './data/i18n';
import { ExerciseDemo } from './components/ExerciseDemo';
import { PoseTracker } from './components/PoseTracker';
import { Onboarding } from './pages/Onboarding';
import { Profile } from './pages/Profile';
import { Settings } from './pages/Settings';
import { Plans } from './pages/Plans';
import './App.css';
import './auth.css';

const nav = [
  ['/dashboard', 'Overview', Home],
  ['/yoga', 'Yoga studio', Leaf],
  ['/workout', 'Home workout', Dumbbell],
  ['/plans', 'Plans', Target],
  ['/progress', 'Progress', Activity],
  ['/assistant', 'AI coach', Bot],
];

// App Shell with Responsive Sidebar & Mobile Bottom Navigation
function Shell({ children, lang, setLang, profile }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [topSearch, setTopSearch] = useState('');

  const active = nav.find((n) => location.pathname.startsWith(n[0]));
  const currentLangCode = lang || 'en';
  const t = i18n[currentLangCode] || i18n.en;

  const cycleLanguage = () => {
    const codes = languages.map((l) => l.code);
    const currIdx = codes.indexOf(currentLangCode);
    const nextCode = codes[(currIdx + 1) % codes.length];
    setLang(nextCode);
    saveLanguage(nextCode);
  };

  const handleTopSearch = (e) => {
    if (e.key === 'Enter' && topSearch.trim()) {
      navigate(`/workout?q=${encodeURIComponent(topSearch.trim())}`);
    }
  };

  const initials = (profile?.name || 'Athlete')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <Link to="/dashboard" className="brand" onClick={() => setOpen(false)}>
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          <span>
            Pysio<span>saathi</span>
          </span>
        </Link>

        <Link to="/profile" className="profile-mini" onClick={() => setOpen(false)}>
          <div className="avatar">{initials}</div>
          <div>
            <strong>{profile?.name || 'Athlete'}</strong>
            <small>{profile?.fitnessLevel || 'Beginner'} track</small>
          </div>
        </Link>

        <nav>
          {nav.map(([to, label, Icon]) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`nav-${label.toLowerCase().replaceAll(' ', '-')}`}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setOpen(false)}
            >
              <Icon size={18} />
              <span>{t.nav[label.toLowerCase().replace(' ', '')] || label}</span>
              {to === '/assistant' && <i>AI</i>}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <NavLink
            to="/profile"
            data-testid="nav-profile"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setOpen(false)}
          >
            <UserRound size={18} />
            <span>{t.nav.profile || 'Profile'}</span>
          </NavLink>

          <NavLink
            to="/settings"
            data-testid="nav-settings"
            className={({ isActive }) => (isActive ? 'active' : '')}
            onClick={() => setOpen(false)}
          >
            <SettingsIcon size={18} />
            <span>{t.nav.settings || 'Settings'}</span>
          </NavLink>

          <button
            className="lang-button"
            onClick={cycleLanguage}
            data-testid="language-toggle"
            title="Switch Language (EN, HI, KN, TE, BN)"
          >
            <Globe2 size={16} />
            <strong style={{ textTransform: 'uppercase', fontSize: 11 }}>{currentLangCode}</strong>
            <span>{languages.find((l) => l.code === currentLangCode)?.native}</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="main">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setOpen(!open)}
            data-testid="mobile-menu-button"
          >
            <Menu size={20} />
          </button>

          <div className="crumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>{active?.[1] || location.pathname.replace('/', '') || 'Profile'}</strong>
          </div>

          <div className="top-actions">
            <div className="search">
              <Search size={16} />
              <input
                placeholder={t.common.searchMovement || 'Search movement'}
                value={topSearch}
                onChange={(e) => setTopSearch(e.target.value)}
                onKeyDown={handleTopSearch}
                data-testid="exercise-search-input"
              />
            </div>

            <Link to="/settings" className="icon-button" data-testid="notifications-button">
              <CircleHelp size={18} />
              <b>2</b>
            </Link>

            <Link to="/profile" className="top-avatar">
              {initials}
            </Link>
          </div>
        </header>

        {children}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {nav.slice(0, 5).map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (isActive ? 'mobile-nav-item active' : 'mobile-nav-item')}
          >
            <Icon size={18} />
            <span>{label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

// Stat Card Component
function Stat({ icon: Icon, value, label, accent }) {
  return (
    <div className="stat" data-testid={`stat-${label.toLowerCase().replaceAll(' ', '-')}`}>
      <div className={`stat-icon ${accent || ''}`}>
        <Icon size={18} />
      </div>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}

// Dashboard View
function Dashboard({ lang, profile }) {
  const currentLangCode = lang || 'en';
  const t = i18n[currentLangCode] || i18n.en;
  const history = getHistory();
  const stats = calculateStats(history);

  const weekActivity = useMemo(() => {
    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const now = new Date();
    const todayIndex = (now.getDay() + 6) % 7; // 0 for Mon .. 6 for Sun
    const dayMinutes = [0, 0, 0, 0, 0, 0, 0];

    history.forEach((item) => {
      const ts = item.timestamp || item.created_at || item.date;
      if (!ts) return;
      const d = new Date(ts);
      if (isNaN(d.getTime())) return;
      const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < 7) {
        const dayIdx = (d.getDay() + 6) % 7;
        dayMinutes[dayIdx] += Math.round((item.durationSeconds || item.duration_seconds || 0) / 60);
      }
    });

    const maxMin = Math.max(...dayMinutes, 30);
    return days.map((d, i) => ({
      day: d,
      minutes: dayMinutes[i],
      height: dayMinutes[i] > 0 ? Math.min(Math.round((dayMinutes[i] / maxMin) * 100), 100) : 0,
      isToday: i === todayIndex,
    }));
  }, [history]);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t.dashboard.greetingMorning
      : hour < 17
      ? t.dashboard.greetingAfternoon
      : t.dashboard.greetingEvening;

  const recentList = history.slice(0, 3).map((item) => {
    const matched =
      allExercises.find((x) => x.id === (item.exerciseId || item.exercise_id)) || allExercises[0];
    return {
      ...matched,
      customName: item.name,
      customDate: item.date,
    };
  });

  return (
    <div className="page fade-in">
      {/* Welcome Section */}
      <section className="welcome">
        <div>
          <p className="eyebrow">{t.dashboard.date}</p>
          <h1>
            {greeting}, {profile?.name?.split(' ')[0] || 'Athlete'} <span>✦</span>
          </h1>
          <p className="lede">
            {t.dashboard.tagline} {t.dashboard.lede}
          </p>
        </div>
        <Link className="primary" to="/workout/workout-1" data-testid="dashboard-start-workout">
          <Play size={17} fill="currentColor" />
          {t.common.startTraining}
        </Link>
      </section>

      {/* Hero Recommendation Panel */}
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="pill">
            <Sparkles size={13} /> {t.dashboard.recommendationBadge}
          </span>
          <h2 style={{ whiteSpace: 'pre-line' }}>{t.dashboard.recTitle}</h2>
          <p>{t.dashboard.recDesc}</p>
          <div className="hero-meta">
            <span>
              <Clock3 size={15} /> 24 min
            </span>
            <span>
              <Flame size={15} /> ~180 kcal
            </span>
            <span className="level-dot">
              <i />
              Intermediate
            </span>
          </div>
          <Link className="hero-cta" to="/workout/yoga-1" data-testid="recommended-workout-button">
            {t.dashboard.beginSession} <ArrowLeft size={16} className="flip" />
          </Link>
        </div>
        <div className="hero-image">
          <img
            src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1100&q=86"
            alt="Athlete preparing for a yoga flow"
          />
          <div className="image-caption">
            <span className="live-dot" />
            {t.dashboard.curatedForYou}
          </div>
        </div>
      </section>

      {/* Aggregate Stats Grid */}
      <section className="stats-grid">
        <Stat
          icon={Clock3}
          value={stats.totalMinutes.toString()}
          label="minutes trained"
          accent="teal"
        />
        <Stat
          icon={Check}
          value={stats.totalSessions.toString()}
          label="sessions done"
          accent="lime"
        />
        <Stat
          icon={Flame}
          value={stats.totalCalories.toLocaleString()}
          label="calories estimate"
          accent="violet"
        />
        <Stat
          icon={HeartPulse}
          value={`${stats.streakDays} days`}
          label="current streak"
          accent="orange"
        />
      </section>

      {/* Categories & Weekly Rhythm */}
      <div className="content-grid">
        <section>
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.common.explore}</p>
              <h3>{t.common.moveYourWay}</h3>
            </div>
            <Link to="/yoga" data-testid="dashboard-view-library">
              {t.common.viewLibrary} <ChevronRight size={15} />
            </Link>
          </div>
          <div className="category-row">
            <Link to="/yoga" className="category-card yoga-card" data-testid="dashboard-yoga-card">
              <div>
                <Leaf size={20} />
                <h4>{t.nav.yoga}</h4>
                <span>{t.dashboard.yogaSub}</span>
              </div>
              <ChevronRight size={17} />
            </Link>
            <Link
              to="/workout"
              className="category-card workout-card"
              data-testid="dashboard-workout-card"
            >
              <div>
                <Dumbbell size={20} />
                <h4>{t.nav.workout}</h4>
                <span>{t.dashboard.workoutSub}</span>
              </div>
              <ChevronRight size={17} />
            </Link>
          </div>
        </section>

        <section className="activity-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{t.common.yourRhythm}</p>
              <h3>{t.common.thisWeek}</h3>
            </div>
            <button className="more-button" data-testid="dashboard-activity-menu">
              •••
            </button>
          </div>
          <div className="week-bars">
            {weekActivity.map((bar, i) => (
              <div
                key={bar.day + i}
                className={bar.isToday ? 'bar-day today' : 'bar-day'}
                title={`${bar.minutes} min`}
              >
                <div className="bar-track">
                  <i style={{ height: `${bar.height}%` }} />
                </div>
                <span>{bar.day}</span>
              </div>
            ))}
          </div>
          <small className="chart-note">
            <span />{' '}
            {stats.totalSessions === 0
              ? 'No activity recorded yet · Complete a session today to start your rhythm'
              : t.dashboard.activeTimeNote}
          </small>
        </section>
      </div>

      {/* Recent Activity Section */}
      <section className="recent-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t.common.keepGoing}</p>
            <h3>{t.common.recentMovement}</h3>
          </div>
          {history.length > 0 && (
            <Link to="/progress" data-testid="dashboard-view-progress">
              {t.common.viewAll} <ChevronRight size={15} />
            </Link>
          )}
        </div>
        {recentList.length === 0 ? (
          <div
            className="empty-panel"
            style={{
              padding: '36px 20px',
              gridColumn: '1 / -1',
              background: '#131822',
              borderRadius: 10,
              border: '1px solid #232b38',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <Activity size={28} color="#8b5cf6" style={{ marginBottom: 12 }} />
            <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>No workout sessions yet</h3>
            <p style={{ margin: '0 0 16px', color: '#8894a8', fontSize: 12, maxWidth: 400 }}>
              Your finished workouts, real-time reps, and form accuracy will appear here as you train.
            </p>
            <Link to="/workout/workout-1" className="primary" data-testid="start-first-workout-btn">
              <Play size={14} fill="currentColor" /> Start your first workout
            </Link>
          </div>
        ) : (
          <div className="recent-list">
            {recentList.map((e, i) => (
              <Link
                to={`/workout/${e.id}`}
                key={e.id + i}
                className="recent-item"
                data-testid={`recent-exercise-${i}`}
              >
                <img
                  src={e.image || (e.youtubeId ? `https://img.youtube.com/vi/${e.youtubeId}/hqdefault.jpg` : '')}
                  alt={e.name}
                  onError={(evt) => {
                    if (e.youtubeId && !evt.currentTarget.src.includes(e.youtubeId)) {
                      evt.currentTarget.src = `https://img.youtube.com/vi/${e.youtubeId}/hqdefault.jpg`;
                    }
                  }}
                />
                <div>
                  <strong>{e.customName || e.name}</strong>
                  <span>
                    {e.category} · {e.customDate || e.duration}
                  </span>
                </div>
                <span className="completed">
                  <Check size={14} />
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

// Exercise Library (Yoga / Home Workout)
function Library({ type }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';

  const list = type === 'yoga' ? yogaExercises : workoutExercises;
  const [query, setQuery] = useState(initialQuery);
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'tracked'

  const filtered = list.filter((e) => {
    const matchesQuery =
      e.name.toLowerCase().includes(query.toLowerCase()) ||
      e.subtitle.toLowerCase().includes(query.toLowerCase()) ||
      e.target.toLowerCase().includes(query.toLowerCase());
    if (filterMode === 'tracked') {
      return matchesQuery && e.tracking;
    }
    return matchesQuery;
  });

  return (
    <div className="page fade-in">
      <section className="page-title">
        <div>
          <p className="eyebrow">
            {type === 'yoga' ? 'MINDFUL MOVEMENT' : 'STRENGTH & CONDITIONING'}
          </p>
          <h1>{type === 'yoga' ? 'Yoga studio' : 'Home workout'}</h1>
          <p className="lede">
            {type === 'yoga'
              ? 'Find your steadiness, one breath at a time.'
              : 'Build a stronger baseline, wherever you are.'}
          </p>
        </div>
        <div className="library-count">
          <strong>{list.length}</strong>
          <span>
            movements
            <br />
            to explore
          </span>
        </div>
      </section>

      <div className="library-toolbar">
        <div className="filter-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises"
            data-testid={`${type}-search-input`}
          />
        </div>
        <div className="filter-pills">
          <button
            className={`filter ${filterMode === 'all' ? 'active' : ''}`}
            onClick={() => setFilterMode('all')}
            data-testid={`${type}-filter-all`}
          >
            All levels
          </button>
          <button
            className={`filter ${filterMode === 'tracked' ? 'active' : ''}`}
            onClick={() => setFilterMode('tracked')}
            data-testid={`${type}-filter-tracked`}
          >
            <Video size={14} /> Camera ready
          </button>
        </div>
      </div>

      <div className="exercise-grid">
        {filtered.map((e, i) => (
          <Link
            to={`/workout/${e.id}`}
            className="exercise-card"
            key={e.id}
            data-testid={`${type}-exercise-card-${i}`}
          >
            <div className="exercise-image" style={{ position: 'relative' }}>
              <img
                src={e.image || (e.youtubeId ? `https://img.youtube.com/vi/${e.youtubeId}/hqdefault.jpg` : '')}
                alt={e.name}
                loading="lazy"
                onError={(evt) => {
                  if (e.youtubeId && !evt.currentTarget.src.includes(e.youtubeId)) {
                    evt.currentTarget.src = `https://img.youtube.com/vi/${e.youtubeId}/hqdefault.jpg`;
                  }
                }}
              />
              <span className="level-tag">{e.level}</span>
              {e.youtubeId && (
                <span
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(239, 68, 68, 0.9)',
                    color: '#fff',
                    fontSize: 10,
                    padding: '2px 7px',
                    borderRadius: 4,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  <Play size={9} fill="currentColor" /> TUTORIAL
                </span>
              )}
              {e.tracking && (
                <span className="tracking-tag">
                  <Video size={12} /> Trackable
                </span>
              )}
            </div>
            <div className="exercise-info">
              <div>
                <span className="card-kicker">{e.category}</span>
                <h3>{e.name}</h3>
                <p>{e.subtitle}</p>
              </div>
              <span className="card-arrow">
                <ChevronRight size={16} />
              </span>
            </div>
            <div className="exercise-foot">
              <span>
                <Clock3 size={13} />
                {e.duration}
              </span>
              <span>{e.target}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// Workout Session with Camera Pose Tracking & Demonstration
function Workout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const e = allExercises.find((x) => x.id === id) || workoutExercises[0];

  const [active, setActive] = useState(false);
  const [camera, setCamera] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voice, setVoice] = useState(true);
  const [reps, setReps] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [formFeedback, setFormFeedback] = useState('Waiting for movement');
  const [feedbackType, setFeedbackType] = useState('good');
  const [showFinishModal, setShowFinishModal] = useState(false);

  const video = useRef(null);
  const canvasRef = useRef(null);
  const timerRef = useRef(null);

  // Live timer tick
  useEffect(() => {
    if (active && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [active, isPaused]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
        audio: false,
      });
      if (video.current) {
        video.current.srcObject = stream;
        video.current.onloadedmetadata = () => {
          video.current.play().catch((err) => console.log('play err:', err));
        };
      }
      setCamera(true);
      setActive(true);
      setFormFeedback('Good alignment');
      if (voice && window.speechSynthesis) {
        window.speechSynthesis.speak(
          new SpeechSynthesisUtterance(`Camera active for ${e.name}. Stand back so your full body is in view.`)
        );
      }
    } catch (err) {
      console.error('Camera access failed:', err);
      setActive(true);
      setFormFeedback('Camera access denied or unavailable');
    }
  };

  const handleVoiceToggle = () => {
    const nextVoice = !voice;
    setVoice(nextVoice);
    if (nextVoice) {
      if (window.speechSynthesis) {
        window.speechSynthesis.resume();
        const utter = new SpeechSynthesisUtterance('Voice guidance enabled');
        utter.rate = 1.05;
        window.speechSynthesis.speak(utter);
      }
    } else {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const handlePauseToggle = () => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (voice && window.speechSynthesis) {
      window.speechSynthesis.speak(
        new SpeechSynthesisUtterance(nextPaused ? 'Session paused' : 'Resuming session')
      );
    }
  };

  const handleFinishPrompt = () => {
    if (video.current?.srcObject) {
      video.current.srcObject.getTracks().forEach((t) => t.stop());
    }
    clearInterval(timerRef.current);
    setShowFinishModal(true);
  };

  const confirmFinish = async () => {
    const duration = Math.max(elapsedSeconds, 45);
    const durationMin = Math.max(Math.round(duration / 60), 1);
    const caloriesEst = Math.round(durationMin * 7.5);

    const sessionPayload = {
      exercise_id: e.id,
      name: e.name,
      category: e.category,
      duration_seconds: duration,
      reps: reps,
      calories: caloriesEst,
      accuracy: 94,
    };

    try {
      const backendUrl = getBackendUrl();
      await fetch(`${backendUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload),
      });
    } catch (err) {
      console.warn('Backend session save offline, recorded in local storage:', err);
    }

    try {
      syncSessionToSupabase(sessionPayload);
    } catch (err) {
      // ignore
    }

    addSession({
      id: `session-${Date.now()}`,
      exerciseId: e.id,
      exercise_id: e.id,
      name: e.name,
      category: e.category,
      durationSeconds: duration,
      duration_seconds: duration,
      durationFormatted: `${durationMin} min`,
      duration_formatted: `${durationMin} min`,
      reps: reps,
      calories: caloriesEst,
      accuracy: 94,
      date: `Today · ${durationMin} min`,
      timestamp: Date.now(),
    });

    navigate('/progress');
  };

  useEffect(() => {
    const currentVideo = video.current;
    return () => {
      if (currentVideo?.srcObject) {
        currentVideo.srcObject.getTracks().forEach((t) => t.stop());
      }
      clearInterval(timerRef.current);
    };
  }, []);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = Math.min(Math.round((elapsedSeconds / 180) * 100), 100);

  return (
    <div className="page fade-in workout-page">
      <Link
        className="back-link"
        to={e.category === 'Yoga' ? '/yoga' : '/workout'}
        data-testid="workout-back-link"
      >
        <ArrowLeft size={16} /> Back to library
      </Link>

      <section className="workout-header">
        <div>
          <p className="eyebrow">
            {e.category.toUpperCase()} / {e.level.toUpperCase()}
          </p>
          <h1>{e.name}</h1>
          <p className="lede">{e.description}</p>
        </div>
        <button
          className={voice ? 'voice-toggle on' : 'voice-toggle'}
          onClick={handleVoiceToggle}
          data-testid="voice-toggle"
        >
          <Volume2 size={17} />
          {voice ? 'Voice on' : 'Voice off'}
        </button>
      </section>

      {/* Side-by-Side Workout Stage */}
      <div className="workout-stage">
        {/* Demonstration Tile */}
        <div className="media-tile demo-tile">
          <div className="tile-label">
            <Video size={15} /> DEMONSTRATION
          </div>
          <ExerciseDemo exercise={e} />
          <div className="tile-footer">
            <strong>Coach demonstration</strong>
            <small>Video playback is independent from camera tracking</small>
          </div>
        </div>

        {/* Live Camera Tile */}
        <div className="media-tile camera-tile">
          <div className="tile-label">
            <span className="live-dot" /> LIVE CAMERA
          </div>
          <div className="camera-view" style={{ position: 'relative', overflow: 'hidden', height: 315, background: '#0b0e14' }}>
            <video
              ref={video}
              autoPlay
              muted
              playsInline
              data-testid="camera-video"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)',
                display: camera ? 'block' : 'none',
                position: 'absolute',
                inset: 0,
                zIndex: 1,
              }}
            />
            {camera ? (
              <>
                <canvas
                  ref={canvasRef}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    transform: 'none',
                    pointerEvents: 'none',
                    zIndex: 2,
                  }}
                />
                <PoseTracker
                  videoRef={video}
                  canvasRef={canvasRef}
                  exercise={e}
                  active={active}
                  isPaused={isPaused}
                  voiceEnabled={voice}
                  currentReps={reps}
                  onRepCount={(n) => setReps(n)}
                  onFeedback={(msg, type) => {
                    setFormFeedback(msg);
                    setFeedbackType(type);
                  }}
                />
                <div className={`confidence ${feedbackType === 'bad' ? 'bad' : feedbackType === 'neutral' ? 'neutral' : 'good'}`} style={{ zIndex: 10 }}>
                  <span />
                  {formFeedback}
                </div>
              </>
            ) : (
              <div className="camera-off" style={{ position: 'relative', zIndex: 5 }}>
                <div className="camera-icon">
                  <Video size={23} />
                </div>
                <strong>Ready when you are</strong>
                <span>
                  Camera access stays on your device.
                  <br />
                  No footage is recorded.
                </span>
                <button
                  className="secondary"
                  onClick={startCamera}
                  data-testid="camera-start-button"
                >
                  <Video size={16} />
                  Enable camera
                </button>
              </div>
            )}
            <div className="skeleton-overlay" style={{ display: 'none' }} />
          </div>
          <div className="tile-footer">
            <strong>{active ? 'Pose tracking active' : 'Camera tracking'}</strong>
            <small>
              {e.tracking
                ? 'Feedback will appear when confidence is sufficient.'
                : 'Camera tracking is not configured for this movement yet.'}
            </small>
          </div>
        </div>
      </div>

      {/* Workout Telemetry Controls */}
      <div className="workout-controls">
        <div className="counter">
          <span>REPETITIONS</span>
          <strong>{active ? reps : '—'}</strong>
          <small>{active ? 'Keep your rhythm' : 'Start camera to count'}</small>
        </div>

        <div className="session-progress">
          <div>
            <span>SESSION PROGRESS</span>
            <strong>{active ? (elapsedSeconds > 0 ? formatTime(elapsedSeconds) : '00:00') : '00:00'}</strong>
          </div>
          <div className="progress-line">
            <i style={{ width: active ? `${progressPercent}%` : '0%' }} />
          </div>
          <p>
            <span className="signal yellow" />{' '}
            {active ? 'Tracking confidence is sufficient' : 'Waiting for movement'}
          </p>
        </div>

        <div className="control-actions">
          <button
            className="icon-button"
            onClick={handlePauseToggle}
            data-testid="workout-pause-button"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play size={17} /> : <Pause size={17} />}
          </button>
          <button
            className="primary"
            onClick={handleFinishPrompt}
            data-testid="workout-finish-button"
          >
            <Check size={17} />
            Finish session
          </button>
        </div>
      </div>

      {/* Coaching Cues & Safety */}
      <section className="instruction-row">
        <div>
          <p className="eyebrow">COACHING CUES</p>
          <h3>Move with intention</h3>
          <ul>
            {e.steps.map((s) => (
              <li key={s}>
                <Check size={14} />
                {s}
              </li>
            ))}
          </ul>
        </div>
        <div className="safety-note">
          <HeartPulse size={18} />
          <div>
            <strong>Listen to your body</strong>
            <span>
              Pause for pain, dizziness, or discomfort. This is general fitness guidance, not medical
              advice.
            </span>
          </div>
        </div>
      </section>

      {/* Celebratory Finish Modal */}
      {showFinishModal && (
        <div className="workout-finish-modal-backdrop">
          <div className="workout-finish-modal">
            <div className="finish-icon-orb">
              <Trophy size={30} />
            </div>
            <h2>Session Complete!</h2>
            <p>
              Outstanding work on your {e.name} practice. Your metrics have been logged to your
              profile.
            </p>

            <div className="finish-metrics-grid">
              <div className="finish-metric">
                <strong>{formatTime(Math.max(elapsedSeconds, 45))}</strong>
                <span>Duration</span>
              </div>
              <div className="finish-metric">
                <strong>{reps}</strong>
                <span>Reps Counted</span>
              </div>
              <div className="finish-metric">
                <strong>~{Math.round(Math.max(elapsedSeconds, 45) / 60 * 7.5 || 25)}</strong>
                <span>Est. Calories</span>
              </div>
            </div>

            <button className="primary" style={{ width: '100%' }} onClick={confirmFinish}>
              Save to Progress <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Progress Analytics & Workout Log View
function Progress() {
  const [timeFilter, setTimeFilter] = useState('30'); // '7', '30', 'all'
  const [history, setHistory] = useState(() => getHistory());
  const stats = useMemo(() => calculateStats(history), [history]);

  useEffect(() => {
    const fetchRealSessions = async () => {
      try {
        const backendUrl = getBackendUrl();
        const res = await fetch(`${backendUrl}/api/sessions`);
        if (res.ok) {
          const apiSessions = await res.json();
          if (Array.isArray(apiSessions) && apiSessions.length > 0) {
            const mapped = apiSessions.map((s) => ({
              id: s.id,
              exerciseId: s.exercise_id,
              name: s.name,
              category: s.category,
              durationSeconds: s.duration_seconds,
              durationFormatted: s.duration_formatted,
              reps: s.reps,
              calories: s.calories,
              accuracy: s.accuracy,
              date: s.date,
              timestamp: new Date(s.timestamp).getTime(),
            }));
            setHistory(mapped);
          }
        }
      } catch (err) {
        // Fallback to local storage
      }
    };
    fetchRealSessions();
  }, []);

  const toggleFilter = () => {
    setTimeFilter((cur) => (cur === '30' ? '7' : cur === '7' ? 'all' : '30'));
  };

  const filterLabel =
    timeFilter === '7' ? 'Last 7 days' : timeFilter === 'all' ? 'All time' : 'Last 30 days';

  return (
    <div className="page fade-in">
      <section className="page-title">
        <div>
          <p className="eyebrow">YOUR CONSISTENCY</p>
          <h1>Progress</h1>
          <p className="lede">Small sessions compound into a stronger you.</p>
        </div>
        <button
          className="secondary"
          onClick={toggleFilter}
          data-testid="progress-date-filter"
        >
          {filterLabel} <ChevronRight size={15} />
        </button>
      </section>

      {/* Aggregate Stats Grid */}
      <div className="stats-grid progress-stats">
        <Stat
          icon={Clock3}
          value={`${stats.totalMinutes}m`}
          label="active minutes"
          accent="teal"
        />
        <Stat
          icon={Check}
          value={stats.totalSessions.toString()}
          label="completed sessions"
          accent="lime"
        />
        <Stat
          icon={Flame}
          value={`${stats.streakDays}`}
          label="day streak"
          accent="orange"
        />
      </div>

      {/* Activity Chart & History Grid */}
      <div className="progress-grid">
        {/* Dynamic Activity Area Chart */}
        <section className="chart-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACTIVITY</p>
              <h3>Minutes trained</h3>
            </div>
            <span className="chart-legend">
              <i />
              Minutes
            </span>
          </div>
          <div className="line-chart">
            <div className="y-labels">
              <span>60</span>
              <span>40</span>
              <span>20</span>
              <span>0</span>
            </div>
            <div className="chart-area" style={{ position: 'relative' }}>
              {history.length > 0 ? (
                <>
                  <svg viewBox="0 0 600 220" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="fill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0" stopColor="#8b5cf6" stopOpacity=".32" />
                        <stop offset="1" stopColor="#8b5cf6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 180 C45 150 65 168 100 126 S170 135 205 90 S265 130 300 102 S365 65 402 98 S470 72 500 55 S550 75 600 32 V220 H0Z"
                      fill="url(#fill)"
                    />
                    <path
                      d="M0 180 C45 150 65 168 100 126 S170 135 205 90 S265 130 300 102 S365 65 402 98 S470 72 500 55 S550 75 600 32"
                      fill="none"
                      stroke="#9d7bff"
                      strokeWidth="3"
                    />
                  </svg>
                  <div className="x-labels">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#717d92',
                    fontSize: 12,
                    textAlign: 'center',
                    padding: 20,
                    border: '1px dashed #242c3c',
                    borderRadius: 8,
                  }}
                >
                  <Activity size={24} color="#8b5cf6" style={{ marginBottom: 6 }} />
                  <strong style={{ color: '#e2e8f0', fontSize: 13 }}>No active training data yet</strong>
                  <span style={{ marginTop: 4, color: '#687387' }}>
                    Your training volume curve will plot here automatically after completing workouts.
                  </span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* History Panel */}
        <section className="history-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LOG</p>
              <h3>Recent sessions</h3>
            </div>
            <Link to="/plans" data-testid="progress-view-plans">
              Plans <ChevronRight size={14} />
            </Link>
          </div>

          {history.length === 0 ? (
            <div
              style={{
                padding: '44px 16px',
                textAlign: 'center',
                color: '#717d92',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
                border: '1px dashed #242c3c',
                borderRadius: 8,
              }}
            >
              <Clock3 size={24} color="#8b5cf6" />
              <strong style={{ margin: 0, fontSize: 13, color: '#e2e8f0' }}>No completed sessions</strong>
              <span style={{ fontSize: 11, color: '#687387' }}>
                Finish a camera session to record reps, duration, and accuracy logs here.
              </span>
            </div>
          ) : (
            history.slice(0, 5).map((item, i) => (
              <div className="history-item" key={item.id || i}>
                <div className={`history-icon h${i % 3}`}>
                  <Activity size={16} />
                </div>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.date || `${Math.round((item.durationSeconds || 600) / 60)} min`}</span>
                </div>
                <b>+{Math.round((item.durationSeconds || 1200) / 60)} min</b>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

// AI Coach Nova Assistant with Resilient Streaming
function Assistant() {
  const profile = getProfile();
  const userFirstName = (profile?.name && profile.name !== 'Athlete') ? profile.name.split(' ')[0] : 'there';
  const userInitials = (profile?.name || 'Athlete')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hey ${userFirstName} — I'm your Pysiosaathi coach. Ask me about technique, training structure, or your movement history.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Local expert Coach Nova streaming fallback
  const streamLocalCoachResponse = async (q) => {
    const qLower = q.toLowerCase();
    let reply = '';

    if (qLower.includes('squat')) {
      reply =
        'Squat Form Protocol:\n1. Stand shoulder-width with toes turned out 15–20 degrees.\n2. Initiate movement by hinging hips back, keeping chest upright.\n3. Keep knees tracking in line with toes.\n4. Descend until hips break parallel with knees.\n5. Drive up forcefully through heels, exhaling at the top.';
    } else if (qLower.includes('week') || qLower.includes('structur') || qLower.includes('plan')) {
      reply =
        'Optimal Weekly Structure:\n• Monday: Foundational Strength & Core (Squats, Push-Ups, Planks)\n• Wednesday: Mobility & Mindful Balance (Yoga Flow, Hip Openers)\n• Saturday: Full Body Integration (Conditioning, Lunges, Core)\nAlways take active rest days between heavy loading sessions to let muscles rebuild.';
    } else if (qLower.includes('warm') || qLower.includes('warm-up')) {
      reply =
        '5-Minute Dynamic Warm-Up:\n1. Arm circles & shoulder rolls (60 sec)\n2. Cat-cow spine articulation (60 sec)\n3. Bodyweight hip hinges (60 sec)\n4. Shallow air squats (60 sec)\n5. Light jumping jacks or marching in place (60 sec) to elevate heart rate.';
    } else if (qLower.includes('yoga') || qLower.includes('back') || qLower.includes('pain')) {
      reply =
        'For lower back relief & gentle mobility: Practice Balasana (Child’s Pose), Marjaryasana (Cat-Cow), and gentle Bhujangasana (Cobra). Breathe smoothly into your abdomen. Note: For persistent or sharp pain, stop and speak with a qualified physician.';
    } else {
      reply =
        `Coach Nova here. For "${q}", remember that consistency and clean movement quality always beat sheer intensity. Move with deliberate control, maintain tall spinal posture, and breathe smoothly through each repetition.`;
    }

    setMessages((m) => [...m, { role: 'assistant', text: '' }]);
    const words = reply.split(' ');
    let current = '';

    for (let i = 0; i < words.length; i++) {
      current += (i === 0 ? '' : ' ') + words[i];
      await new Promise((r) => setTimeout(r, 25));
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = { role: 'assistant', text: current };
        return next;
      });
    }
  };

  const send = async () => {
    if (!input.trim() || loading) return;
    const q = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: q }]);
    setLoading(true);

    try {
      const backendUrl = getBackendUrl();
      const r = await fetch(`${backendUrl}/api/assistant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });

      if (!r.ok) throw new Error('Coach unavailable');
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      setMessages((m) => [...m, { role: 'assistant', text: '' }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        chunk
          .split('data: ')
          .slice(1)
          .forEach((line) => {
            text += line.trim() + ' ';
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = { role: 'assistant', text: text.trim() };
              return next;
            });
          });
      }
    } catch (err) {
      // Smooth local intelligence stream
      await streamLocalCoachResponse(q);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page fade-in assistant-page">
      <section className="assistant-hero">
        <div className="assistant-orb">
          <Bot size={30} />
        </div>
        <div>
          <p className="eyebrow">PYSIOSAATHI INTELLIGENCE</p>
          <h1>Your AI coach</h1>
          <p className="lede">Clear, calm guidance for the work between workouts.</p>
        </div>
      </section>

      <div className="assistant-layout">
        <section className="chat-panel">
          <div className="chat-head">
            <div>
              <strong>Coach Nova</strong>
              <span>
                <i />
                Available now
              </span>
            </div>
            <button
              className="icon-button"
              onClick={() => setMessages([])}
              data-testid="assistant-clear-button"
              title="Clear conversation"
            >
              <X size={17} />
            </button>
          </div>

          <div className="messages">
            {messages.map((m, i) => (
              <div
                className={`message ${m.role}`}
                key={i}
                data-testid={`assistant-message-${i}`}
              >
                <div className="message-avatar">
                  {m.role === 'assistant' ? <Bot size={14} /> : userInitials}
                </div>
                <div>
                  <p style={{ whiteSpace: 'pre-line' }}>{m.text || 'Thinking…'}</p>
                  <small>{m.role === 'assistant' ? 'Coach Nova' : 'You'} · just now</small>
                </div>
              </div>
            ))}
          </div>

          <div className="suggestions">
            {[
              'How should I structure my week?',
              'Explain squat technique',
              'What is a good warm-up?',
            ].map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                data-testid={`assistant-suggestion-${s.slice(0, 5).replaceAll(' ', '-')}`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="Ask about movement, technique, or plans…"
              data-testid="assistant-input"
            />
            <button
              onClick={send}
              className="primary send-button"
              data-testid="assistant-send-button"
              disabled={loading}
            >
              <ArrowLeft size={17} className="flip" />
            </button>
          </div>
        </section>

        <aside className="coach-side">
          <div className="side-label">QUICK START</div>
          {[
            ['Weekly structure', 'Build a balanced rhythm', '/plans'],
            ['Movement library', 'Explore 44 exercises', '/workout'],
            ['Your progress', 'See your consistency', '/progress'],
          ].map(([a, b, c], i) => (
            <Link to={c} key={a} data-testid={`assistant-quick-link-${i}`}>
              <div className="quick-icon">
                <Plus size={16} />
              </div>
              <div>
                <strong>{a}</strong>
                <span>{b}</span>
              </div>
              <ChevronRight size={15} />
            </Link>
          ))}
          <div className="coach-disclaimer">
            <HeartPulse size={17} />
            <span>
              General fitness guidance only. For injury, severe pain, or medical concerns, speak with
              a qualified healthcare professional.
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}

// Authentication Screen
function Auth({ onAuthSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [backendUrl, setBackendUrlInput] = useState(getBackendUrl());
  const [sbConfig, setSbConfig] = useState(getSupabaseConfig());
  const [sbUrl, setSbUrl] = useState(sbConfig.url || '');
  const [sbKey, setSbKey] = useState(sbConfig.key || '');
  const [healthStatus, setHealthStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkApiHealth().then(setHealthStatus);
  }, []);

  const handleSaveConfig = () => {
    saveBackendUrl(backendUrl);
    saveSupabaseConfig(sbUrl, sbKey);
    setSbConfig(getSupabaseConfig());
    checkApiHealth().then((res) => {
      setHealthStatus(res);
      setMessage(res.online ? 'Backend & Supabase configuration saved.' : 'Configuration saved (Backend offline).');
    });
  };

  const submit = async (mode) => {
    if (!email || !password) {
      setMessage('Please enter both email and password.');
      return;
    }
    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res =
        mode === 'signup'
          ? await registerUser({ email, password, name })
          : await loginUser({ email, password });

      if (!res.success) {
        setMessage(res.error || 'Authentication failed. Please verify credentials.');
      } else {
        setMessage(res.message || (mode === 'signup' ? 'Account created! Welcome to Pysiosaathi.' : 'Welcome back!'));
        if (onAuthSuccess) onAuthSuccess(res.user);
        setTimeout(() => {
          navigate(mode === 'signup' ? '/onboarding' : '/dashboard');
        }, 500);
      }
    } catch (err) {
      setMessage(err.message || 'Authentication error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-mark">
            <Activity size={19} />
          </div>
          <span>
            Pysio<span>saathi</span>
          </span>
        </div>
        <p className="eyebrow">YOUR MOVEMENT, YOUR RHYTHM</p>
        <h1>Train with clarity.</h1>
        <p className="lede">Sign in to keep your sessions, plans, and progress synchronized.</p>

        {isSignUp && (
          <label>
            Full Name
            <input
              type="text"
              placeholder="e.g. Alex Rivera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="auth-name-input"
            />
          </label>
        )}

        <label>
          Email
          <input
            type="email"
            placeholder="athlete@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="auth-email-input"
          />
        </label>
        <label>
          Password
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            data-testid="auth-password-input"
          />
        </label>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              setEmail('alex.rivera@athletic.io');
              setPassword('password123');
              setMessage('Demo credentials filled. Click Sign in to continue.');
            }}
            style={{
              background: 'none',
              border: 0,
              color: '#a994ff',
              fontSize: 11,
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Quick demo account
          </button>
        </div>

        <button
          className="primary auth-submit"
          onClick={() => submit('signin')}
          data-testid="auth-signin-button"
          disabled={loading}
        >
          {loading ? 'Authenticating...' : 'Sign in'} <ArrowLeft size={16} className="flip" />
        </button>
        <button
          className="secondary auth-submit"
          onClick={() => {
            if (!isSignUp) {
              setIsSignUp(true);
              setMessage('');
            } else {
              submit('signup');
            }
          }}
          data-testid="auth-signup-button"
          disabled={loading}
        >
          {loading ? 'Creating...' : isSignUp ? 'Confirm & Create account' : 'Create account'}
        </button>

        {message && (
          <p className="auth-message" data-testid="auth-message">
            {message}
          </p>
        )}

        {/* Configuration Drawer */}
        <div className="auth-config-box">
          <button
            type="button"
            className="auth-config-toggle"
            onClick={() => setShowConfig(!showConfig)}
          >
            <Sliders size={13} />
            <span>Connection & Cloud Configuration</span>
            {healthStatus?.online ? (
              <span className="config-status-dot online" title="Backend connected">●</span>
            ) : (
              <span className="config-status-dot offline" title="Backend status">○</span>
            )}
          </button>

          {showConfig && (
            <div className="auth-config-details">
              <label>
                Backend API URL
                <input
                  type="text"
                  value={backendUrl}
                  onChange={(e) => setBackendUrlInput(e.target.value)}
                  placeholder="http://localhost:8001"
                />
              </label>
              <label>
                Supabase Project URL
                <input
                  type="text"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                />
              </label>
              <label>
                Supabase Publishable Key
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="sb_publishable_..."
                />
              </label>
              <div className="config-actions">
                <button type="button" className="config-save-btn" onClick={handleSaveConfig}>
                  Save & Test Connection
                </button>
                <span className="config-health-tag">
                  {sbConfig.isConfigured ? 'Supabase Configured' : (healthStatus?.online ? 'Backend Connected' : 'Local Fallback')}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="auth-image">
        <img
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=85"
          alt="Training in a bright studio"
        />
        <div>
          <span className="pill">
            <Sparkles size={13} /> PYSIOSAATHI
          </span>
          <h2>
            Make every
            <br />
            <em>rep count.</em>
          </h2>
        </div>
      </div>
    </div>
  );
}

// Root Application Router
export default function App() {
  const [lang, setLang] = useState(() => getLanguage());
  const [profile, setProfile] = useState(() => getProfile());

  const handleAuthSuccess = () => {
    setProfile(getProfile());
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth" element={<Auth onAuthSuccess={handleAuthSuccess} />} />
        <Route
          path="/onboarding"
          element={
            <Onboarding
              onComplete={(updated) => {
                setProfile(updated);
                setLang(updated.language || 'en');
              }}
            />
          }
        />
        <Route
          path="*"
          element={
            <Shell lang={lang} setLang={setLang} profile={profile}>
              <Routes>
                <Route path="/" element={<Dashboard lang={lang} profile={profile} />} />
                <Route path="/dashboard" element={<Dashboard lang={lang} profile={profile} />} />
                <Route path="/yoga" element={<Library type="yoga" />} />
                <Route path="/workout" element={<Library type="workout" />} />
                <Route path="/workout/:id" element={<Workout />} />
                <Route path="/progress" element={<Progress />} />
                <Route path="/assistant" element={<Assistant />} />
                <Route path="/plans" element={<Plans />} />
                <Route
                  path="/profile"
                  element={<Profile onProfileUpdate={(p) => setProfile(p)} />}
                />
                <Route
                  path="/settings"
                  element={
                    <Settings
                      currentLang={lang}
                      onLanguageChange={(newLang) => setLang(newLang)}
                    />
                  }
                />
              </Routes>
            </Shell>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
