/* ============================================================
   NutriTrack — Water Tracker
   js/water.js
   ============================================================ */
import { supabase, requireAuth, todayStr, showToast } from './supabase.js';

const WATER_GOAL = 2500; // ml
let currentUser  = null;
let todayWater   = 0;
let todayLogs    = [];

export async function initWater() {
  currentUser = await requireAuth();

  const theme = localStorage.getItem('nt_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  initSidebar();
  await loadWater();
  initControls();
}

/* ─────────────────────────────────────────
   Load today's water
   ───────────────────────────────────────── */
async function loadWater() {
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', todayStr())
    .order('created_at', { ascending: false });

  todayLogs  = data || [];
  todayWater = todayLogs.reduce((s, l) => s + parseFloat(l.amount || 0), 0);

  renderWaterUI();
  renderWaterHistory();
}

/* ─────────────────────────────────────────
   Render Water UI
   ───────────────────────────────────────── */
function renderWaterUI() {
  const pct = Math.min(todayWater / WATER_GOAL, 1);

  // Amount text
  const amountEl = document.getElementById('water-amount');
  const pctEl    = document.getElementById('water-pct');
  const goalEl   = document.getElementById('water-goal');
  const remainEl = document.getElementById('water-remain');

  if (amountEl) amountEl.textContent = Math.round(todayWater);
  if (pctEl)    pctEl.textContent    = Math.round(pct * 100);
  if (goalEl)   goalEl.textContent   = WATER_GOAL;
  if (remainEl) remainEl.textContent = Math.max(0, WATER_GOAL - todayWater);

  // SVG ring
  updateRing('water-ring-fill', pct, 110);   // large ring
  updateRing('water-ring-fill-widget', pct, 54); // dashboard widget

  // Status message
  const statusEl = document.getElementById('water-status');
  if (statusEl) {
    if (pct >= 1)       statusEl.textContent = '🎉 Daily goal reached!';
    else if (pct >= 0.75) statusEl.textContent = '💪 Almost there!';
    else if (pct >= 0.5)  statusEl.textContent = '👍 Halfway there!';
    else                  statusEl.textContent = '💧 Keep drinking!';
  }

  // Wave fill (CSS-based)
  const fillEl = document.getElementById('water-fill');
  if (fillEl) fillEl.style.height = `${pct * 100}%`;
}

function updateRing(id, pct, radius) {
  const el = document.getElementById(id);
  if (!el) return;
  const circ = 2 * Math.PI * radius;
  el.style.strokeDasharray  = circ;
  el.style.strokeDashoffset = circ * (1 - pct);
}

/* ─────────────────────────────────────────
   Water Log History
   ───────────────────────────────────────── */
function renderWaterHistory() {
  const listEl = document.getElementById('water-log-list');
  if (!listEl) return;

  if (todayLogs.length === 0) {
    listEl.innerHTML = `
      <div class="empty-state" style="padding:var(--space-8) var(--space-4)">
        <div class="empty-icon">💧</div>
        <div class="empty-title">No logs yet</div>
        <p class="empty-desc">Start tracking your water intake!</p>
      </div>`;
    return;
  }

  listEl.innerHTML = todayLogs.map(log => {
    const time = new Date(log.created_at).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit',
    });
    return `
      <div class="water-log-item">
        <span>💧 ${Math.round(log.amount)} ml</span>
        <span class="water-log-time">${time}</span>
        <button class="water-log-delete" data-id="${log.id}" title="Remove">✕</button>
      </div>`;
  }).join('');

  listEl.querySelectorAll('.water-log-delete').forEach(btn => {
    btn.addEventListener('click', () => removeWaterLog(btn.dataset.id));
  });
}

/* ─────────────────────────────────────────
   Controls — Add / Remove buttons
   ───────────────────────────────────────── */
function initControls() {
  // Quick-add buttons (+250, +500, +750, +1000)
  document.querySelectorAll('[data-add-water]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const amount = parseInt(btn.dataset.addWater, 10);
      await addWater(amount);
    });
  });

  // Custom amount
  const customBtn   = document.getElementById('add-custom-water');
  const customInput = document.getElementById('custom-water-amount');
  customBtn?.addEventListener('click', async () => {
    const amount = parseFloat(customInput?.value);
    if (!amount || amount <= 0) { showToast('Enter a valid amount', 'warning'); return; }
    await addWater(amount);
    if (customInput) customInput.value = '';
  });

  // Goal display
  const goalDisplayEl = document.getElementById('water-goal-display');
  if (goalDisplayEl) goalDisplayEl.textContent = WATER_GOAL;
}

async function addWater(amount) {
  const { error } = await supabase.from('water_logs').insert({
    user_id: currentUser.id,
    amount,
    date: todayStr(),
  });

  if (error) {
    showToast('Failed to log water', 'error');
  } else {
    showToast(`+${amount}ml logged! 💧`);
    await loadWater();
  }
}

async function removeWaterLog(logId) {
  const { error } = await supabase.from('water_logs').delete().eq('id', logId);
  if (error) {
    showToast('Failed to remove', 'error');
  } else {
    showToast('Removed');
    await loadWater();
  }
}

/* ─────────────────────────────────────────
   Sidebar init (shared pattern)
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
