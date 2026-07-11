/* ============================================================
   NutriTrack — Dashboard Logic
   js/dashboard.js
   ============================================================ */
import { supabase, requireAuth, todayStr, formatDate, formatTime, showToast } from './supabase.js';
import { renderWeeklyCalories, renderMonthlyCalories, renderMacrosPie,
         buildCalorieChartData, updateChartsTheme } from './charts.js';

/* ─────────────────────────────────────────
   Init Dashboard
   ───────────────────────────────────────── */
export async function initDashboard() {
  const user = await requireAuth();

  // Apply saved theme
  const theme = localStorage.getItem('nt_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  // Sidebar collapse
  initSidebar();

  // Load profile info (name, avatar, goals)
  const profile = await loadProfile(user.id);

  // Update UI with profile
  updateNavbarProfile(profile, user);

  // Load all dashboard data
  showSkeletons();
  const today = todayStr();

  const [todayMeals, waterLogs, weightLogs] = await Promise.all([
    fetchTodayMeals(user.id, today),
    fetchTodayWater(user.id, today),
    fetchRecentWeights(user.id),
  ]);

  // Render stats
  renderStats(todayMeals, waterLogs, weightLogs, profile);

  // Render macros
  renderMacros(todayMeals, profile);

  // Render recent meals
  renderRecentMeals(todayMeals, user.id);

  // Render charts
  await renderCharts(user.id);

  // Water widget
  renderWaterWidget(waterLogs, profile);

  // BMI card
  renderBMI(weightLogs, profile);

  // Quick Add Meal
  initQuickAdd(user.id);

  // Update date display
  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

/* ─────────────────────────────────────────
   Sidebar
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

  // Restore state
  if (localStorage.getItem('nt_sidebar') === '1') {
    sidebar?.classList.add('collapsed');
    mainContent?.classList.add('sidebar-collapsed');
  }

  // Mobile overlay
  mobileMenu?.addEventListener('click', () => {
    sidebar?.classList.add('mobile-open');
    overlay?.classList.add('show');
  });
  overlay?.addEventListener('click', () => {
    sidebar?.classList.remove('mobile-open');
    overlay?.classList.remove('show');
  });

  // Active link
  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === currentPage) link.classList.add('active');
  });
}

/* ─────────────────────────────────────────
   Data Fetching
   ───────────────────────────────────────── */
async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return data || {};
}

async function fetchTodayMeals(userId, date) {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('meal_date', date)
    .order('meal_time', { ascending: true });
  return data || [];
}

async function fetchTodayWater(userId, date) {
  const { data } = await supabase
    .from('water_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date);
  return data || [];
}

async function fetchRecentWeights(userId) {
  const { data } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(30);
  return data || [];
}

/* ─────────────────────────────────────────
   Stats Rendering
   ───────────────────────────────────────── */
function renderStats(meals, waterLogs, weightLogs, profile) {
  const totalCal  = meals.reduce((s, m) => s + parseFloat(m.calories || 0), 0);
  const goalCal   = profile.daily_calorie_goal || 2000;
  const remaining = Math.max(0, goalCal - totalCal);
  const totalWater= waterLogs.reduce((s, w) => s + parseFloat(w.amount || 0), 0);
  const waterGoal = 2500; // ml
  const currentW  = weightLogs[0]?.weight || null;
  const goalW     = profile.goal_weight || null;

  setText('stat-calories',  Math.round(totalCal));
  setText('stat-remaining', Math.round(remaining));
  setText('cal-goal-label', `of ${Math.round(goalCal)} kcal goal`);
  setText('stat-water',     Math.round(totalWater));
  if (currentW) setText('stat-weight', parseFloat(currentW).toFixed(1));

  // Progress bars
  setProgressBar('cal-progress',   (totalCal / goalCal) * 100);
  setProgressBar('water-progress', (totalWater / waterGoal) * 100);

  // Weight difference
  if (currentW && goalW) {
    const diff = parseFloat(currentW) - parseFloat(goalW);
    const el   = document.getElementById('stat-weight-diff');
    if (el) {
      el.textContent = diff > 0
        ? `${diff.toFixed(1)}kg above goal`
        : diff < 0
          ? `${Math.abs(diff).toFixed(1)}kg below goal`
          : 'At goal! 🎉';
    }
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setProgressBar(id, pct) {
  const el = document.getElementById(id);
  if (el) {
    const clamped = Math.min(pct, 100);
    el.style.width = `${clamped}%`;
    if (pct > 100) el.classList.add('danger');
  }
}

/* ─────────────────────────────────────────
   Macros
   ───────────────────────────────────────── */
function renderMacros(meals, profile) {
  const protein = meals.reduce((s, m) => s + parseFloat(m.protein || 0), 0);
  const carbs   = meals.reduce((s, m) => s + parseFloat(m.carbs   || 0), 0);
  const fat     = meals.reduce((s, m) => s + parseFloat(m.fat     || 0), 0);

  const goalCal    = profile.daily_calorie_goal || 2000;
  // Standard macro targets: ~30% protein, ~45% carbs, ~25% fat
  const proteinGoal = Math.round((goalCal * 0.30) / 4);  // 4 kcal/g
  const carbsGoal   = Math.round((goalCal * 0.45) / 4);
  const fatGoal     = Math.round((goalCal * 0.25) / 9);  // 9 kcal/g

  // Progress bars
  setBarWidth('protein-bar', (protein / proteinGoal) * 100);
  setBarWidth('carbs-bar',   (carbs   / carbsGoal)   * 100);
  setBarWidth('fat-bar',     (fat     / fatGoal)     * 100);

  setText('protein-val',   `${Math.round(protein)}g`);
  setText('carbs-val',     `${Math.round(carbs)}g`);
  setText('fat-val',       `${Math.round(fat)}g`);
  setText('protein-goal',  `/ ${proteinGoal}g goal`);
  setText('carbs-goal',    `/ ${carbsGoal}g goal`);
  setText('fat-goal',      `/ ${fatGoal}g goal`);

  // Legend values
  setText('legend-protein', `${Math.round(protein)}g`);
  setText('legend-carbs',   `${Math.round(carbs)}g`);
  setText('legend-fat',     `${Math.round(fat)}g`);

  // Doughnut chart
  renderMacrosPie('macros-chart', {
    protein: Math.round(protein),
    carbs:   Math.round(carbs),
    fat:     Math.round(fat),
  });

  // Center label
  const totalCal = Math.round(protein * 4 + carbs * 4 + fat * 9);
  setText('macro-center-val',   totalCal);
}

function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(pct, 100)}%`;
}

/* ─────────────────────────────────────────
   Recent Meals List
   ───────────────────────────────────────── */
const MEAL_ICONS = {
  breakfast: '🌅',
  lunch:     '☀️',
  dinner:    '🌙',
  snack:     '🍎',
};

function renderRecentMeals(meals, userId) {
  const container = document.getElementById('recent-meals-list');
  if (!container) return;

  if (meals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div class="empty-title">No meals logged today</div>
        <p class="empty-desc">Track your first meal to get started!</p>
        <button class="btn btn-primary btn-sm" id="empty-add-meal">+ Add Meal</button>
      </div>`;
    document.getElementById('empty-add-meal')?.addEventListener('click', openQuickAdd);
    return;
  }

  // Show last 5
  const recent = meals.slice(-5).reverse();
  container.innerHTML = recent.map(meal => `
    <div class="meal-item" data-id="${meal.id}">
      <div class="meal-item-icon meal-type-${meal.meal_type}">
        ${MEAL_ICONS[meal.meal_type] || '🍽️'}
      </div>
      <div class="meal-item-info">
        <div class="meal-item-name">${escHtml(meal.meal_name)}</div>
        <div class="meal-item-meta">${capitalize(meal.meal_type)} · ${formatTime(meal.meal_time) || '–'}</div>
      </div>
      <div class="meal-item-right">
        <div class="meal-item-cal">${Math.round(meal.calories)} kcal</div>
        <div class="meal-item-macros">P:${Math.round(meal.protein)}g C:${Math.round(meal.carbs)}g F:${Math.round(meal.fat)}g</div>
      </div>
      <div class="meal-item-actions">
        <button class="meal-action-btn delete" data-id="${meal.id}" title="Delete">🗑️</button>
      </div>
    </div>
  `).join('');

  // Delete handlers
  container.querySelectorAll('.meal-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this meal?')) return;
      const { error } = await supabase.from('meals').delete().eq('id', btn.dataset.id);
      if (error) { showToast('Failed to delete meal', 'error'); return; }
      showToast('Meal deleted');
      initDashboard();
    });
  });
}

/* ─────────────────────────────────────────
   Charts
   ───────────────────────────────────────── */
async function renderCharts(userId) {
  const today = new Date();
  const from7 = new Date(today); from7.setDate(today.getDate() - 6);
  const from30= new Date(today); from30.setDate(today.getDate() - 29);

  const { data: meals7 } = await supabase
    .from('meals')
    .select('meal_date, calories')
    .eq('user_id', userId)
    .gte('meal_date', from7.toISOString().split('T')[0]);

  const { data: meals30 } = await supabase
    .from('meals')
    .select('meal_date, calories')
    .eq('user_id', userId)
    .gte('meal_date', from30.toISOString().split('T')[0]);

  const weeklyData  = buildCalorieChartData(meals7  || [], 7);
  const monthlyData = buildCalorieChartData(meals30 || [], 30);

  renderWeeklyCalories('weekly-chart',  weeklyData);
  renderMonthlyCalories('monthly-chart', monthlyData);

  // Chart tab switcher
  const tabs = document.querySelectorAll('.chart-tab[data-chart]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const chartName = tab.dataset.chart;
      document.querySelectorAll('.chart-panel').forEach(p => {
        p.style.display = p.dataset.panel === chartName ? 'block' : 'none';
      });
    });
  });
}

/* ─────────────────────────────────────────
   Water Widget
   ───────────────────────────────────────── */
function renderWaterWidget(waterLogs, profile) {
  const totalWater = waterLogs.reduce((s, w) => s + parseFloat(w.amount || 0), 0);
  const waterGoal  = 2500;
  const pct        = Math.min(totalWater / waterGoal, 1);

  const amountEl = document.getElementById('water-widget-amount');
  const goalEl   = document.getElementById('water-widget-goal');
  const ringFill = document.getElementById('water-ring-fill-widget');

  if (amountEl) amountEl.textContent = Math.round(totalWater);
  if (goalEl)   goalEl.textContent   = waterGoal;

  if (ringFill) {
    const radius = 54;
    const circ   = 2 * Math.PI * radius;
    ringFill.style.strokeDasharray  = circ;
    ringFill.style.strokeDashoffset = circ * (1 - pct);
  }
}

/* ─────────────────────────────────────────
   BMI Card
   ───────────────────────────────────────── */
function renderBMI(weightLogs, profile) {
  const weight = parseFloat(weightLogs[0]?.weight || profile.weight || 0);
  const height = parseFloat(profile.height || 0); // cm
  if (!weight || !height) return;

  const bmi = weight / Math.pow(height / 100, 2);
  const bmiEl     = document.getElementById('bmi-value');
  const bmiCatEl  = document.getElementById('bmi-category');
  const bmiIndEl  = document.getElementById('bmi-indicator');

  if (bmiEl) bmiEl.textContent = bmi.toFixed(1);

  let category = '', color = '', pct = 0;
  if      (bmi < 18.5) { category = 'Underweight'; color = '#3B82F6'; pct = (bmi / 18.5) * 25; }
  else if (bmi < 25)   { category = 'Normal';      color = '#22C55E'; pct = 25 + ((bmi - 18.5) / 6.5) * 25; }
  else if (bmi < 30)   { category = 'Overweight';  color = '#F59E0B'; pct = 50 + ((bmi - 25) / 5) * 25; }
  else                 { category = 'Obese';        color = '#EF4444'; pct = Math.min(75 + ((bmi - 30) / 10) * 25, 100); }

  if (bmiCatEl) { bmiCatEl.textContent = category; bmiCatEl.style.color = color; }
  if (bmiIndEl) bmiIndEl.style.left = `${pct}%`;
}

/* ─────────────────────────────────────────
   Quick Add Meal (dashboard modal)
   ───────────────────────────────────────── */
let currentUserId = null;

function initQuickAdd(userId) {
  currentUserId = userId;
  const modal   = document.getElementById('quick-add-modal');
  const openBtn = document.getElementById('quick-add-btn');
  const closeBtn= document.getElementById('quick-add-close');
  const form    = document.getElementById('quick-add-form');

  openBtn?.addEventListener('click', openQuickAdd);
  closeBtn?.addEventListener('click', () => modal?.classList.remove('open'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd       = new FormData(form);
    const submitBtn= form.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const meal = {
      user_id:   currentUserId,
      meal_name: fd.get('meal_name'),
      meal_type: fd.get('meal_type'),
      calories:  parseFloat(fd.get('calories')) || 0,
      protein:   parseFloat(fd.get('protein'))  || 0,
      carbs:     parseFloat(fd.get('carbs'))    || 0,
      fat:       parseFloat(fd.get('fat'))      || 0,
      serving:   fd.get('serving') || '1 serving',
      meal_date: todayStr(),
      meal_time: new Date().toTimeString().slice(0, 5),
      notes:     fd.get('notes') || null,
    };

    const { error } = await supabase.from('meals').insert(meal);
    if (error) {
      showToast('Failed to add meal: ' + error.message, 'error');
    } else {
      showToast('Meal added successfully! 🍽️');
      form.reset();
      modal?.classList.remove('open');
      initDashboard();
    }

    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Meal';
  });
}

function openQuickAdd() {
  document.getElementById('quick-add-modal')?.classList.add('open');
}

/* ─────────────────────────────────────────
   Update Navbar Profile
   ───────────────────────────────────────── */
async function updateNavbarProfile(profile, user) {
  const nameEls   = document.querySelectorAll('[data-profile-name]');
  const avatarEls = document.querySelectorAll('[data-profile-avatar]');
  const initEls   = document.querySelectorAll('[data-profile-initial]');

  const name    = profile.name || user.email?.split('@')[0] || 'User';
  const initial = name[0]?.toUpperCase() || 'U';

  nameEls.forEach(el   => el.textContent = name);
  initEls.forEach(el   => el.textContent = initial);

  if (profile.avatar_url) {
    avatarEls.forEach(el => {
      el.innerHTML = `<img src="${profile.avatar_url}" alt="${name}" loading="lazy">`;
    });
  } else {
    avatarEls.forEach(el => el.textContent = initial);
  }
}

/* ─────────────────────────────────────────
   Skeleton Loading
   ───────────────────────────────────────── */
function showSkeletons() {
  document.querySelectorAll('[data-skeleton]').forEach(el => {
    el.classList.add('skeleton');
  });
  setTimeout(() => {
    document.querySelectorAll('[data-skeleton]').forEach(el => {
      el.classList.remove('skeleton');
    });
  }, 800);
}

/* ─────────────────────────────────────────
   Utils
   ───────────────────────────────────────── */
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}
