import { supabase } from './supabase.js';

export async function initExercise() {
  const exerciseForm = document.getElementById('exercise-form');
  const exerciseSelect = document.getElementById('exercise-select');
  const durationInput = document.getElementById('duration-val');
  const resultDiv = document.getElementById('exercise-result');
  const caloriesVal = document.getElementById('calories-burned-val');
  const weightSpan = document.getElementById('current-user-weight');

  // Plan UI elements
  const planLoading = document.getElementById('exercise-plan-loading');
  const planContent = document.getElementById('exercise-plan-content');
  const goalTypeEl = document.getElementById('exercise-goal-type');

  // Check auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    window.location.href = 'login.html';
    return;
  }

  // Load user profile weight
  let userWeight = 70; // Default fallback
  let userGoal = 'maintain';
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('weight, goal_weight')
      .eq('id', user.id)
      .single();
    
    if (profile) {
      if (profile.weight) userWeight = parseFloat(profile.weight);
      
      if (profile.goal_weight && profile.weight) {
        const g = parseFloat(profile.goal_weight);
        const w = parseFloat(profile.weight);
        if (g < w) userGoal = 'lose-weight';
        else if (g > w) userGoal = 'gain-weight';
      }
    }
    
    if (goalTypeEl) goalTypeEl.textContent = userGoal.replace('-', ' ');
    
    if (planLoading && planContent) {
      generateExercisePlan(userWeight, userGoal);
      planLoading.style.display = 'none';
      planContent.style.display = 'flex';
    }

  } catch (err) {
    console.error('Error fetching profile for exercise calculator:', err);
    if (planLoading) planLoading.textContent = 'Failed to load exercise plan.';
  }

  // Update UI with user weight
  if (weightSpan) {
    weightSpan.textContent = userWeight;
  }

  // Calculate logic
  if (exerciseForm) {
    exerciseForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const metValue = parseFloat(exerciseSelect.value);
      const durationMins = parseInt(durationInput.value, 10);
      
      if (isNaN(metValue) || isNaN(durationMins) || durationMins <= 0) {
        return;
      }
      
      // Formula: Calories = MET * Weight (kg) * Duration (hrs)
      const durationHours = durationMins / 60;
      const caloriesBurned = Math.round(metValue * userWeight * durationHours);
      
      // Show result
      caloriesVal.textContent = caloriesBurned;
      resultDiv.style.display = 'block';
    });
  }
}

function generateExercisePlan(weight, goal) {
  // Helper to calculate exact calories
  const calcCals = (met, durationMins) => Math.round(met * weight * (durationMins / 60));

  let w1, w2, w3;

  if (goal === 'lose-weight') {
    w1 = { name: "Cardio: Brisk Walk", met: 5.0, duration: 45, desc: "A steady-state walk at a brisk pace (approx 3.5 - 4.0 mph). Great for fat burning without over-taxing your nervous system." };
    w2 = { name: "HIIT: Running Intervals", met: 9.8, duration: 30, desc: "High Intensity Interval Training. Sprint for 1 min, walk for 1 min. Highly effective for creating a calorie deficit." };
    w3 = { name: "Full Body Resistance", met: 6.0, duration: 40, desc: "Circuit training with lighter weights and high reps to build lean muscle while keeping heart rate elevated." };
  } else if (goal === 'gain-weight') {
    w1 = { name: "Strength: Upper Body", met: 5.0, duration: 60, desc: "Heavy weightlifting focusing on compound movements (Bench Press, Rows, Overhead Press) for hypertrophy." };
    w2 = { name: "Strength: Lower Body", met: 5.0, duration: 60, desc: "Heavy weightlifting focusing on the legs (Squats, Deadlifts, Lunges) to build maximum muscle mass." };
    w3 = { name: "Active Recovery", met: 3.0, duration: 20, desc: "Light yoga or stretching. Keep cardio minimal so you do not burn the calories you need to build muscle." };
  } else {
    // Maintain weight
    w1 = { name: "Mixed Cardio", met: 7.0, duration: 45, desc: "A mix of jogging, cycling, or swimming at a moderate pace for cardiovascular health." };
    w2 = { name: "Strength Maintenance", met: 5.0, duration: 45, desc: "Moderate weight training targeting all major muscle groups." };
    w3 = { name: "Yoga or Pilates", met: 3.0, duration: 45, desc: "Core strengthening and flexibility work to maintain functional mobility." };
  }

  // Populate UI
  document.getElementById('workout1-name').textContent = w1.name;
  document.getElementById('workout1-cals').textContent = `${calcCals(w1.met, w1.duration)} kcal`;
  document.getElementById('workout1-duration').textContent = `${w1.duration} mins`;
  document.getElementById('workout1-desc').textContent = w1.desc;

  document.getElementById('workout2-name').textContent = w2.name;
  document.getElementById('workout2-cals').textContent = `${calcCals(w2.met, w2.duration)} kcal`;
  document.getElementById('workout2-duration').textContent = `${w2.duration} mins`;
  document.getElementById('workout2-desc').textContent = w2.desc;

  document.getElementById('workout3-name').textContent = w3.name;
  document.getElementById('workout3-cals').textContent = `${calcCals(w3.met, w3.duration)} kcal`;
  document.getElementById('workout3-duration').textContent = `${w3.duration} mins`;
  document.getElementById('workout3-desc').textContent = w3.desc;
}
