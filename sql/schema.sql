-- ============================================================
-- NutriTrack — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ─────────────────────────────────────────
-- EXTENSIONS
-- ─────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────
-- TABLE: profiles
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT,
  age                 INTEGER CHECK (age > 0 AND age < 150),
  gender              TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  height              NUMERIC(5,2),          -- cm
  weight              NUMERIC(5,2),          -- kg
  goal_weight         NUMERIC(5,2),          -- kg
  activity_level      TEXT CHECK (activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active')),
  daily_calorie_goal  INTEGER DEFAULT 2000,
  avatar_url          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: meals
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.meals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_name   TEXT NOT NULL,
  meal_type   TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  calories    NUMERIC(7,2) DEFAULT 0,
  protein     NUMERIC(7,2) DEFAULT 0,  -- grams
  carbs       NUMERIC(7,2) DEFAULT 0,  -- grams
  fat         NUMERIC(7,2) DEFAULT 0,  -- grams
  serving     TEXT DEFAULT '1 serving',
  meal_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_time   TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: water_logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.water_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount      NUMERIC(6,2) NOT NULL,   -- ml
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- TABLE: weight_logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight      NUMERIC(5,2) NOT NULL,   -- kg
  date        DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────
-- INDEXES (performance)
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_meals_user_date       ON public.meals(user_id, meal_date DESC);
CREATE INDEX IF NOT EXISTS idx_meals_user_type       ON public.meals(user_id, meal_type);
CREATE INDEX IF NOT EXISTS idx_water_logs_user_date  ON public.water_logs(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_logs_user_date ON public.weight_logs(user_id, date DESC);

-- ─────────────────────────────────────────
-- TRIGGER: auto-create profile on signup
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, daily_calorie_goal)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    2000
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─────────────────────────────────────────
-- TRIGGER: auto-update updated_at on profiles
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ─────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "Users can view own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- meals policies
DROP POLICY IF EXISTS "Users can view own meals"   ON public.meals;
DROP POLICY IF EXISTS "Users can insert own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can update own meals" ON public.meals;
DROP POLICY IF EXISTS "Users can delete own meals" ON public.meals;

CREATE POLICY "Users can view own meals"
  ON public.meals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own meals"
  ON public.meals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meals"
  ON public.meals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meals"
  ON public.meals FOR DELETE
  USING (auth.uid() = user_id);

-- water_logs policies
DROP POLICY IF EXISTS "Users can view own water logs"   ON public.water_logs;
DROP POLICY IF EXISTS "Users can insert own water logs" ON public.water_logs;
DROP POLICY IF EXISTS "Users can delete own water logs" ON public.water_logs;

CREATE POLICY "Users can view own water logs"
  ON public.water_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water logs"
  ON public.water_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own water logs"
  ON public.water_logs FOR DELETE
  USING (auth.uid() = user_id);

-- weight_logs policies
DROP POLICY IF EXISTS "Users can view own weight logs"   ON public.weight_logs;
DROP POLICY IF EXISTS "Users can insert own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can update own weight logs" ON public.weight_logs;
DROP POLICY IF EXISTS "Users can delete own weight logs" ON public.weight_logs;

CREATE POLICY "Users can view own weight logs"
  ON public.weight_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight logs"
  ON public.weight_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weight logs"
  ON public.weight_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight logs"
  ON public.weight_logs FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STORAGE: avatars bucket
-- Run this AFTER creating bucket "avatars" (public) in Supabase dashboard
-- ─────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar"           ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar"           ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar"           ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ─────────────────────────────────────────
-- VIEWS (helper for dashboard queries)
-- ─────────────────────────────────────────
CREATE OR REPLACE VIEW public.daily_meal_summary AS
SELECT
  user_id,
  meal_date,
  SUM(calories) AS total_calories,
  SUM(protein)  AS total_protein,
  SUM(carbs)    AS total_carbs,
  SUM(fat)      AS total_fat,
  COUNT(*)      AS meal_count
FROM public.meals
GROUP BY user_id, meal_date;

CREATE OR REPLACE VIEW public.daily_water_summary AS
SELECT
  user_id,
  date,
  SUM(amount) AS total_ml
FROM public.water_logs
GROUP BY user_id, date;

-- Grant access to views
ALTER VIEW public.daily_meal_summary  OWNER TO postgres;
ALTER VIEW public.daily_water_summary OWNER TO postgres;

GRANT SELECT ON public.daily_meal_summary  TO authenticated;
GRANT SELECT ON public.daily_water_summary TO authenticated;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
