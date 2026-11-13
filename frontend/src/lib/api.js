import { getBackendUrl, getAuthToken, setAuthSession, clearAuthSession } from './storage';
import { getSupabaseClient } from './supabase';

export async function checkApiHealth() {
  const backendUrl = getBackendUrl();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(`${backendUrl}/api/config`, { credentials: 'omit', signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { online: false, message: `Server returned ${res.status}` };
    }
    const data = await res.json();
    return { online: true, data };
  } catch (err) {
    return { online: false, error: err.message };
  }
}

export async function loginUser({ email, password }) {
  const supabase = getSupabaseClient();
  // If Supabase is configured, prioritize Supabase auth
  if (supabase) {
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error) {
        return { success: false, error: res.error.message };
      }
      const user = {
        id: res.data.user.id,
        email: res.data.user.email,
        name: res.data.user.user_metadata?.name || email.split('@')[0],
      };
      setAuthSession(user, res.data.session?.access_token || 'supabase-token');

      // Attempt to load user profile from Supabase if table exists
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) {
          const storedProfile = {
            name: profile.name || user.name,
            email: profile.email || user.email,
            age: profile.age ?? 25,
            height: profile.height ?? 172,
            weight: profile.weight ?? 68,
            targetWeight: profile.target_weight ?? 65,
            fitnessLevel: profile.fitness_level || 'Beginner',
            primaryGoal: profile.primary_goal || 'General Fitness & Mobility',
            weeklyGoalDays: profile.weekly_goal_days ?? 3,
            sessionLength: profile.session_length ?? 20,
            language: profile.language || 'en',
            onboarded: profile.onboarded ?? true,
          };
          localStorage.setItem('pysiosaathi_profile', JSON.stringify(storedProfile));
        }
      } catch (profileErr) {
        // Table may not be created yet, fallback gracefully
      }

      return { success: true, user, message: 'Signed in successfully via Supabase' };
    } catch (err) {
      console.warn('Supabase signin error, falling back to backend auth:', err);
    }
  }

  // Backend FastAPI auth
  const backendUrl = getBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Sign in failed. Check your credentials.' };
    }

    setAuthSession(data.user, data.token);
    return { success: true, user: data.user, token: data.token, message: data.message };
  } catch (err) {
    // If backend is unreachable, provide seamless client session fallback
    console.warn('Backend unavailable, activating local session fallback', err);
    const fallbackUser = {
      id: `local-${Date.now()}`,
      email,
      name: email.split('@')[0].replace('.', ' '),
    };
    setAuthSession(fallbackUser, `token-${Date.now()}`);
    return { success: true, user: fallbackUser, message: 'Signed in successfully (local session)' };
  }
}

export async function registerUser({ email, password, name }) {
  const supabase = getSupabaseClient();
  // If Supabase is configured, use Supabase sign up
  if (supabase) {
    try {
      const res = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name || email.split('@')[0] } },
      });
      if (res.error) {
        return { success: false, error: res.error.message };
      }
      const user = {
        id: res.data.user?.id || `user-${Date.now()}`,
        email: res.data.user?.email || email,
        name: name || email.split('@')[0],
      };
      setAuthSession(user, res.data.session?.access_token || 'supabase-token');

      // Create initial profile in Supabase if session exists
      try {
        if (res.data.user?.id) {
          await supabase.from('profiles').upsert({
            id: res.data.user.id,
            email,
            name: name || email.split('@')[0],
            fitness_level: 'Beginner',
            onboarded: false,
          });
        }
      } catch (profErr) {
        // Table might not exist yet
      }

      return {
        success: true,
        user,
        message: res.data.session
          ? 'Account created! Welcome to Pysiosaathi.'
          : 'Account created! Please check your email to confirm your account, then sign in.',
      };
    } catch (err) {
      console.warn('Supabase signup error, falling back to backend auth:', err);
    }
  }

  // Backend FastAPI auth
  const backendUrl = getBackendUrl();
  try {
    const res = await fetch(`${backendUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.detail || 'Registration failed.' };
    }

    setAuthSession(data.user, data.token);
    return { success: true, user: data.user, token: data.token, message: data.message };
  } catch (err) {
    console.warn('Backend unavailable, activating local registration fallback', err);
    const fallbackUser = {
      id: `local-${Date.now()}`,
      email,
      name: name || email.split('@')[0].replace('.', ' '),
    };
    setAuthSession(fallbackUser, `token-${Date.now()}`);
    return { success: true, user: fallbackUser, message: 'Account created successfully (local session)' };
  }
}

export function logoutUser() {
  clearAuthSession();
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      supabase.auth.signOut();
    } catch (e) {
      // ignore
    }
  }
}

export async function syncSessionToSupabase(session) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('workout_sessions').insert([{
      user_id: user.id,
      exercise_id: session.exercise_id || session.exerciseId,
      name: session.name,
      category: session.category,
      duration_seconds: session.duration_seconds || session.durationSeconds || 0,
      duration_formatted: session.duration_formatted || session.durationFormatted,
      reps: session.reps || 0,
      calories: session.calories || 0,
      accuracy: session.accuracy || 90,
      date: session.date || new Date().toISOString(),
    }]);
  } catch (err) {
    console.warn('Could not sync session to Supabase workout_sessions table:', err);
  }
}

export async function syncProfileToSupabase(profile) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('profiles').upsert({
      id: user.id,
      name: profile.name,
      email: profile.email || user.email,
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
    });
  } catch (err) {
    console.warn('Could not sync profile to Supabase profiles table:', err);
  }
}
