/* ============================================================
   NutriTrack — Supabase Client
   js/supabase.js

   ⚠️  REPLACE the two constants below with your project values:
   1. Go to https://app.supabase.com → your project → Settings → API
   2. Copy "Project URL" → SUPABASE_URL
   3. Copy "anon public" key → SUPABASE_ANON_KEY
   ============================================================ */

const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

// ── Supabase Client (loaded via CDN in every HTML page) ──────
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
    },
  }
);

/* ── Helper: get current user (throws if not logged in) ────── */
export async function requireUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    window.location.href = '/login.html';
    throw new Error('Not authenticated');
  }
  return session.user;
}

/* ── Helper: get current session silently ──────────────────── */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/* ── Helper: today's date string YYYY-MM-DD ────────────────── */
export function todayStr() {
  return new Date().toISOString().split('T')[0];
}

/* ── Helper: format date for display ───────────────────────── */
export function formatDate(dateStr) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

/* ── Helper: format time for display ───────────────────────── */
export function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

/* ── Toast Notification helper ─────────────────────────────── */
export function showToast(message, type = 'success') {
  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const container = document.getElementById('toast-container')
    || (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type] || icons.info}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Close">✕</button>
  `;

  const close = () => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  container.appendChild(toast);
  setTimeout(close, 4000);
}
