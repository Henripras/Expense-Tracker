import { createClient } from '@supabase/supabase-js';

// Default Supabase project credentials (can be configured via UI in localStorage)
const STORAGE_URL_KEY = 'et_supabase_url';
const STORAGE_ANON_KEY = 'et_supabase_anon_key';

let cachedClient = null;

export const getSupabaseConfig = () => {
  return {
    url: localStorage.getItem(STORAGE_URL_KEY) || '',
    anonKey: localStorage.getItem(STORAGE_ANON_KEY) || ''
  };
};

export const setSupabaseConfig = (url, anonKey) => {
  url = (url || '').trim().replace(/\/+$/, '');
  anonKey = (anonKey || '').trim();
  
  if (url) {
    localStorage.setItem(STORAGE_URL_KEY, url);
  } else {
    localStorage.removeItem(STORAGE_URL_KEY);
  }

  if (anonKey) {
    localStorage.setItem(STORAGE_ANON_KEY, anonKey);
  } else {
    localStorage.removeItem(STORAGE_ANON_KEY);
  }

  cachedClient = null; // Reset cached client
};

export const getSupabaseClient = () => {
  if (cachedClient) return cachedClient;

  const { url, anonKey } = getSupabaseConfig();
  if (!url || !anonKey) {
    return null;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    });
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
};
