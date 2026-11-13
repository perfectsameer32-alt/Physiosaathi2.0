import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  Award,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Edit3,
  Flame,
  HeartPulse,
  LogOut,
  RefreshCw,
  Scale,
  Sparkles,
  Target,
  Trophy,
  UserCheck,
  Zap,
} from 'lucide-react';
import { getProfile, saveProfile, calculateStats } from '../lib/storage';
import { logoutUser } from '../lib/api';

export function Profile({ onProfileUpdate }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(getProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editAge, setEditAge] = useState(profile.age);
  const [editHeight, setEditHeight] = useState(profile.height);
  const [editWeight, setEditWeight] = useState(profile.weight);
  const [editTarget, setEditTarget] = useState(profile.targetWeight);
  const [editGoal, setEditGoal] = useState(profile.primaryGoal);

  const stats = calculateStats();

  const hM = profile.height / 100;
  const bmi = (profile.weight / (hM * hM)).toFixed(1);

  const handleSave = () => {
    const updated = {
      ...profile,
      name: editName,
      age: Number(editAge),
      height: Number(editHeight),
      weight: Number(editWeight),
      targetWeight: Number(editTarget),
      primaryGoal: editGoal,
    };
    saveProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    if (onProfileUpdate) onProfileUpdate(updated);
  };

  const badges = [
    {
      id: 'badge-1',
      title: 'First Flow',
      desc: 'Complete your first guided session',
      icon: Sparkles,
      unlocked: stats.totalSessions >= 1,
      progress: `${stats.totalSessions}/1`,
      color: '#8b5cf6',
    },
    {
      id: 'badge-2',
      title: '7-Day Streak',
      desc: '7 consecutive training days',
      icon: Flame,
      unlocked: stats.streakDays >= 7,
      progress: `${stats.streakDays}/7 days`,
      color: '#ffae5b',
    },
    {
      id: 'badge-3',
      title: 'Century Club',
      desc: 'Over 100 active training minutes',
      icon: Clock3,
      unlocked: stats.totalMinutes >= 100,
      progress: `${stats.totalMinutes}/100 min`,
      color: '#26d9c2',
    },
    {
      id: 'badge-4',
      title: 'Precision Form',
      desc: 'Achieve 90%+ pose accuracy in a session',
      icon: Target,
      unlocked: stats.totalSessions >= 1 && stats.avgAccuracy >= 90,
      progress: stats.totalSessions >= 1 ? `${stats.avgAccuracy}%` : '0/1',
      color: '#a8f368',
    },
    {
      id: 'badge-5',
      title: 'Squat Master',
      desc: 'Over 50 camera-tracked repetitions',
      icon: Dumbbell,
      unlocked: stats.totalReps >= 50,
      progress: `${stats.totalReps}/50 reps`,
      color: '#765ce3',
    },
    {
      id: 'badge-6',
      title: 'Zen Seeker',
      desc: 'Complete 10 restorative workout holds',
      icon: Trophy,
      unlocked: stats.totalSessions >= 10,
      progress: `${stats.totalSessions}/10`,
      color: '#64748b',
    },
  ];

  const initials = (profile.name || 'Athlete')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="page fade-in profile-page">
      {/* Page Title */}
      <section className="page-title">
        <div>
          <p className="eyebrow">ATHLETIC IDENTITY</p>
          <h1>Your profile</h1>
          <p className="lede">Your physical baseline, goals, and earned milestones.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="secondary"
            onClick={() => setIsEditing(!isEditing)}
            data-testid="profile-edit-btn"
          >
            <Edit3 size={15} /> {isEditing ? 'Cancel edit' : 'Edit profile'}
          </button>
          <Link to="/onboarding" className="secondary" data-testid="profile-retake-onboarding">
            <RefreshCw size={15} /> Retake onboarding
          </Link>
        </div>
      </section>

      {/* User Hero Banner */}
      <section className="profile-hero-card">
        <div className="profile-hero-main">
          <div className="profile-large-avatar">{initials}</div>
          <div className="profile-main-meta">
            <div className="profile-name-row">
              <h2>{profile.name}</h2>
              <span className="profile-level-badge">
                <UserCheck size={13} /> {profile.fitnessLevel}
              </span>
            </div>
            <p className="profile-email">{profile.email}</p>
            <span className="profile-member-date">
              Member since {profile.joinedDate} · Performance Program
            </span>
          </div>
        </div>

        <div className="profile-stats-ribbon">
          <div className="ribbon-item">
            <strong>{stats.totalSessions}</strong>
            <span>Completed Workouts</span>
          </div>
          <div className="ribbon-item">
            <strong>{(stats.totalMinutes / 60).toFixed(1)}h</strong>
            <span>Active Hours</span>
          </div>
          <div className="ribbon-item">
            <strong>{stats.totalCalories.toLocaleString()}</strong>
            <span>Est. Calories</span>
          </div>
          <div className="ribbon-item">
            <strong style={{ color: '#a8f368' }}>{stats.avgAccuracy}%</strong>
            <span>Pose Precision</span>
          </div>
        </div>
      </section>

      {/* Edit Form Modal/Dropdown when active */}
      {isEditing && (
        <section className="profile-edit-panel fade-in">
          <div className="section-heading">
            <div>
              <p className="eyebrow">UPDATE DETAILS</p>
              <h3>Edit your physical stats</h3>
            </div>
          </div>
          <div className="edit-grid">
            <label>
              <span>Full Name</span>
              <input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </label>
            <label>
              <span>Age</span>
              <input
                type="number"
                value={editAge}
                onChange={(e) => setEditAge(e.target.value)}
              />
            </label>
            <label>
              <span>Height (cm)</span>
              <input
                type="number"
                value={editHeight}
                onChange={(e) => setEditHeight(e.target.value)}
              />
            </label>
            <label>
              <span>Weight (kg)</span>
              <input
                type="number"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
              />
            </label>
            <label>
              <span>Target Weight (kg)</span>
              <input
                type="number"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
              />
            </label>
            <label>
              <span>Primary Goal</span>
              <input value={editGoal} onChange={(e) => setEditGoal(e.target.value)} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button className="primary" onClick={handleSave} data-testid="profile-save-btn">
              <Check size={16} /> Save Changes
            </button>
            <button className="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        </section>
      )}

      {/* Content Grid: Biometrics & Goals */}
      <div className="profile-content-grid">
        {/* Biometrics Card */}
        <section className="metric-box">
          <div className="section-heading">
            <div>
              <p className="eyebrow">BODY COMPOSITION</p>
              <h3>Biometrics & Index</h3>
            </div>
            <Scale size={18} color="#26d9c2" />
          </div>

          <div className="biometric-numbers">
            <div className="bio-col">
              <span className="bio-label">HEIGHT</span>
              <strong className="bio-val">{profile.height} cm</strong>
            </div>
            <div className="bio-col">
              <span className="bio-label">WEIGHT</span>
              <strong className="bio-val">{profile.weight} kg</strong>
            </div>
            <div className="bio-col">
              <span className="bio-label">TARGET</span>
              <strong className="bio-val">{profile.targetWeight} kg</strong>
            </div>
            <div className="bio-col">
              <span className="bio-label">BODY MASS INDEX</span>
              <strong className="bio-val" style={{ color: '#a8f368' }}>
                {bmi}
              </strong>
            </div>
          </div>

          <div className="bmi-meter-wrap">
            <div className="bmi-bar">
              <div
                className="bmi-pointer"
                style={{
                  left: `${Math.min(Math.max(((bmi - 16) / (32 - 16)) * 100, 5), 95)}%`,
                }}
              />
            </div>
            <div className="bmi-labels">
              <span>Under (&lt;18.5)</span>
              <span style={{ color: '#a8f368' }}>Normal (18.5–24.9)</span>
              <span>Over (25–29.9)</span>
            </div>
          </div>
        </section>

        {/* Goals & Commitment Card */}
        <section className="metric-box">
          <div className="section-heading">
            <div>
              <p className="eyebrow">TRAINING RHYTHM</p>
              <h3>Weekly Commitment</h3>
            </div>
            <Target size={18} color="#8b5cf6" />
          </div>

          <div className="goal-detail-list">
            <div className="goal-row">
              <div>
                <strong>Primary Goal</strong>
                <span>{profile.primaryGoal}</span>
              </div>
              <Sparkles size={16} color="#8b5cf6" />
            </div>

            <div className="goal-row">
              <div>
                <strong>Weekly Frequency</strong>
                <span>{profile.weeklyGoalDays} days per week</span>
              </div>
              <Activity size={16} color="#26d9c2" />
            </div>

            <div className="goal-row">
              <div>
                <strong>Average Session Target</strong>
                <span>{profile.sessionLength} minutes / workout</span>
              </div>
              <Clock3 size={16} color="#ffae5b" />
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <Link to="/plans" className="primary" style={{ width: '100%' }}>
              View Workout Plans <ChevronRight size={15} />
            </Link>
          </div>
        </section>
      </div>

      {/* Badges & Achievements Shelf */}
      <section className="badges-shelf-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">HONORS & ACHIEVEMENTS</p>
            <h3>Earned Badges</h3>
          </div>
          <Award size={18} color="#ffae5b" />
        </div>

        <div className="badges-grid">
          {badges.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.id}
                className={`badge-card ${b.unlocked ? 'unlocked' : 'locked'}`}
                data-testid={`badge-${b.id}`}
              >
                <div
                  className="badge-icon-wrap"
                  style={{
                    background: b.unlocked ? `${b.color}22` : '#181d28',
                    color: b.unlocked ? b.color : '#64748b',
                    borderColor: b.unlocked ? `${b.color}55` : '#28303f',
                  }}
                >
                  <Icon size={24} />
                </div>
                <strong>{b.title}</strong>
                <span>{b.desc}</span>
                {b.unlocked ? (
                  <span className="badge-status-tag unlocked">
                    <Check size={11} /> Unlocked
                  </span>
                ) : (
                  <span className="badge-status-tag locked">{b.progress}</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Bottom Actions */}
      <section className="profile-footer-actions">
        <button
          className="secondary"
          onClick={() => {
            logoutUser();
            navigate('/auth');
          }}
          data-testid="profile-signout-btn"
        >
          <LogOut size={16} /> Sign out of Pysiosaathi
        </button>
      </section>
    </div>
  );
}

