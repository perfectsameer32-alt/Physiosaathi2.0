import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  Dumbbell,
  Leaf,
  Play,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';
import { workoutPlans } from '../data/plans';
import { getActivePlan, saveActivePlan } from '../lib/storage';

export function Plans() {
  const currentPlanState = getActivePlan();
  const [selectedPlanId, setSelectedPlanId] = useState(currentPlanState.activePlanId || 'baseline');
  const [completedDays, setCompletedDays] = useState(currentPlanState.completedDays || {});
  const [notice, setNotice] = useState('');

  const activePlan = workoutPlans.find((p) => p.id === selectedPlanId) || workoutPlans[0];

  const handleSelectPlan = (id) => {
    setSelectedPlanId(id);
    const updated = { activePlanId: id, completedDays };
    saveActivePlan(updated);
    setNotice(`Switched to ${workoutPlans.find((p) => p.id === id)?.title}`);
    setTimeout(() => setNotice(''), 3000);
  };

  const toggleDayCompletion = (dayId) => {
    const updated = { ...completedDays, [dayId]: !completedDays[dayId] };
    setCompletedDays(updated);
    saveActivePlan({ activePlanId: selectedPlanId, completedDays: updated });
  };

  const completedCount = activePlan.schedule.filter((d) => !d.isRest && completedDays[d.dayId]).length;
  const totalWorkoutDays = activePlan.schedule.filter((d) => !d.isRest).length;
  const adherencePercent = Math.round((completedCount / (totalWorkoutDays || 1)) * 100);

  return (
    <div className="page fade-in plans-page">
      <section className="page-title">
        <div>
          <p className="eyebrow">YOUR WEEK, DESIGNED</p>
          <h1>Workout plans</h1>
          <p className="lede">
            Structured routines to build progressive strength, mobility, and sustainable habits.
          </p>
        </div>
        {notice && (
          <span className="settings-saved-pill">
            <Check size={14} /> {notice}
          </span>
        )}
      </section>

      {/* Plan Selector Carousel/Tabs */}
      <div className="plan-selector-row">
        {workoutPlans.map((p) => {
          const isCurrent = p.id === selectedPlanId;
          return (
            <button
              key={p.id}
              className={`plan-tab-card ${isCurrent ? 'active' : ''}`}
              onClick={() => handleSelectPlan(p.id)}
              data-testid={`plan-tab-${p.id}`}
            >
              <div className="plan-tab-meta">
                <span className="plan-tab-level">{p.level}</span>
                <span className="plan-tab-duration">{p.durationWeeks} weeks · {p.daysPerWeek}d/wk</span>
              </div>
              <h4>{p.title}</h4>
              <p>{p.description.slice(0, 75)}…</p>
              {isCurrent && <span className="active-plan-badge"><Check size={12} /> Active Plan</span>}
            </button>
          );
        })}
      </div>

      {/* Featured Plan Hero (Preserves original class .plan-feature and data-testid="plan-start-button") */}
      <section className="plan-feature">
        <div>
          <span className="pill">
            <Sparkles size={13} /> RECOMMENDED
          </span>
          <h2>{activePlan.title}</h2>
          <p>{activePlan.description}</p>
          <button
            className="primary"
            onClick={() => handleSelectPlan(activePlan.id)}
            data-testid="plan-start-button"
          >
            <Play size={16} /> Start this plan
          </button>
        </div>

        <div className="plan-days">
          {activePlan.schedule.filter((d) => !d.isRest).slice(0, 3).map((d) => (
            <div key={d.dayId}>
              <span>{d.dayName.slice(0, 3)}</span>
              <strong>{d.focus.split(' ')[0]}</strong>
              <small>{d.durationMinutes} min</small>
            </div>
          ))}
        </div>
      </section>

      {/* Detailed Schedule Breakdown */}
      <section className="plan-schedule-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">WEEKLY BREAKDOWN</p>
            <h3>7-Day Schedule & Movements</h3>
          </div>
          <div className="plan-adherence-pill">
            <span>Weekly Adherence: <strong>{completedCount} / {totalWorkoutDays} done ({adherencePercent}%)</strong></span>
          </div>
        </div>

        <div className="schedule-cards-grid">
          {activePlan.schedule.map((day) => {
            const isDone = completedDays[day.dayId];
            return (
              <div
                key={day.dayId}
                className={`schedule-day-card ${day.isRest ? 'rest-day' : ''} ${isDone ? 'completed-day' : ''}`}
                data-testid={`plan-day-${day.dayId}`}
              >
                <div className="day-card-header">
                  <div>
                    <span className="day-pill">{day.dayName}</span>
                    <h4>{day.focus}</h4>
                  </div>
                  {!day.isRest && (
                    <button
                      className={`day-check-btn ${isDone ? 'checked' : ''}`}
                      onClick={() => toggleDayCompletion(day.dayId)}
                      title={isDone ? 'Mark as incomplete' : 'Mark as done'}
                    >
                      {isDone ? <Check size={14} /> : null}
                    </button>
                  )}
                </div>

                {!day.isRest ? (
                  <>
                    <div className="day-duration-tag">
                      <Clock3 size={13} /> {day.durationMinutes} minutes active
                    </div>

                    <div className="day-exercises-list">
                      {day.exercises.map((ex) => (
                        <Link
                          to={`/workout/${ex.id}`}
                          key={ex.id}
                          className="day-exercise-chip"
                          data-testid={`day-exercise-${ex.id}`}
                        >
                          <div>
                            <strong>{ex.name}</strong>
                            <small>{ex.detail}</small>
                          </div>
                          <ChevronRight size={14} />
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rest-day-message">
                    <span>Active recovery, hydration, gentle walking, and rest.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

