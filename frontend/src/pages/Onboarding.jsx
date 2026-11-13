import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Check,
  Dumbbell,
  Flame,
  Globe2,
  HeartPulse,
  Leaf,
  Scale,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { getProfile, saveProfile } from '../lib/storage';
import { languages } from '../data/i18n';

export function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const currentProfile = getProfile();

  const [step, setStep] = useState(1);
  const totalSteps = 5;

  const [goals, setGoals] = useState([
    'Flexibility & Mobility',
    'Strength & Muscle Tone',
  ]);
  const [level, setLevel] = useState('Intermediate');
  const [focus, setFocus] = useState('Hybrid Balanced Protocol');
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [duration, setDuration] = useState(25);
  const [name, setName] = useState(
    currentProfile.name && currentProfile.name !== 'Athlete' ? currentProfile.name : ''
  );
  const [age, setAge] = useState(currentProfile.age || 26);
  const [height, setHeight] = useState(currentProfile.height || 175);
  const [weight, setWeight] = useState(currentProfile.weight || 70);
  const [targetWeight, setTargetWeight] = useState(currentProfile.targetWeight || 68);
  const [language, setLanguage] = useState(currentProfile.language || 'en');

  const toggleGoal = (g) => {
    if (goals.includes(g)) {
      if (goals.length > 1) setGoals(goals.filter((x) => x !== g));
    } else {
      setGoals([...goals, g]);
    }
  };

  const calculateBMI = () => {
    const hM = (Number(height) || 175) / 100;
    const w = Number(weight) || 70;
    if (hM <= 0) return '22.0';
    return (w / (hM * hM)).toFixed(1);
  };

  const getBMICategory = (bmiVal) => {
    const num = Number(bmiVal);
    if (num < 18.5) return 'Underweight';
    if (num < 25) return 'Healthy Range';
    if (num < 30) return 'Overweight';
    return 'Obese Range';
  };

  const handleFinish = () => {
    const updated = {
      ...currentProfile,
      name: name.trim() || currentProfile.name || 'Athlete',
      age: Number(age) || currentProfile.age || 26,
      height: Number(height) || currentProfile.height || 175,
      weight: Number(weight) || currentProfile.weight || 70,
      targetWeight: Number(targetWeight) || currentProfile.targetWeight || 68,
      fitnessLevel: level,
      primaryGoal: goals.join(' & '),
      weeklyGoalDays: Number(daysPerWeek) || 4,
      sessionLength: Number(duration) || 25,
      language,
      onboarded: true,
    };
    saveProfile(updated);
    if (onComplete) onComplete(updated);
    navigate('/dashboard');
  };

  return (
    <div className="onboarding-page fade-in">
      <div className="onboarding-container">
        {/* Top Header */}
        <header className="onboarding-header">
          <div className="brand">
            <div className="brand-mark">
              <Activity size={19} />
            </div>
            <span>
              Pysio<span>saathi</span>
            </span>
          </div>
          <div className="onboarding-progress-track">
            <div className="onboarding-steps-count">
              Step <strong>{step}</strong> of {totalSteps}
            </div>
            <div className="onboarding-bar">
              <i style={{ width: `${(step / totalSteps) * 100}%` }} />
            </div>
          </div>
          <Link to="/dashboard" className="skip-link" data-testid="onboarding-skip-link">
            Skip to app
          </Link>
        </header>

        {/* Wizard Card Body */}
        <div className="onboarding-card">
          {step === 1 && (
            <div className="step-content fade-in">
              <span className="pill">
                <Target size={13} /> STEP 1 · GOALS
              </span>
              <h1>What brings you to Pysiosaathi?</h1>
              <p className="lede">
                Select the outcomes that matter most to your body and mind right now.
              </p>

              <div className="options-grid">
                {[
                  {
                    id: 'Flexibility & Mobility',
                    title: 'Flexibility & Mobility',
                    desc: 'Open tight hips, relieve spine stiffness, and regain free motion.',
                    icon: Leaf,
                  },
                  {
                    id: 'Strength & Muscle Tone',
                    title: 'Strength & Muscle Tone',
                    desc: 'Build functional pressing, squatting, and pulling endurance.',
                    icon: Dumbbell,
                  },
                  {
                    id: 'Fat Loss & Conditioning',
                    title: 'Fat Loss & Conditioning',
                    desc: 'High-energy bodyweight intervals to boost cardiovascular health.',
                    icon: Flame,
                  },
                  {
                    id: 'Posture & Core Stability',
                    title: 'Posture & Core Stability',
                    desc: 'Counter long desk hours with deep spine and abdominal stability.',
                    icon: HeartPulse,
                  },
                  {
                    id: 'Mindful Stress Relief',
                    title: 'Mindful Stress Relief',
                    desc: 'Calm the nervous system with breathwork and restorative poses.',
                    icon: Sparkles,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = goals.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleGoal(item.id)}
                      data-testid={`goal-option-${item.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    >
                      <div className="choice-icon">
                        <Icon size={20} />
                      </div>
                      <div className="choice-text">
                        <strong>{item.title}</strong>
                        <span>{item.desc}</span>
                      </div>
                      <div className={`checkbox-circle ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content fade-in">
              <span className="pill">
                <Zap size={13} /> STEP 2 · EXPERIENCE
              </span>
              <h1>What is your baseline fitness level?</h1>
              <p className="lede">
                We calibrate exercise reps, pose hold times, and coaching cue detail to your background.
              </p>

              <div className="options-grid">
                {[
                  {
                    id: 'Beginner',
                    title: 'Beginner',
                    subtitle: 'New to regular routines or returning after a break',
                    cues: 'Slower pacing, foundation alignment tips, and low-impact modifications.',
                  },
                  {
                    id: 'Intermediate',
                    title: 'Intermediate',
                    subtitle: 'Trains 2–3 times a week with good exercise familiarity',
                    cues: 'Balanced progressive overload, flow transitions, and form precision.',
                  },
                  {
                    id: 'Advanced',
                    title: 'Advanced / Athlete',
                    subtitle: 'High consistency, comfortable with intense holds & rep volume',
                    cues: 'Denser work sets, strict cadence rules, and advanced pose balance.',
                  },
                ].map((lvl) => {
                  const isSelected = level === lvl.id;
                  return (
                    <div
                      key={lvl.id}
                      className={`choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setLevel(lvl.id)}
                      data-testid={`level-option-${lvl.id.toLowerCase()}`}
                    >
                      <div className="choice-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <strong style={{ fontSize: 16 }}>{lvl.title}</strong>
                          {lvl.id === 'Intermediate' && (
                            <span className="rec-tag">Recommended</span>
                          )}
                        </div>
                        <span style={{ color: '#d1d5db', marginTop: 4 }}>{lvl.subtitle}</span>
                        <small style={{ color: '#8d96a9', marginTop: 6, display: 'block', fontSize: 11 }}>
                          {lvl.cues}
                        </small>
                      </div>
                      <div className={`checkbox-circle ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="step-content fade-in">
              <span className="pill">
                <Activity size={13} /> STEP 3 · TRAINING FOCUS
              </span>
              <h1>How do you want to train?</h1>
              <p className="lede">
                Choose the primary style for your daily recommendations and weekly rhythm.
              </p>

              <div className="options-grid">
                {[
                  {
                    id: 'Yoga Studio',
                    title: 'Yoga Studio First',
                    desc: 'Mindful vinyasa, restorative holds, breathing, and balance mastery.',
                    icon: Leaf,
                  },
                  {
                    id: 'Home Workout',
                    title: 'Bodyweight Conditioning',
                    desc: 'Calisthenics, squat volume, push-up ladders, and core stability.',
                    icon: Dumbbell,
                  },
                  {
                    id: 'Hybrid Balanced Protocol',
                    title: 'Hybrid Balanced Protocol',
                    desc: 'The best of both: strength on high-energy days, yoga flow on recovery days.',
                    icon: Sparkles,
                    recommended: true,
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = focus === item.id;
                  return (
                    <div
                      key={item.id}
                      className={`choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => setFocus(item.id)}
                    >
                      <div className="choice-icon">
                        <Icon size={20} />
                      </div>
                      <div className="choice-text">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong>{item.title}</strong>
                          {item.recommended && <span className="rec-tag">Recommended</span>}
                        </div>
                        <span>{item.desc}</span>
                      </div>
                      <div className={`checkbox-circle ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Check size={14} />}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="commitment-slider-group">
                <div className="slider-header">
                  <strong>Weekly Frequency: {daysPerWeek} days / week</strong>
                  <span>{daysPerWeek * duration} min / week</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="6"
                  value={daysPerWeek}
                  onChange={(e) => setDaysPerWeek(Number(e.target.value))}
                  className="custom-range"
                />
                <div className="range-ticks">
                  <span>2 days</span>
                  <span>3 days</span>
                  <span>4 days (Optimal)</span>
                  <span>5+ days</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="step-content fade-in">
              <span className="pill">
                <Scale size={13} /> STEP 4 · BIOMETRICS & PROFILE
              </span>
              <h1>Tell us about your physical profile</h1>
              <p className="lede">
                Used to compute accurate calorie burn estimates and tailor movement ergonomics.
              </p>

              <div className="form-fields-grid">
                <label className="field-group">
                  <span>Full Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    data-testid="onboarding-name-input"
                  />
                </label>

                <label className="field-group">
                  <span>Age</span>
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="26"
                  />
                </label>

                <label className="field-group">
                  <span>Height (cm)</span>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    placeholder="175"
                  />
                </label>

                <label className="field-group">
                  <span>Current Weight (kg)</span>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder="70"
                  />
                </label>

                <label className="field-group">
                  <span>Target Weight (kg)</span>
                  <input
                    type="number"
                    value={targetWeight}
                    onChange={(e) => setTargetWeight(e.target.value)}
                    placeholder="68"
                  />
                </label>

                <label className="field-group">
                  <span>Preferred Language</span>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="custom-select"
                  >
                    {languages.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.native} ({l.label})
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="bmi-preview-card">
                <div>
                  <small>CALCULATED BMI</small>
                  <strong>{calculateBMI()}</strong>
                </div>
                <div>
                  <span className="status-tag">{getBMICategory(calculateBMI())}</span>
                  <p>Targeting ~{Math.round(daysPerWeek * duration * 7.5)} kcal weekly burn</p>
                </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="step-content fade-in">
              <span className="pill">
                <Sparkles size={13} /> STEP 5 · YOUR PROGRAM IS READY
              </span>
              <h1>Welcome to Pysiosaathi, {name.trim() || 'Athlete'}</h1>
              <p className="lede">
                Here is the personalized movement protocol we synthesized for your goals.
              </p>

              <div className="summary-program-box">
                <div className="program-hero-bar">
                  <div>
                    <span className="badge-gold">TAILORED PROTOCOL</span>
                    <h3>{focus}</h3>
                    <p>Designed for {level} level · {daysPerWeek} sessions/week · {duration} min daily</p>
                  </div>
                  <div className="program-stat-pills">
                    <div>
                      <strong>{daysPerWeek}x</strong>
                      <span>per week</span>
                    </div>
                    <div>
                      <strong>~{daysPerWeek * 180}</strong>
                      <span>kcal/wk</span>
                    </div>
                  </div>
                </div>

                <div className="first-workout-preview">
                  <div className="fw-label">
                    <Sparkles size={14} color="#26d9c2" /> YOUR FIRST RECOMMENDED WORKOUT
                  </div>
                  <div className="fw-card">
                    <img
                      src="https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80"
                      alt="First workout"
                    />
                    <div>
                      <strong>Mobility & strength flow</strong>
                      <span>Yoga + Bodyweight Core · 24 min · Camera Ready</span>
                    </div>
                    <span className="ready-tag">Ready</span>
                  </div>
                </div>

                <div className="privacy-reassurance">
                  <HeartPulse size={16} />
                  <span>
                    Camera-based pose tracking stays 100% on your device. Video frames are never stored or transmitted to external servers.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Bar */}
          <div className="onboarding-footer">
            {step > 1 ? (
              <button
                className="secondary"
                onClick={() => setStep(step - 1)}
                data-testid="onboarding-prev-btn"
              >
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <button
                className="primary"
                onClick={() => setStep(step + 1)}
                data-testid="onboarding-next-btn"
              >
                Continue <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary"
                onClick={handleFinish}
                data-testid="onboarding-complete-button"
              >
                Start Training <Sparkles size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

