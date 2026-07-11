/* ============================================================
   NutriTrack — Meals CRUD
   js/meals.js
   ============================================================ */
import { supabase, requireAuth, todayStr, formatDate, formatTime, showToast } from './supabase.js';

const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

let currentUser   = null;
let allMeals      = [];
let editingMealId = null;

/* ─────────────────────────────────────────
   Init
   ───────────────────────────────────────── */
export async function initMeals() {
  currentUser = await requireAuth();

  const theme = localStorage.getItem('nt_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  initSidebar();
  initModal();
  initFilters();
  await loadMeals();
}

/* ─────────────────────────────────────────
   Load & Filter Meals
   ───────────────────────────────────────── */
async function loadMeals(filterDate = null, filterType = 'all') {
  const tableBody = document.getElementById('meals-tbody');
  if (!tableBody) return;

  // Show skeleton
  tableBody.innerHTML = Array(5).fill(`
    <tr><td colspan="8"><div class="skeleton skeleton-text" style="height:44px"></div></td></tr>
  `).join('');

  let query = supabase
    .from('meals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('meal_date', { ascending: false })
    .order('meal_time', { ascending: false });

  if (filterDate) query = query.eq('meal_date', filterDate);
  if (filterType !== 'all') query = query.eq('meal_type', filterType);

  const { data, error } = await query.limit(100);

  if (error) {
    showToast('Failed to load meals', 'error');
    tableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">Error loading meals</td></tr>`;
    return;
  }

  allMeals = data || [];
  renderMealsTable(allMeals);
  renderMealsSummary(allMeals);
}

function renderMealsTable(meals) {
  const tableBody = document.getElementById('meals-tbody');
  if (!tableBody) return;

  if (meals.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="empty-state">
            <div class="empty-icon">🍽️</div>
            <div class="empty-title">No meals found</div>
            <p class="empty-desc">Log your first meal using the button above!</p>
          </div>
        </td>
      </tr>`;
    return;
  }

  tableBody.innerHTML = meals.map(meal => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:1.3rem">${MEAL_ICONS[meal.meal_type] || '🍽️'}</span>
          <div>
            <div style="font-weight:600">${escHtml(meal.meal_name)}</div>
            <div style="font-size:11px;color:var(--text-muted)">${escHtml(meal.serving || '')}</div>
          </div>
        </div>
      </td>
      <td><span class="badge badge-${typeBadge(meal.meal_type)}">${capitalize(meal.meal_type)}</span></td>
      <td><strong style="color:var(--primary)">${Math.round(meal.calories)}</strong></td>
      <td>${Math.round(meal.protein)}g</td>
      <td>${Math.round(meal.carbs)}g</td>
      <td>${Math.round(meal.fat)}g</td>
      <td>
        <div style="font-size:var(--fs-xs)">${formatDate(meal.meal_date)}</div>
        <div style="font-size:10px;color:var(--text-muted)">${formatTime(meal.meal_time) || '–'}</div>
      </td>
      <td>
        <div class="table-actions">
          <button class="meal-action-btn edit-meal-btn" data-id="${meal.id}" title="Edit">✏️</button>
          <button class="meal-action-btn delete delete-meal-btn" data-id="${meal.id}" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Edit handlers
  tableBody.querySelectorAll('.edit-meal-btn').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });

  // Delete handlers
  tableBody.querySelectorAll('.delete-meal-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteMeal(btn.dataset.id));
  });
}

function renderMealsSummary(meals) {
  const totalCal     = meals.reduce((s, m) => s + parseFloat(m.calories || 0), 0);
  const totalProtein = meals.reduce((s, m) => s + parseFloat(m.protein  || 0), 0);
  const totalCarbs   = meals.reduce((s, m) => s + parseFloat(m.carbs    || 0), 0);
  const totalFat     = meals.reduce((s, m) => s + parseFloat(m.fat      || 0), 0);

  setText('summary-cal',     Math.round(totalCal));
  setText('summary-protein', `${Math.round(totalProtein)}g`);
  setText('summary-carbs',   `${Math.round(totalCarbs)}g`);
  setText('summary-fat',     `${Math.round(totalFat)}g`);
  setText('summary-count',   meals.length);

  const avgCal = meals.length > 0 ? totalCal / meals.length : 0;
  setText('summary-avg',     Math.round(avgCal));
}

/* ─────────────────────────────────────────
   Filters
   ───────────────────────────────────────── */
function initFilters() {
  const dateFilter = document.getElementById('date-filter');
  const typeFilter = document.getElementById('type-filter');
  const clearBtn   = document.getElementById('clear-filters');

  // Default to today
  if (dateFilter) dateFilter.value = todayStr();

  const applyFilters = () => {
    loadMeals(
      dateFilter?.value || null,
      typeFilter?.value || 'all'
    );
  };

  dateFilter?.addEventListener('change', applyFilters);
  typeFilter?.addEventListener('change', applyFilters);
  clearBtn?.addEventListener('click', () => {
    if (dateFilter) dateFilter.value = '';
    if (typeFilter) typeFilter.value = 'all';
    loadMeals(null, 'all');
  });

  // Initial load with today's date
  applyFilters();
}

/* ─────────────────────────────────────────
   Modal
   ───────────────────────────────────────── */
function initModal() {
  const modal    = document.getElementById('meal-modal');
  const openBtn  = document.getElementById('add-meal-btn');
  const closeBtn = document.getElementById('meal-modal-close');
  const form     = document.getElementById('meal-form');

  openBtn?.addEventListener('click', openAddModal);
  closeBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  form?.addEventListener('submit', handleMealSubmit);
}

function openAddModal() {
  editingMealId = null;
  const modal     = document.getElementById('meal-modal');
  const form      = document.getElementById('meal-form');
  const modalTitle= document.getElementById('meal-modal-title');

  form?.reset();
  // Set defaults
  const dateInput = form?.querySelector('[name="meal_date"]');
  const timeInput = form?.querySelector('[name="meal_time"]');
  if (dateInput) dateInput.value = todayStr();
  if (timeInput) timeInput.value = new Date().toTimeString().slice(0, 5);
  if (modalTitle) modalTitle.textContent = '➕ Add Meal';

  modal?.classList.add('open');
}

function openEditModal(mealId) {
  const meal = allMeals.find(m => m.id === mealId);
  if (!meal) return;

  editingMealId = mealId;
  const modal     = document.getElementById('meal-modal');
  const form      = document.getElementById('meal-form');
  const modalTitle= document.getElementById('meal-modal-title');

  if (modalTitle) modalTitle.textContent = '✏️ Edit Meal';

  // Populate form
  if (form) {
    form.querySelector('[name="meal_name"]').value  = meal.meal_name;
    form.querySelector('[name="meal_type"]').value  = meal.meal_type;
    form.querySelector('[name="calories"]').value   = meal.calories;
    form.querySelector('[name="protein"]').value    = meal.protein;
    form.querySelector('[name="carbs"]').value      = meal.carbs;
    form.querySelector('[name="fat"]').value        = meal.fat;
    form.querySelector('[name="serving"]').value    = meal.serving || '';
    form.querySelector('[name="meal_date"]').value  = meal.meal_date;
    form.querySelector('[name="meal_time"]').value  = meal.meal_time || '';
    form.querySelector('[name="notes"]').value      = meal.notes || '';
  }

  modal?.classList.add('open');
}

function closeModal() {
  document.getElementById('meal-modal')?.classList.remove('open');
  editingMealId = null;
}

async function handleMealSubmit(e) {
  e.preventDefault();
  const form    = e.target;
  const submitBtn = form.querySelector('[type="submit"]');
  const fd      = new FormData(form);

  const mealData = {
    meal_name: fd.get('meal_name'),
    meal_type: fd.get('meal_type'),
    calories:  parseFloat(fd.get('calories')) || 0,
    protein:   parseFloat(fd.get('protein'))  || 0,
    carbs:     parseFloat(fd.get('carbs'))    || 0,
    fat:       parseFloat(fd.get('fat'))      || 0,
    serving:   fd.get('serving') || '1 serving',
    meal_date: fd.get('meal_date') || todayStr(),
    meal_time: fd.get('meal_time') || null,
    notes:     fd.get('notes') || null,
  };

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner spinner-dark"></span> Saving...';

  let error;
  if (editingMealId) {
    ({ error } = await supabase.from('meals').update(mealData).eq('id', editingMealId));
  } else {
    ({ error } = await supabase.from('meals').insert({ ...mealData, user_id: currentUser.id }));
  }

  if (error) {
    showToast('Failed to save meal: ' + error.message, 'error');
  } else {
    showToast(editingMealId ? 'Meal updated! ✅' : 'Meal added! 🍽️');
    closeModal();
    // Reapply current filters
    const dateFilter = document.getElementById('date-filter');
    const typeFilter = document.getElementById('type-filter');
    await loadMeals(dateFilter?.value || null, typeFilter?.value || 'all');
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = editingMealId ? 'Update Meal' : 'Add Meal';
}

async function deleteMeal(mealId) {
  if (!confirm('Are you sure you want to delete this meal?')) return;

  const { error } = await supabase.from('meals').delete().eq('id', mealId);
  if (error) {
    showToast('Failed to delete meal', 'error');
  } else {
    showToast('Meal deleted');
    const dateFilter = document.getElementById('date-filter');
    const typeFilter = document.getElementById('type-filter');
    await loadMeals(dateFilter?.value || null, typeFilter?.value || 'all');
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

  const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-item').forEach(link => {
    const href = link.getAttribute('href')?.split('/').pop();
    if (href === currentPage) link.classList.add('active');
  });

  // Set profile info
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

/* Utils */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}
function typeBadge(type) {
  const map = { breakfast: 'warning', lunch: 'accent', dinner: 'primary', snack: 'muted' };
  return map[type] || 'muted';
}
