import { createClient } from '@supabase/supabase-js';

export function normalizeSupabaseUrl(url) {
  if (!url) return '';
  let cleaned = url.trim();
  // Strip trailing slash
  cleaned = cleaned.replace(/\/+$/, '');
  // Strip /rest/v1 if provided by user
  cleaned = cleaned.replace(/\/rest\/v1\/?$/, '');
  return cleaned;
}

export function getSupabaseConfig() {
  try {
    const customUrl = localStorage.getItem('pysiosaathi_supabase_url');
    const customKey = localStorage.getItem('pysiosaathi_supabase_key');
    const rawUrl = customUrl || process.env.REACT_APP_SUPABASE_URL || '';
    const key = (customKey || process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '').trim();
    const url = normalizeSupabaseUrl(rawUrl);
    return { url, key, isConfigured: Boolean(url && key) };
  } catch (err) {
    const rawUrl = process.env.REACT_APP_SUPABASE_URL || '';
    const key = (process.env.REACT_APP_SUPABASE_PUBLISHABLE_KEY || '').trim();
    const url = normalizeSupabaseUrl(rawUrl);
    return { url, key, isConfigured: Boolean(url && key) };
  }
}

let activeClient = null;
let activeUrl = null;
let activeKey = null;

export function getSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  if (url && key) {
    try {
      if (!activeClient || activeUrl !== url || activeKey !== key) {
        activeClient = createClient(url, key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        activeUrl = url;
        activeKey = key;
      }
      return activeClient;
    } catch (e) {
      console.warn('Could not initialize Supabase client:', e);
      return null;
    }
  }
  return null;
}

export function saveSupabaseConfig(url, key) {
  try {
    const cleanUrl = normalizeSupabaseUrl(url);
    if (cleanUrl) localStorage.setItem('pysiosaathi_supabase_url', cleanUrl);
    else localStorage.removeItem('pysiosaathi_supabase_url');

    if (key && key.trim()) localStorage.setItem('pysiosaathi_supabase_key', key.trim());
    else localStorage.removeItem('pysiosaathi_supabase_key');

    activeClient = null;
    activeUrl = null;
    activeKey = null;
  } catch (err) {
    console.error('Failed to save Supabase config', err);
  }
}

export async function testSupabaseConnection() {
  const client = getSupabaseClient();
  if (!client) {
    return { success: false, message: 'Supabase URL or Key is not configured.' };
  }
  try {
    const { data, error } = await client.auth.getSession();
    if (error) {
      return { success: false, message: error.message };
    }
    return { success: true, message: 'Successfully connected to Supabase!', data };
  } catch (err) {
    return { success: false, message: err.message || 'Connection failed' };
  }
}

// Proxy export so `supabase.auth...` or `supabase.from...` works dynamically even if config loads or updates
export const supabase = new Proxy({}, {
  get(target, prop) {
    const client = getSupabaseClient();
    if (!client) return undefined;
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export const authConfigured = true;
