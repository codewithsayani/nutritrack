/* ============================================================
   NutriTrack — Weight Tracker
   js/weight.js
   ============================================================ */
import { supabase, requireAuth, todayStr, formatDate, showToast } from './supabase.js';
import { renderWeightProgress, buildWeightChartData } from './charts.js';

let currentUser = null;
let weightLogs  = [];
let profile     = {};

export async function initWeight() {
  currentUser = await requireAuth();

  const theme = localStorage.getItem('nt_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  initSidebar();
  profile = await loadProfile();
  await loadWeightLogs();
  initAddForm();
}

/* ─────────────────────────────────────────
   Data Loading
   ───────────────────────────────────────── */
async function loadProfile() {
  const { data } = await supabase
    .from('profiles')
    .select('height, weight, goal_weight, name, avatar_url')
    .eq('id', currentUser.id)
    .single();
  return data || {};
}

async function loadWeightLogs() {
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('date', { ascending: false })
    .limit(90);

  if (error) { showToast('Failed to load weight data', 'error'); return; }

  weightLogs = data || [];
  renderWeightTable();
  renderBMI();
  renderWeightStats();
  renderChart();
}

/* ─────────────────────────────────────────
   Render Weight Table
   ───────────────────────────────────────── */
function renderWeightTable() {
  const tbody = document.getElementById('weight-tbody');
  if (!tbody) return;

  if (weightLogs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="empty-state">
            <div class="empty-icon">⚖️</div>
            <div class="empty-title">No weight entries yet</div>
            <p class="empty-desc">Log your first weight entry to start tracking!</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = weightLogs.map((log, i) => {
    const prev = weightLogs[i + 1];
    let diff = '', diffClass = 'neutral';
    if (prev) {
      const d = parseFloat(log.weight) - parseFloat(prev.weight);
      if (d > 0)      { diff = `+${d.toFixed(1)}`; diffClass = 'positive'; }
      else if (d < 0) { diff = `${d.toFixed(1)}`;  diffClass = 'negative'; }
      else              diff = '–';
    }

    const bmi = profile.height
      ? (parseFloat(log.weight) / Math.pow(parseFloat(profile.height) / 100, 2)).toFixed(1)
      : '–';

    return `
      <tr>
        <td><strong>${formatDate(log.date)}</strong></td>
        <td><strong style="font-size:var(--fs-lg);color:var(--primary)">${parseFloat(log.weight).toFixed(1)} kg</strong></td>
        <td><span class="weight-row-diff ${diffClass}">${diff}</span></td>
        <td>${bmi}</td>
        <td>
          <div class="table-actions">
            <button class="meal-action-btn delete delete-weight-btn" data-id="${log.id}" title="Delete">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.delete-weight-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteWeightLog(btn.dataset.id));
  });
}

/* ─────────────────────────────────────────
   BMI Card
   ───────────────────────────────────────── */
function renderBMI() {
  const latestWeight = parseFloat(profile.weight || weightLogs[0]?.weight || 0);
  const height       = parseFloat(profile.height || 0);

  const bmiEl    = document.getElementById('bmi-value');
  const bmiCatEl = document.getElementById('bmi-category');
  const bmiIndEl = document.getElementById('bmi-indicator');
  const bmiDescEl= document.getElementById('bmi-description');

  if (!latestWeight || !height) {
    if (bmiEl) bmiEl.textContent = '–';
    return;
  }

  const bmi = latestWeight / Math.pow(height / 100, 2);
  if (bmiEl) bmiEl.textContent = bmi.toFixed(1);

  let category, color, pct, description;
  if (bmi < 18.5) {
    category = 'Underweight'; color = '#3B82F6'; pct = (bmi / 18.5) * 25;
    description = 'You may need to gain weight. Consult a healthcare provider.';
  } else if (bmi < 25) {
    category = 'Normal Weight'; color = '#22C55E'; pct = 25 + ((bmi - 18.5) / 6.5) * 25;
    description = 'Great! You have a healthy weight for your height.';
  } else if (bmi < 30) {
    category = 'Overweight'; color = '#F59E0B'; pct = 50 + ((bmi - 25) / 5) * 25;
    description = 'Consider adopting healthy eating habits and regular exercise.';
  } else {
    category = 'Obese'; color = '#EF4444'; pct = Math.min(75 + ((bmi - 30) / 10) * 25, 100);
    description = 'Please consult a healthcare provider for guidance.';
  }

  if (bmiCatEl)  { bmiCatEl.textContent = category; bmiCatEl.style.color = color; }
  if (bmiIndEl)  bmiIndEl.style.left    = `${Math.min(pct, 98)}%`;
  if (bmiDescEl) bmiDescEl.textContent  = description;
}

/* ─────────────────────────────────────────
   Weight Stats
   ───────────────────────────────────────── */
function renderWeightStats() {
  if (weightLogs.length === 0 && !profile.weight) return;

  const weights   = weightLogs.map(l => parseFloat(l.weight));
  const current   = parseFloat(profile.weight) || (weights.length ? weights[0] : 0);
  const heaviest  = weights.length ? Math.max(...weights) : current;
  const lightest  = weights.length ? Math.min(...weights) : current;
  const goalW     = parseFloat(profile.goal_weight || 0);
  const diff      = goalW ? (current - goalW).toFixed(1) : null;

  setText('stat-current-weight', `${current.toFixed(1)} kg`);
  setText('stat-highest-weight', `${heaviest.toFixed(1)} kg`);
  setText('stat-lowest-weight',  `${lightest.toFixed(1)} kg`);

  if (goalW) {
    setText('stat-goal-weight', `${goalW.toFixed(1)} kg`);
  } else {
    setText('stat-goal-weight', 'Not Set');
  }

  if (diff !== null) {
    const el = document.getElementById('stat-goal-diff');
    if (el) {
      el.textContent = parseFloat(diff) > 0
        ? `${diff} kg above goal`
        : parseFloat(diff) < 0
          ? `${Math.abs(diff)} kg below goal`
          : '🎉 At goal!';
    }
  }
}

/* ─────────────────────────────────────────
   Chart
   ───────────────────────────────────────── */
function renderChart() {
  if (weightLogs.length < 2) return;
  const chartData = buildWeightChartData(weightLogs.slice(0, 30).reverse());
  renderWeightProgress('weight-chart', chartData);
}

/* ─────────────────────────────────────────
   Add Weight Form
   ───────────────────────────────────────── */
function initAddForm() {
  const form      = document.getElementById('add-weight-form');
  const submitBtn = document.getElementById('add-weight-btn');

  // Default values
  const dateInput   = form?.querySelector('[name="weight_date"]');
  const weightInput = form?.querySelector('[name="weight"]');
  if (dateInput)   dateInput.value   = todayStr();
  if (weightInput && profile.weight) weightInput.placeholder = profile.weight;

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const weight = parseFloat(fd.get('weight'));
    if (!weight || weight <= 0 || weight > 500) {
      showToast('Enter a valid weight (1–500 kg)', 'warning');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner-dark"></span> Saving...';

    const { error } = await supabase.from('weight_logs').insert({
      user_id: currentUser.id,
      weight,
      date:  fd.get('weight_date') || todayStr(),
      notes: fd.get('notes') || null,
    });

    if (error) {
      showToast('Failed to log weight: ' + error.message, 'error');
    } else {
      // Also update the profile weight so it syncs everywhere
      await supabase.from('profiles').update({ weight }).eq('id', currentUser.id);
      
      showToast(`Weight logged: ${weight} kg ⚖️`);
      form.reset();
      if (dateInput) dateInput.value = todayStr();
      await loadWeightLogs();
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '➕ Log Weight';
  });
}

async function deleteWeightLog(id) {
  if (!confirm('Delete this weight entry?')) return;
  const { error } = await supabase.from('weight_logs').delete().eq('id', id);
  if (error) { showToast('Failed to delete', 'error'); return; }
  showToast('Deleted');
  await loadWeightLogs();

  if (weightLogs.length > 0) {
    await supabase.from('profiles').update({ weight: parseFloat(weightLogs[0].weight) }).eq('id', currentUser.id);
  } else {
    await supabase.from('profiles').update({ weight: null }).eq('id', currentUser.id);
  }
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

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
