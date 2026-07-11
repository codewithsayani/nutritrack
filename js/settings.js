/* ============================================================
   NutriTrack — Settings
   js/settings.js
   ============================================================ */
import { supabase, requireAuth, showToast } from './supabase.js';
import { signOut } from './auth.js';
import { updateChartsTheme } from './charts.js';

let currentUser = null;

export async function initSettings() {
  currentUser = await requireAuth();

  initSidebar();
  initThemeToggle();
  initNotificationToggles();
  initResetData();
  initLogout();
  loadSavedSettings();
}

/* ─────────────────────────────────────────
   Dark Mode
   ───────────────────────────────────────── */
function initThemeToggle() {
  const toggle = document.getElementById('dark-mode-toggle');
  if (!toggle) return;

  // Set initial state from localStorage
  const saved = localStorage.getItem('nt_theme') === 'dark';
  toggle.checked = saved;

  toggle.addEventListener('change', () => {
    const dark = toggle.checked;
    if (dark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('nt_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('nt_theme', 'light');
    }
    // Update any chart themes
    try { updateChartsTheme(); } catch (_) {}
    showToast(`${dark ? 'Dark' : 'Light'} mode enabled`);
  });
}

/* ─────────────────────────────────────────
   Notification Toggles
   ───────────────────────────────────────── */
function initNotificationToggles() {
  const keys = ['meal-reminders', 'water-reminders', 'weekly-report', 'goal-alerts'];

  keys.forEach(key => {
    const toggle = document.getElementById(key);
    if (!toggle) return;

    // Load saved state
    toggle.checked = localStorage.getItem(`nt_notif_${key}`) === 'true';

    toggle.addEventListener('change', () => {
      localStorage.setItem(`nt_notif_${key}`, toggle.checked);
      showToast(toggle.checked
        ? `${toggle.closest('.settings-item')?.querySelector('.settings-item-label')?.textContent} enabled`
        : 'Notification disabled');
    });
  });
}

/* ─────────────────────────────────────────
   Reset Data
   ───────────────────────────────────────── */
function initResetData() {
  const resetMealsBtn   = document.getElementById('reset-meals-btn');
  const resetWaterBtn   = document.getElementById('reset-water-btn');
  const resetWeightBtn  = document.getElementById('reset-weight-btn');
  const resetAllBtn     = document.getElementById('reset-all-btn');

  resetMealsBtn?.addEventListener('click', async () => {
    if (!confirm('Delete ALL your meal entries? This cannot be undone.')) return;
    await deleteTable('meals');
  });

  resetWaterBtn?.addEventListener('click', async () => {
    if (!confirm('Delete ALL your water logs? This cannot be undone.')) return;
    await deleteTable('water_logs');
  });

  resetWeightBtn?.addEventListener('click', async () => {
    if (!confirm('Delete ALL your weight logs? This cannot be undone.')) return;
    await deleteTable('weight_logs');
  });

  resetAllBtn?.addEventListener('click', async () => {
    const confirmed = confirm(
      '⚠️ Delete ALL your data (meals, water, weight)? This CANNOT be undone.'
    );
    if (!confirmed) return;
    const doubleConfirm = confirm('Are you absolutely sure? This will permanently delete everything.');
    if (!doubleConfirm) return;

    showToast('Deleting all data...', 'info');
    await Promise.all([
      deleteTable('meals'),
      deleteTable('water_logs'),
      deleteTable('weight_logs'),
    ]);
    showToast('All data deleted', 'warning');
  });
}

async function deleteTable(tableName) {
  const { error } = await supabase
    .from(tableName)
    .delete()
    .eq('user_id', currentUser.id);

  if (error) {
    showToast(`Failed to reset ${tableName}: ` + error.message, 'error');
  } else {
    showToast(`${capitalize(tableName.replace('_', ' '))} cleared`);
  }
}

/* ─────────────────────────────────────────
   Logout
   ───────────────────────────────────────── */
function initLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async () => {
      await signOut();
    });
  });
}

/* ─────────────────────────────────────────
   Load all settings
   ───────────────────────────────────────── */
function loadSavedSettings() {
  const theme = localStorage.getItem('nt_theme');
  if (theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}

/* ─────────────────────────────────────────
   Sidebar (shared)
   ───────────────────────────────────────── */
function initSidebar() {
  const sidebar    = document.getElementById('sidebar');
  const collapseBtn= document.getElementById('sidebar-collapse');
  const overlay    = document.getElementById('sidebar-overlay');
  const mobileMenu = document.getElementById('mobile-menu-toggle');
  const mainContent= document.getElementById('main-content');

  collapseBtn?.addEventListener('click', () => {
    sidebar?.classList.toggle('collapsed');
    mainContent?.classList.toggle('sidebar-collapsed');
    localStorage.setItem('nt_sidebar', sidebar?.classList.contains('collapsed') ? '1' : '0');
  });
  if (localStorage.getItem('nt_sidebar') === '1') {
    sidebar?.classList.add('collapsed');
    mainContent?.classList.add('sidebar-collapsed');
  }
  mobileMenu?.addEventListener('click', () => {
    sidebar?.classList.add('mobile-open');
    overlay?.classList.add('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('show');
  });

  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.nav-item').forEach(link => {
    if (link.getAttribute('href')?.split('/').pop() === currentPage) link.classList.add('active');
  });

  supabase.from('profiles').select('name, avatar_url').eq('id', currentUser.id).single()
    .then(({ data }) => {
      if (!data) return;
      const name = data.name || currentUser.email?.split('@')[0] || 'User';
      document.querySelectorAll('[data-profile-name]').forEach(el => el.textContent = name);
      document.querySelectorAll('[data-profile-initial]').forEach(el => el.textContent = name[0]?.toUpperCase());
      if (data.avatar_url) {
        document.querySelectorAll('[data-profile-avatar]').forEach(el => {
          el.innerHTML = `<img src="${data.avatar_url}" alt="${name}" loading="lazy">`;
        });
      } else {
        document.querySelectorAll('[data-profile-avatar]').forEach(el => {
          el.textContent = name[0]?.toUpperCase();
        });
      }
    });
}

function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}
