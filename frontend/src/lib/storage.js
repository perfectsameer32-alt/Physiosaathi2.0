import { getSupabaseClient } from './supabase';

const PROFILE_KEY = 'pysiosaathi_profile';
const HISTORY_KEY = 'pysiosaathi_history';
const PLAN_KEY = 'pysiosaathi_plan';
const SETTINGS_KEY = 'pysiosaathi_settings';
const LANG_KEY = 'pysiosaathi_lang';

export const defaultProfile = {
  name: 'Athlete',
  email: '',
  age: 26,
  height: 175,
  weight: 70,
  targetWeight: 68,
  fitnessLevel: 'Beginner',
  primaryGoal: 'General Movement & Posture',
  weeklyGoalDays: 3,
  sessionLength: 20,
  language: 'en',
  onboarded: false,
  joinedDate: 'November 2026',
};

export const defaultHistory = [];

export const defaultSettings = {
  voiceEnabled: true,
  speechRate: 1.0,
  repBeep: true,
  mirrorCamera: true,
  showSkeleton: true,
  showAngles: true,
  formTips: true,
};

export const defaultPlan = {
  activePlanId: 'baseline',
  completedDays: {},
};

export function getProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return defaultProfile;
    const parsed = JSON.parse(raw);
    // If the cached profile was the legacy seed "Alex Rivera" and user hasn't explicitly logged into it, purge it
    if (
      parsed.name === 'Alex Rivera' &&
      parsed.email === 'alex.rivera@athletic.io' &&
      !localStorage.getItem(AUTH_USER_KEY)
    ) {
      localStorage.removeItem(PROFILE_KEY);
      return defaultProfile;
    }
    return { ...defaultProfile, ...parsed };
  } catch (err) {
    return defaultProfile;
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error('Failed to save profile', err);
  }
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user?.id) {
          supabase.from('profiles').upsert({
            id: data.user.id,
            name: profile.name,
            email: profile.email || data.user.email,
            age: Number(profile.age) || 25,
            height: Number(profile.height) || 172,
            weight: Number(profile.weight) || 68,
            target_weight: Number(profile.targetWeight) || 65,
            fitness_level: profile.fitnessLevel || 'Beginner',
            primary_goal: profile.primaryGoal,
            weekly_goal_days: Number(profile.weeklyGoalDays) || 3,
            session_length: Number(profile.sessionLength) || 20,
            language: profile.language || 'en',
            onboarded: Boolean(profile.onboarded),
          }).then(() => {}).catch(() => {});
        }
      }).catch(() => {});
    }
  } catch (err) {
    // ignore
  }
}

export function getHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    // Automatically filter out any legacy dummy seed items
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const clean = parsed.filter((item) => !String(item.id || '').startsWith('seed-'));
      if (clean.length !== parsed.length) {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(clean));
      }
      return clean;
    }
    return [];
  } catch (err) {
    return [];
  }
}

export function addSession(session) {
  try {
    const history = getHistory();
    const updated = [session, ...history];
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.auth.getUser().then(({ data }) => {
          if (data?.user?.id) {
            supabase.from('workout_sessions').insert([{
              user_id: data.user.id,
              exercise_id: session.exerciseId || session.exercise_id,
              name: session.name,
              category: session.category,
              duration_seconds: session.durationSeconds || session.duration_seconds || 0,
              duration_formatted: session.durationFormatted,
              reps: session.reps || 0,
              calories: session.calories || 0,
              accuracy: session.accuracy || 90,
              date: session.date || new Date().toISOString(),
            }]).then(() => {}).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (err) {
      // ignore
    }

    return updated;
  } catch (err) {
    console.error('Failed to add session', err);
    return [session];
  }
}

export function clearHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
  } catch (err) {
    console.error('Failed to clear history', err);
  }
}

export function getSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch (err) {
    return defaultSettings;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Failed to save settings', err);
  }
}

export function getActivePlan() {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    return raw ? { ...defaultPlan, ...JSON.parse(raw) } : defaultPlan;
  } catch (err) {
    return defaultPlan;
  }
}

export function saveActivePlan(planData) {
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(planData));
  } catch (err) {
    console.error('Failed to save plan', err);
  }
}

export function getLanguage() {
  try {
    return localStorage.getItem(LANG_KEY) || 'en';
  } catch (err) {
    return 'en';
  }
}

export function saveLanguage(lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch (err) {
    console.error('Failed to save language', err);
  }
}

export function calculateStats(history = getHistory()) {
  const totalSessions = Array.isArray(history) ? history.length : 0;
  const totalMinutes = Math.round(
    history.reduce((sum, item) => sum + (item.durationSeconds || item.duration_seconds || 0) / 60, 0)
  );
  const totalCalories = history.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalReps = history.reduce((sum, item) => sum + (item.reps || 0), 0);
  const avgAccuracy =
    totalSessions > 0
      ? Math.round(history.reduce((sum, item) => sum + (item.accuracy || 0), 0) / totalSessions)
      : 0;

  // Real unique training days streak
  let streakDays = 0;
  if (totalSessions > 0) {
    const uniqueDays = new Set();
    history.forEach((h) => {
      const ts = h.timestamp || h.created_at || h.date;
      if (ts) {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          uniqueDays.add(d.toDateString());
        } else {
          uniqueDays.add(new Date().toDateString());
        }
      }
    });
    streakDays = Math.min(uniqueDays.size, 30);
  }

  return {
    totalMinutes,
    totalSessions,
    totalCalories,
    totalReps,
    avgAccuracy,
    streakDays,
  };
}

const AUTH_USER_KEY = 'pysiosaathi_auth_user';
const AUTH_TOKEN_KEY = 'pysiosaathi_auth_token';
const API_CONFIG_KEY = 'pysiosaathi_api_url';

export function getBackendUrl() {
  try {
    return localStorage.getItem(API_CONFIG_KEY) || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  } catch (e) {
    return process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  }
}

export function saveBackendUrl(url) {
  try {
    if (url && url.trim()) localStorage.setItem(API_CONFIG_KEY, url.trim().replace(/\/+$/, ''));
    else localStorage.removeItem(API_CONFIG_KEY);
  } catch (err) {
    console.error('Failed to save backend URL', err);
  }
}

export function getAuthUser() {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function getAuthToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch (e) {
    return null;
  }
}

export function setAuthSession(user, token) {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      // Sync into active profile
      const prof = getProfile();
      saveProfile({
        ...prof,
        name: user.name || prof.name || (user.email ? user.email.split('@')[0] : 'Athlete'),
        email: user.email || prof.email || '',
      });
    }
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    }
  } catch (err) {
    console.error('Failed to save auth session', err);
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch (err) {
    console.error('Failed to clear auth session', err);
  }
}

export function isAuthenticated() {
  return Boolean(getAuthUser() || getAuthToken());
}


