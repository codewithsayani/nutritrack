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

  const name    = profile.name || currentUser.email?.split('@')[0] || 'User';
  const initial = name[0]?.toUpperCase() || 'U';

  nameEls.forEach(el  => el.textContent = name);
  initEls.forEach(el  => el.textContent = initial);
  if (emailEl) emailEl.textContent = currentUser.email || '';

  if (profile.avatar_url && headerAvatar) {
    headerAvatar.innerHTML = `<img src="${profile.avatar_url}" alt="${name}" loading="lazy">`;
  } else if (headerAvatar) {
    headerAvatar.textContent = initial;
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
