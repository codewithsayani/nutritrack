/* ============================================================
   NutriTrack — User Profile
   js/profile.js
   ============================================================ */
import { supabase, requireAuth, showToast } from './supabase.js';

let currentUser = null;

export async function initProfile() {
  currentUser = await requireAuth();

  const theme = localStorage.getItem('nt_theme');
  if (theme) document.documentElement.setAttribute('data-theme', theme);

  initSidebar();
  await loadAndRenderProfile();
  initAvatarUpload();
  initMacroCalculator();
}

/* ─────────────────────────────────────────
   Load Profile
   ───────────────────────────────────────── */
async function loadAndRenderProfile() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', currentUser.id)
    .single();

  if (error) { showToast('Failed to load profile', 'error'); return; }

  const profile = data || {};

  // Header card
  const nameEls  = document.querySelectorAll('[data-profile-name]');
  const initEls  = document.querySelectorAll('[data-profile-initial]');
  const emailEl  = document.getElementById('profile-email');
  const headerAvatar = document.getElementById('profile-header-avatar');
  const avatarEls = document.querySelectorAll('[data-profile-avatar]');

  const name    = profile.name || currentUser.email?.split('@')[0] || 'User';
  const initial = name[0]?.toUpperCase() || 'U';

  nameEls.forEach(el  => el.textContent = name);
  initEls.forEach(el  => el.textContent = initial);
  if (emailEl) emailEl.textContent = currentUser.email || '';

  if (profile.avatar_url) {
    if (headerAvatar) headerAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="${name}" loading="lazy">`;
    avatarEls.forEach(el => el.innerHTML = `<img src="${profile.avatar_url}" alt="${name}" loading="lazy">`);
  } else {
    if (headerAvatar) headerAvatar.textContent = initial;
    avatarEls.forEach(el => el.textContent = initial);
  }

  // Goal badge
  setText('profile-goal-badge', profile.goal_weight ? `Goal: ${profile.goal_weight} kg` : 'Set your goal');

  // Form fields
  setField('name',              profile.name || '');
  setField('age',               profile.age || '');
  setField('height',            profile.height || '');
  setField('weight',            profile.weight || '');
  setField('goal_weight',       profile.goal_weight || '');
  setField('daily_calorie_goal',profile.daily_calorie_goal || 2000);

  // Select fields
  const genderSel   = document.getElementById('gender');
  const activitySel = document.getElementById('activity_level');
  if (genderSel   && profile.gender)         genderSel.value   = profile.gender;
  if (activitySel && profile.activity_level) activitySel.value = profile.activity_level;

  // Activity radio cards
  const actInput = document.querySelector(`input[name="activity_level"][value="${profile.activity_level}"]`);
  if (actInput) actInput.checked = true;

  // Profile form submit
  initProfileForm(profile);
}

/* ─────────────────────────────────────────
   Profile Form
   ───────────────────────────────────────── */
function initProfileForm(existingProfile) {
  const form      = document.getElementById('profile-form');
  const submitBtn = document.getElementById('profile-save-btn');

  if (!form) return;

  // Auto-calculate BMI when height/weight change
  const heightInput = document.getElementById('height');
  const weightInput = document.getElementById('weight');
  const bmiDisplay  = document.getElementById('bmi-display');

  const updateBMI = () => {
    const h = parseFloat(heightInput?.value);
    const w = parseFloat(weightInput?.value);
    if (h && w && bmiDisplay) {
      const bmi = w / Math.pow(h / 100, 2);
      bmiDisplay.textContent = bmi.toFixed(1);
    }
  };
  heightInput?.addEventListener('input', updateBMI);
  weightInput?.addEventListener('input', updateBMI);
  // Show existing BMI
  if (existingProfile.height && existingProfile.weight && bmiDisplay) {
    const bmi = parseFloat(existingProfile.weight) / Math.pow(parseFloat(existingProfile.height) / 100, 2);
    bmiDisplay.textContent = bmi.toFixed(1);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);

    const updates = {
      name:               fd.get('name')?.trim(),
      age:                parseInt(fd.get('age')) || null,
      gender:             fd.get('gender') || null,
      height:             parseFloat(fd.get('height')) || null,
      weight:             parseFloat(fd.get('weight')) || null,
      goal_weight:        parseFloat(fd.get('goal_weight')) || null,
      activity_level:     fd.get('activity_level') || null,
      daily_calorie_goal: parseInt(fd.get('daily_calorie_goal')) || 2000,
    };

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner spinner-dark"></span> Saving...';

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: currentUser.id, ...updates });

    if (!error) {
      const oldWeight = existingProfile.weight ? parseFloat(existingProfile.weight) : null;
      if (updates.weight && updates.weight !== oldWeight) {
        const today = new Date().toISOString().split('T')[0];
        await supabase.from('weight_logs').insert({
          user_id: currentUser.id,
          weight: updates.weight,
          date: today,
          notes: 'Updated from Profile'
        });
      }
    }

    if (error) {
      showToast('Failed to save profile: ' + error.message, 'error');
    } else {
      showToast('Profile saved successfully! ✅');
      await loadAndRenderProfile();
    }

    submitBtn.disabled = false;
    submitBtn.innerHTML = '💾 Save Profile';
  });
}

/* ─────────────────────────────────────────
   Avatar Upload
   ───────────────────────────────────────── */
function initAvatarUpload() {
  const fileInput    = document.getElementById('avatar-file');
  const uploadTrigger= document.getElementById('avatar-upload-btn');

  uploadTrigger?.addEventListener('click', () => fileInput?.click());

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be under 2MB', 'warning');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'warning');
      return;
    }

    showToast('Uploading avatar...', 'info');

    const ext      = file.name.split('.').pop();
    const fileName = `${currentUser.id}/avatar.${ext}`;

    // Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true, contentType: file.type });

    if (uploadErr) {
      showToast('Upload failed: ' + uploadErr.message, 'error');
      return;
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

    // Save to profile
    const { error: profileErr } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', currentUser.id);

    if (profileErr) {
      showToast('Failed to update avatar in profile', 'error');
    } else {
      showToast('Avatar updated! 🎉');
      await loadAndRenderProfile();
    }

    fileInput.value = '';
  });
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
}

function setField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ─────────────────────────────────────────
   Macro Calculator
   ───────────────────────────────────────── */
function initMacroCalculator() {
  const openBtn = document.getElementById('open-macro-calc-btn');
  const closeBtn = document.getElementById('close-macro-calc-btn');
  const applyBtn = document.getElementById('apply-macro-calc-btn');
  const modal = document.getElementById('macro-calc-modal');
  const resultsDiv = document.getElementById('macro-calc-results');
  
  if (!openBtn || !modal) return;

  let calculatedCalories = 0;

  openBtn.addEventListener('click', () => {
    const age = parseInt(document.getElementById('age').value);
    const genderEl = document.getElementById('gender');
    const genderVal = genderEl ? genderEl.value : 'male';
    const height = parseFloat(document.getElementById('height').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const goalWeight = parseFloat(document.getElementById('goal_weight').value);
    
    const actInput = document.querySelector('input[name="activity_level"]:checked');
    const activity = actInput ? actInput.value : 'sedentary';

    if (!age || !height || !weight || !goalWeight) {
      resultsDiv.innerHTML = '<p style="color:var(--danger-color);">Please fill out your Age, Gender, Height, Current Weight, and Goal Weight first.</p>';
      modal.style.display = 'flex';
      applyBtn.style.display = 'none';
      return;
    }

    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    if (genderVal === 'female') bmr -= 161;
    else bmr += 5;

    let multiplier = 1.2;
    if (activity === 'lightly_active') multiplier = 1.375;
    if (activity === 'moderately_active') multiplier = 1.55;
    if (activity === 'very_active') multiplier = 1.725;
    if (activity === 'extra_active') multiplier = 1.9;

    const tdee = bmr * multiplier;

    let calGoal = tdee;
    let goalText = "Maintain Weight";
    if (goalWeight < weight) {
      calGoal = tdee - 500;
      goalText = "Lose Weight (~0.5kg/week)";
    } else if (goalWeight > weight) {
      calGoal = tdee + 500;
      goalText = "Gain Muscle/Weight (~0.5kg/week)";
    }

    if (genderVal === 'female' && calGoal < 1200) calGoal = 1200;
    if (genderVal !== 'female' && calGoal < 1500) calGoal = 1500;

    calculatedCalories = Math.round(calGoal);
    const protein = Math.round((calculatedCalories * 0.30) / 4);
    const carbs = Math.round((calculatedCalories * 0.45) / 4);
    const fat = Math.round((calculatedCalories * 0.25) / 9);
    const water = Math.round(weight * 35);

    resultsDiv.innerHTML = `
      <div style="background:var(--bg-card-hover); padding:var(--space-3); border-radius:var(--radius-md);">
        <p style="margin-bottom:4px; font-size:var(--fs-sm);"><strong>Goal:</strong> ${goalText}</p>
        <p style="margin-bottom:0; font-size:var(--fs-sm);"><strong>TDEE:</strong> ${Math.round(tdee)} kcal</p>
      </div>
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card-hover); padding:var(--space-3); border-radius:var(--radius-md);">
        <span style="font-size:var(--fs-lg); font-weight:700; color:var(--primary-color);">🔥 Calories</span>
        <span style="font-size:var(--fs-lg); font-weight:700;">${calculatedCalories} kcal</span>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:var(--space-2); text-align:center;">
        <div style="background:var(--bg-card-hover); padding:var(--space-2); border-radius:var(--radius-md);">
          <div style="font-size:var(--fs-sm); color:var(--text-muted);">Protein</div>
          <div style="font-weight:600;">${protein}g</div>
        </div>
        <div style="background:var(--bg-card-hover); padding:var(--space-2); border-radius:var(--radius-md);">
          <div style="font-size:var(--fs-sm); color:var(--text-muted);">Carbs</div>
          <div style="font-weight:600;">${carbs}g</div>
        </div>
        <div style="background:var(--bg-card-hover); padding:var(--space-2); border-radius:var(--radius-md);">
          <div style="font-size:var(--fs-sm); color:var(--text-muted);">Fat</div>
          <div style="font-weight:600;">${fat}g</div>
        </div>
      </div>
      <div style="background:var(--bg-card-hover); padding:var(--space-3); border-radius:var(--radius-md); display:flex; justify-content:space-between;">
        <span><strong>💧 Water Goal:</strong></span>
        <span>${water} ml</span>
      </div>
      <p style="font-size:var(--fs-xs); color:var(--text-muted); margin-top:0;">*Water goal is estimated based on 35ml per kg of body weight.</p>
    `;

    applyBtn.style.display = 'inline-block';
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  applyBtn.addEventListener('click', () => {
    const calInput = document.getElementById('daily_calorie_goal');
    if (calInput) {
      calInput.value = calculatedCalories;
      calInput.style.transition = 'background-color 0.3s';
      calInput.style.backgroundColor = 'rgba(108, 93, 211, 0.2)';
      setTimeout(() => calInput.style.backgroundColor = '', 1000);
    }
    modal.style.display = 'none';
  });
}
