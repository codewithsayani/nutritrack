/* ============================================================
   NutriTrack — Authentication Logic
   js/auth.js
   ============================================================ */
import { supabase, showToast } from './supabase.js';

/* ── Guard: redirect to dashboard if already logged in ─────── */
export async function redirectIfLoggedIn() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) window.location.href = '/dashboard.html';
}

/* ── Guard: redirect to login if NOT logged in ─────────────── */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) window.location.href = '/login.html';
  return session?.user;
}

/* ─────────────────────────────────────────
   SIGN UP
   ───────────────────────────────────────── */
export async function signUp({ name, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/dashboard.html`,
    },
  });

  if (error) throw error;

  // Profile is auto-created via DB trigger.
  // Update the name field immediately if possible.
  if (data.user && !data.user.identities?.length === 0) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      name,
    });
  }

  return data;
}

/* ─────────────────────────────────────────
   SIGN IN
   ───────────────────────────────────────── */
export async function signIn({ email, password, remember }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  if (remember) {
    localStorage.setItem('nt_remember', email);
  } else {
    localStorage.removeItem('nt_remember');
  }

  return data;
}

/* ─────────────────────────────────────────
   SIGN OUT
   ───────────────────────────────────────── */
export async function signOut() {
  await supabase.auth.signOut();
  localStorage.removeItem('nt_theme');
  window.location.href = '/login.html';
}

/* ─────────────────────────────────────────
   FORGOT PASSWORD
   ───────────────────────────────────────── */
export async function resetPassword(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/login.html?reset=true`,
  });
  if (error) throw error;
}

/* ─────────────────────────────────────────
   UPDATE PASSWORD (after reset link)
   ───────────────────────────────────────── */
export async function updatePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/* ─────────────────────────────────────────
   GOOGLE OAUTH (placeholder — enable in Supabase console)
   ───────────────────────────────────────── */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard.html`,
    },
  });
  if (error) throw error;
}

/* ─────────────────────────────────────────
   PASSWORD STRENGTH
   ───────────────────────────────────────── */
export function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8)  score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 1) return { level: 'weak',   label: 'Weak',   segments: 1 };
  if (score <= 2) return { level: 'fair',   label: 'Fair',   segments: 2 };
  if (score <= 3) return { level: 'good',   label: 'Good',   segments: 3 };
  return              { level: 'strong', label: 'Strong', segments: 4 };
}

/* ─────────────────────────────────────────
   LOGIN PAGE INIT
   ───────────────────────────────────────── */
export function initLoginPage() {
  redirectIfLoggedIn();

  const form       = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passInput  = document.getElementById('password');
  const rememberCb = document.getElementById('remember');
  const submitBtn  = document.getElementById('login-btn');
  const alertEl    = document.getElementById('auth-alert');

  // Pre-fill remembered email
  const remembered = localStorage.getItem('nt_remember');
  if (remembered && emailInput) {
    emailInput.value = remembered;
    if (rememberCb) rememberCb.checked = true;
  }

  // Password visibility toggle
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  });

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertEl);
    setLoading(submitBtn, true);

    try {
      await signIn({
        email:    emailInput.value.trim(),
        password: passInput.value,
        remember: rememberCb?.checked || false,
      });
      window.location.href = '/dashboard.html';
    } catch (err) {
      showAlert(alertEl, err.message || 'Login failed. Please try again.', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // Google Sign In
  document.getElementById('google-btn')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showAlert(alertEl, 'Google sign-in is not configured yet.', 'error');
    }
  });
}

/* ─────────────────────────────────────────
   SIGNUP PAGE INIT
   ───────────────────────────────────────── */
export function initSignupPage() {
  redirectIfLoggedIn();

  const form        = document.getElementById('signup-form');
  const nameInput   = document.getElementById('name');
  const emailInput  = document.getElementById('email');
  const passInput   = document.getElementById('password');
  const confirmPass = document.getElementById('confirm-password');
  const submitBtn   = document.getElementById('signup-btn');
  const alertEl     = document.getElementById('auth-alert');
  const strengthEl  = document.getElementById('password-strength');

  // Password strength meter
  passInput?.addEventListener('input', () => {
    const strength = getPasswordStrength(passInput.value);
    if (strengthEl) {
      const segments = strengthEl.querySelectorAll('.strength-segment');
      const label    = strengthEl.querySelector('.strength-label');
      segments.forEach((seg, i) => {
        seg.className = 'strength-segment';
        if (i < strength.segments) seg.classList.add(strength.level);
      });
      label.textContent  = strength.label;
      label.className    = `strength-label ${strength.level}`;
    }
  });

  // Password toggle
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🙈';
    });
  });

  const verifyCard = document.getElementById('verify-card');
  const formCard   = document.getElementById('form-card');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertEl);

    // Validate passwords match
    if (passInput.value !== confirmPass.value) {
      showAlert(alertEl, 'Passwords do not match.', 'error');
      return;
    }
    if (passInput.value.length < 6) {
      showAlert(alertEl, 'Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(submitBtn, true);
    try {
      const data = await signUp({
        name:     nameInput.value.trim(),
        email:    emailInput.value.trim(),
        password: passInput.value,
      });

      // Show verification notice
      if (data.user && !data.session) {
        if (formCard)   formCard.style.display   = 'none';
        if (verifyCard) verifyCard.style.display = 'block';
        const emailSpan = document.getElementById('verify-email');
        if (emailSpan) emailSpan.textContent = emailInput.value.trim();
      } else if (data.session) {
        window.location.href = '/dashboard.html';
      }
    } catch (err) {
      showAlert(alertEl, err.message || 'Signup failed. Please try again.', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  // Google Sign In
  document.getElementById('google-btn')?.addEventListener('click', async () => {
    try {
      await signInWithGoogle();
    } catch (err) {
      showAlert(alertEl, 'Google sign-in is not configured yet.', 'error');
    }
  });
}

/* ─────────────────────────────────────────
   FORGOT PASSWORD PAGE INIT
   ───────────────────────────────────────── */
export function initForgotPage() {
  const form      = document.getElementById('forgot-form');
  const emailInput= document.getElementById('email');
  const submitBtn = document.getElementById('forgot-btn');
  const alertEl   = document.getElementById('auth-alert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertEl);
    setLoading(submitBtn, true);

    try {
      await resetPassword(emailInput.value.trim());
      showAlert(alertEl, 'Password reset email sent! Check your inbox.', 'success');
      form.reset();
    } catch (err) {
      showAlert(alertEl, err.message || 'Failed to send reset email.', 'error');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

/* ─────────────────────────────────────────
   UI Helpers
   ───────────────────────────────────────── */
function setLoading(btn, loading) {
  if (!btn) return;
  btn.disabled = loading;
  btn.dataset.originalText = btn.dataset.originalText || btn.innerHTML;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Please wait...'
    : btn.dataset.originalText;
}

function showAlert(el, message, type = 'error') {
  if (!el) return;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  el.className = `auth-alert show ${type}`;
  el.innerHTML = `<span class="auth-alert-icon">${icons[type]}</span><span>${message}</span>`;
}

function clearAlert(el) {
  if (!el) return;
  el.className = 'auth-alert';
  el.innerHTML = '';
}
