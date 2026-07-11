import { supabase } from './supabase.js';

export async function initDietPlan() {
  const calTargetEl = document.getElementById('diet-calorie-target');
  const goalTypeEl = document.getElementById('diet-goal-type');
  const loadingEl = document.getElementById('diet-loading');
  const contentEl = document.getElementById('diet-plan-content');

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('daily_calorie_goal, weight, goal_weight')
      .eq('id', user.id)
      .single();

    if (error) throw error;

    const tdee = profile.daily_calorie_goal || 2000;
    
    let goal = 'maintain';
    if (profile.goal_weight && profile.weight) {
      const g = parseFloat(profile.goal_weight);
      const w = parseFloat(profile.weight);
      if (g < w) goal = 'lose-weight';
      else if (g > w) goal = 'gain-weight';
    }
    
    // UI update
    if (calTargetEl) calTargetEl.textContent = `${tdee} kcal`;
    if (goalTypeEl) goalTypeEl.textContent = goal.replace('-', ' ');

    generateDietPlan(tdee, goal);

    loadingEl.style.display = 'none';
    contentEl.style.display = 'flex';

  } catch (err) {
    console.error('Error fetching profile for diet plan:', err);
    loadingEl.textContent = 'Failed to load diet plan. Please try again.';
  }
}

function generateDietPlan(tdee, goal) {
  // Rough calorie distribution
  const breakfastCals = Math.round(tdee * 0.25);
  const snack1Cals = Math.round(tdee * 0.10);
  const lunchCals = Math.round(tdee * 0.30);
  const snack2Cals = Math.round(tdee * 0.10);
  const dinnerCals = Math.round(tdee * 0.25);

  document.getElementById('meal-cal-breakfast').textContent = `${breakfastCals} kcal`;
  document.getElementById('meal-cal-snack1').textContent = `${snack1Cals} kcal`;
  document.getElementById('meal-cal-lunch').textContent = `${lunchCals} kcal`;
  document.getElementById('meal-cal-snack2').textContent = `${snack2Cals} kcal`;
  document.getElementById('meal-cal-dinner').textContent = `${dinnerCals} kcal`;

  const mult = tdee / 2000; // Multiplier to scale food amounts

  // Basic template
  let bItems, s1Items, lItems, s2Items, dItems;

  if (goal === 'lose-weight') {
    bItems = [
      `<li>Oatmeal (${Math.round(40 * mult)}g) with almond milk</li>`,
      `<li>${Math.round(2 * mult)} boiled egg whites</li>`,
      `<li>1 cup green tea</li>`
    ];
    s1Items = [
      `<li>1 medium Apple</li>`,
      `<li>Almonds (${Math.round(15 * mult)}g)</li>`
    ];
    lItems = [
      `<li>Grilled Chicken Breast (${Math.round(150 * mult)}g) or Tofu (${Math.round(200 * mult)}g)</li>`,
      `<li>Large mixed salad with olive oil dressing</li>`,
      `<li>Quinoa (${Math.round(50 * mult)}g)</li>`
    ];
    s2Items = [
      `<li>Greek Yogurt (${Math.round(150 * mult)}g)</li>`,
      `<li>Berries (${Math.round(50 * mult)}g)</li>`
    ];
    dItems = [
      `<li>Baked Fish (${Math.round(150 * mult)}g) or Lentil soup (1 bowl)</li>`,
      `<li>Steamed broccoli and carrots</li>`,
      `<li>Brown rice (${Math.round(40 * mult)}g)</li>`
    ];
  } else if (goal === 'gain-weight') {
    bItems = [
      `<li>Oatmeal (${Math.round(80 * mult)}g) with whole milk and peanut butter</li>`,
      `<li>${Math.round(3 * mult)} whole eggs (scrambled)</li>`,
      `<li>1 banana</li>`
    ];
    s1Items = [
      `<li>Protein shake (1 scoop) with milk</li>`,
      `<li>Handful of mixed nuts</li>`
    ];
    lItems = [
      `<li>Chicken Breast (${Math.round(200 * mult)}g) or Paneer (${Math.round(150 * mult)}g)</li>`,
      `<li>Brown rice (${Math.round(150 * mult)}g)</li>`,
      `<li>Avocado (half)</li>`
    ];
    s2Items = [
      `<li>Cottage cheese (${Math.round(150 * mult)}g) or 2 Peanut butter toast</li>`
    ];
    dItems = [
      `<li>Lean Beef (${Math.round(150 * mult)}g) or Soy chunks (${Math.round(100 * mult)}g)</li>`,
      `<li>Sweet potato (${Math.round(200 * mult)}g)</li>`,
      `<li>Roasted vegetables with olive oil</li>`
    ];
  } else {
    // Maintain weight
    bItems = [
      `<li>Oatmeal (${Math.round(60 * mult)}g) with milk</li>`,
      `<li>${Math.round(2 * mult)} whole eggs</li>`,
      `<li>1 fruit of choice</li>`
    ];
    s1Items = [
      `<li>Handful of walnuts</li>`,
      `<li>1 small orange</li>`
    ];
    lItems = [
      `<li>Chicken/Tofu (${Math.round(150 * mult)}g)</li>`,
      `<li>Brown rice (${Math.round(100 * mult)}g)</li>`,
      `<li>Side salad</li>`
    ];
    s2Items = [
      `<li>Greek yogurt (${Math.round(150 * mult)}g)</li>`
    ];
    dItems = [
      `<li>Fish/Paneer (${Math.round(150 * mult)}g)</li>`,
      `<li>Quinoa (${Math.round(80 * mult)}g)</li>`,
      `<li>Steamed veggies</li>`
    ];
  }

  document.getElementById('meal-items-breakfast').innerHTML = bItems.join('');
  document.getElementById('meal-items-snack1').innerHTML = s1Items.join('');
  document.getElementById('meal-items-lunch').innerHTML = lItems.join('');
  document.getElementById('meal-items-snack2').innerHTML = s2Items.join('');
  document.getElementById('meal-items-dinner').innerHTML = dItems.join('');
}
