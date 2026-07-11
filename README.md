# 🥗 NutriTrack — Premium Calorie Tracker

A **production-ready, full-stack calorie tracking SaaS** built with vanilla HTML/CSS/JavaScript + Supabase + Vercel.

![NutriTrack](https://img.shields.io/badge/NutriTrack-v1.0.0-4F46E5?style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel)

---

## ✨ Features

- 🍽️ **Meal Tracker** — Log meals with full macro breakdown (calories, protein, carbs, fat)
- 💧 **Water Tracker** — SVG ring progress, quick-add buttons, daily logs
- ⚖️ **Weight Tracker** — History table, BMI calculator, progress charts
- 📊 **Dashboard** — Weekly/monthly calorie charts, macro doughnut, stat cards
- 👤 **User Profile** — Avatar upload, body metrics, activity level, calorie goals
- ⚙️ **Settings** — Dark mode, notification toggles, data reset
- 🔒 **Auth** — Supabase email auth, Google OAuth ready, Row-Level Security

---

## 🎨 Design

| Property | Value |
|---|---|
| Style | Glassmorphism, Modern SaaS |
| Primary Color | `#4F46E5` |
| Font | Poppins (Google Fonts) |
| Responsive | Mobile-first (320px → 1440px+) |
| Dark Mode | CSS custom properties + localStorage |

---

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/nutritrack.git
cd nutritrack
```

### 2. Configure Supabase
Open `js/supabase.js` and add your credentials:
```js
const SUPABASE_URL      = 'https://YOUR_PROJECT_REF.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

### 3. Run the database schema
Copy the contents of `sql/schema.sql` and run it in your **Supabase SQL Editor**.

### 4. Create Storage bucket
In Supabase → Storage → create a **public** bucket named `avatars`.

### 5. Deploy to Vercel
```bash
npx vercel
```
Or drag-and-drop to [vercel.com/new](https://vercel.com/new).

---

## 📁 Project Structure

```
/
├── index.html          # Landing page
├── login.html          # Login
├── signup.html         # Signup
├── forgot.html         # Forgot password
├── dashboard.html      # Main dashboard
├── meals.html          # Meal tracker
├── water.html          # Water tracker
├── weight.html         # Weight tracker
├── profile.html        # User profile
├── settings.html       # App settings
├── vercel.json         # Vercel config
│
├── css/
│   ├── style.css       # Global + landing styles
│   ├── auth.css        # Auth page styles
│   ├── dashboard.css   # App/dashboard styles
│   └── responsive.css  # Responsive breakpoints
│
├── js/
│   ├── supabase.js     # ⚠️ Add your keys here
│   ├── auth.js         # Authentication logic
│   ├── main.js         # Landing page
│   ├── dashboard.js    # Dashboard data & charts
│   ├── meals.js        # Meal CRUD
│   ├── water.js        # Water tracker
│   ├── weight.js       # Weight tracker
│   ├── charts.js       # Chart.js wrappers
│   ├── profile.js      # Profile management
│   └── settings.js     # Settings & dark mode
│
└── sql/
    └── schema.sql      # Full DB schema + RLS + triggers
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES6 Modules) |
| Backend | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Email + Google OAuth) |
| Storage | Supabase Storage (avatars) |
| Charts | Chart.js v4 |
| Deployment | Vercel |

---

## ⚠️ Important

> **Never commit your Supabase keys to Git.**  
> The `js/supabase.js` file contains placeholder values — replace them locally but do not push your real keys.  
> Use **Vercel Environment Variables** for production keys instead.

---

## 📄 License

MIT © 2025 NutriTrack
