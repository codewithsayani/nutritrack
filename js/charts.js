/* ============================================================
   NutriTrack — Charts Module (Chart.js wrappers)
   js/charts.js
   ============================================================ */

/* ─────────────────────────────────────────
   Shared Chart Defaults
   ───────────────────────────────────────── */
const COLORS = {
  primary:   '#4F46E5',
  secondary: '#7C3AED',
  accent:    '#22C55E',
  warning:   '#F59E0B',
  danger:    '#EF4444',
  info:      '#3B82F6',
  muted:     '#94A3B8',
};

function getThemeColor(varName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName).trim();
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

function gridColor()  { return isDark() ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'; }
function textColor()  { return isDark() ? '#94A3B8' : '#64748B'; }

const BASE_FONT = {
  family: "'Poppins', system-ui, sans-serif",
  size:   12,
};

Chart.defaults.font          = BASE_FONT;
Chart.defaults.color         = textColor();
Chart.defaults.plugins.legend.display = false;

/* ─────────────────────────────────────────
   Weekly Calories Bar Chart
   ───────────────────────────────────────── */
let weeklyChartInstance = null;

export function renderWeeklyCalories(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (weeklyChartInstance) weeklyChartInstance.destroy();

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0,   'rgba(79,70,229,0.85)');
  gradient.addColorStop(1,   'rgba(124,58,237,0.25)');

  weeklyChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels:   data.labels,
      datasets: [{
        label:           'Calories',
        data:            data.values,
        backgroundColor: gradient,
        borderColor:     COLORS.primary,
        borderWidth:     0,
        borderRadius:    8,
        borderSkipped:   false,
        hoverBackgroundColor: COLORS.primary,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: isDark() ? '#1E293B' : '#fff',
          titleColor:      isDark() ? '#F8FAFC' : '#0F172A',
          bodyColor:       textColor(),
          borderColor:     gridColor(),
          borderWidth:     1,
          padding:         12,
          cornerRadius:    8,
          callbacks: {
            label: ctx => ` ${ctx.formattedValue} kcal`,
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 11, weight: '600' } },
        },
        y: {
          grid:  { color: gridColor(), drawBorder: false },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 11 }, callback: v => `${v}` },
          beginAtZero: true,
        },
      },
    },
  });

  return weeklyChartInstance;
}

/* ─────────────────────────────────────────
   Monthly Calories Line Chart
   ───────────────────────────────────────── */
let monthlyChartInstance = null;

export function renderMonthlyCalories(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (monthlyChartInstance) monthlyChartInstance.destroy();

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 260);
  gradient.addColorStop(0, 'rgba(79,70,229,0.3)');
  gradient.addColorStop(1, 'rgba(79,70,229,0)');

  monthlyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   data.labels,
      datasets: [{
        label:           'Calories',
        data:            data.values,
        borderColor:     COLORS.primary,
        borderWidth:     2.5,
        backgroundColor: gradient,
        fill:            true,
        tension:         0.4,
        pointBackgroundColor: COLORS.primary,
        pointBorderColor:     '#fff',
        pointBorderWidth:     2,
        pointRadius:          4,
        pointHoverRadius:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: isDark() ? '#1E293B' : '#fff',
          titleColor:      isDark() ? '#F8FAFC' : '#0F172A',
          bodyColor:       textColor(),
          borderColor:     gridColor(),
          borderWidth:     1,
          padding:         12,
          cornerRadius:    8,
          callbacks: {
            label: ctx => ` ${ctx.formattedValue} kcal`,
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 10 }, maxTicksLimit: 10 },
        },
        y: {
          grid:  { color: gridColor() },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 11 } },
          beginAtZero: true,
        },
      },
    },
  });

  return monthlyChartInstance;
}

/* ─────────────────────────────────────────
   Weight Progress Line Chart
   ───────────────────────────────────────── */
let weightChartInstance = null;

export function renderWeightProgress(canvasId, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (weightChartInstance) weightChartInstance.destroy();

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(124,58,237,0.3)');
  gradient.addColorStop(1, 'rgba(124,58,237,0)');

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   data.labels,
      datasets: [{
        label:           'Weight (kg)',
        data:            data.values,
        borderColor:     COLORS.secondary,
        borderWidth:     2.5,
        backgroundColor: gradient,
        fill:            true,
        tension:         0.4,
        pointBackgroundColor: COLORS.secondary,
        pointBorderColor:     '#fff',
        pointBorderWidth:     2,
        pointRadius:          5,
        pointHoverRadius:     7,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        tooltip: {
          backgroundColor: isDark() ? '#1E293B' : '#fff',
          titleColor:      isDark() ? '#F8FAFC' : '#0F172A',
          bodyColor:       textColor(),
          borderColor:     gridColor(),
          borderWidth:     1,
          padding:         12,
          cornerRadius:    8,
          callbacks: {
            label: ctx => ` ${parseFloat(ctx.raw).toFixed(1)} kg`,
          },
        },
      },
      scales: {
        x: {
          grid:  { display: false },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 11 } },
        },
        y: {
          grid:  { color: gridColor() },
          border:{ display: false },
          ticks: { color: textColor(), font: { size: 11 }, callback: v => `${v} kg` },
        },
      },
    },
  });

  return weightChartInstance;
}

/* ─────────────────────────────────────────
   Macros Doughnut Chart
   ───────────────────────────────────────── */
let macroChartInstance = null;

export function renderMacrosPie(canvasId, { protein, carbs, fat }) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (macroChartInstance) macroChartInstance.destroy();

  const total = protein + carbs + fat || 1;
  const ctx   = canvas.getContext('2d');

  macroChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels:   ['Protein', 'Carbs', 'Fat'],
      datasets: [{
        data:            [protein, carbs, fat],
        backgroundColor: [COLORS.primary, COLORS.warning, COLORS.accent],
        hoverBackgroundColor: ['#3730A3', '#D97706', '#16A34A'],
        borderColor:     isDark() ? '#1E293B' : '#fff',
        borderWidth:     3,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '72%',
      plugins: {
        tooltip: {
          backgroundColor: isDark() ? '#1E293B' : '#fff',
          titleColor:      isDark() ? '#F8FAFC' : '#0F172A',
          bodyColor:       textColor(),
          borderColor:     gridColor(),
          borderWidth:     1,
          padding:         12,
          cornerRadius:    8,
          callbacks: {
            label: ctx => {
              const pct = ((ctx.raw / total) * 100).toFixed(1);
              return ` ${ctx.raw}g (${pct}%)`;
            },
          },
        },
        legend: { display: false },
      },
    },
  });

  return macroChartInstance;
}

/* ─────────────────────────────────────────
   Update charts on theme change
   ───────────────────────────────────────── */
export function updateChartsTheme() {
  Chart.defaults.color = textColor();
  [weeklyChartInstance, monthlyChartInstance, weightChartInstance, macroChartInstance]
    .filter(Boolean)
    .forEach(chart => {
      if (chart.config.type !== 'doughnut') {
        chart.options.scales.x.ticks.color = textColor();
        chart.options.scales.y.ticks.color = textColor();
        chart.options.scales.y.grid.color  = gridColor();
      }
      chart.update();
    });
}

/* ─────────────────────────────────────────
   Build last-N-days labels + values from meal data
   ───────────────────────────────────────── */
export function buildCalorieChartData(meals, days = 7) {
  const map = {};
  meals.forEach(m => {
    const d = m.meal_date;
    map[d] = (map[d] || 0) + parseFloat(m.calories || 0);
  });

  const labels = [];
  const values = [];
  const today  = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const label = days <= 7
      ? d.toLocaleDateString('en-US', { weekday: 'short' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    labels.push(label);
    values.push(Math.round(map[key] || 0));
  }

  return { labels, values };
}

/* ─────────────────────────────────────────
   Build weight chart data from weight_logs
   ───────────────────────────────────────── */
export function buildWeightChartData(weightLogs) {
  const sorted = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  return {
    labels: sorted.map(w => new Date(w.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
    values: sorted.map(w => parseFloat(w.weight)),
  };
}
