/* ============================================================
   NutriTrack — Landing Page Logic
   js/main.js
   ============================================================ */
import { supabase } from './supabase.js';

/* ─────────────────────────────────────────
   Navbar scroll effect
   ───────────────────────────────────────── */
const nav = document.querySelector('.landing-nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}

/* ─────────────────────────────────────────
   Mobile Menu Toggle
   ───────────────────────────────────────── */
const mobileToggle = document.getElementById('mobile-toggle');
const mobileMenu   = document.getElementById('mobile-menu');
if (mobileToggle && mobileMenu) {
  mobileToggle.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    mobileToggle.setAttribute('aria-expanded', open);
    mobileToggle.textContent = open ? '✕' : '☰';
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!mobileMenu.contains(e.target) && !mobileToggle.contains(e.target)) {
      mobileMenu.classList.remove('open');
      mobileToggle.textContent = '☰';
    }
  });
}

/* ─────────────────────────────────────────
   FAQ Accordion
   ───────────────────────────────────────── */
document.querySelectorAll('.faq-item').forEach(item => {
  const btn = item.querySelector('.faq-question');
  btn?.addEventListener('click', () => {
    const isOpen = item.classList.contains('open');
    // Close all
    document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
    // Open clicked (if it wasn't already open)
    if (!isOpen) item.classList.add('open');
  });
});

/* ─────────────────────────────────────────
   Smooth Scroll for anchor links
   ───────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = 80;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      // Close mobile menu
      mobileMenu?.classList.remove('open');
    }
  });
});

/* ─────────────────────────────────────────
   Intersection Observer — Scroll Animations
   ───────────────────────────────────────── */
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-slide-up');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

document.querySelectorAll(
  '.feature-card, .testimonial-card, .how-step, .faq-item, .hero-stat-item'
).forEach((el, i) => {
  el.style.opacity = '0';
  el.style.animationDelay = `${i * 0.08}s`;
  observer.observe(el);
});

/* ─────────────────────────────────────────
   If user is already logged in → show "Go to Dashboard" in nav
   ───────────────────────────────────────── */
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    const loginBtn  = document.getElementById('nav-login');
    const signupBtn = document.getElementById('nav-signup');
    const dashBtn   = document.getElementById('nav-dashboard');
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (signupBtn) signupBtn.style.display = 'none';
    if (dashBtn)   dashBtn.style.display   = 'inline-flex';
  }
})();

/* ─────────────────────────────────────────
   Counter Animation for hero stats
   ───────────────────────────────────────── */
function animateCounter(el, target, suffix = '') {
  const duration = 2000;
  const start    = performance.now();
  const update   = (time) => {
    const progress = Math.min((time - start) / duration, 1);
    const eased    = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(eased * target).toLocaleString() + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el     = entry.target;
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      animateCounter(el, target, suffix);
      statsObserver.unobserve(el);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('[data-target]').forEach(el => {
  statsObserver.observe(el);
});

/* ─────────────────────────────────────────
   Theme init (respect saved preference)
   ───────────────────────────────────────── */
const savedTheme = localStorage.getItem('nt_theme');
if (savedTheme === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark');
}
