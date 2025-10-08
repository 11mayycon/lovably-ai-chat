import { createClient } from "@supabase/supabase-js";

// Build a robust browser client that prefers the Cloud-provided publishable key
// and falls back gracefully to anon key when needed. Avoid any hardcoded defaults.
const projectUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  (import.meta.env.VITE_SUPABASE_PROJECT_ID
    ? `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co`
    : undefined);

const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Prefer publishable key in the browser; fall back to anon key if not set.
const apiKey = publishableKey || anonKey;

if (!projectUrl || !apiKey) {
  // Throwing early helps surface misconfiguration clearly in UI toasts
  console.error("Supabase client misconfigured: missing URL or API key.", {
    projectUrlPresent: Boolean(projectUrl),
    publishableKeyPresent: Boolean(publishableKey),
    anonKeyPresent: Boolean(anonKey),
  });
}

export const supabasePublic = createClient(projectUrl as string, apiKey as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
