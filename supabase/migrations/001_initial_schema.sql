-- ExamAce — initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Question catalog (one row per chapter) ──────────────────────────────────
CREATE TABLE IF NOT EXISTS chapters (
  language        TEXT NOT NULL,
  standard        TEXT NOT NULL,
  subject         TEXT NOT NULL,
  chapter_id      TEXT NOT NULL,
  chapter_label   TEXT NOT NULL,
  question_count  INTEGER DEFAULT 0,
  PRIMARY KEY (language, standard, subject, chapter_id)
);

-- ── Questions content ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language      TEXT NOT NULL,
  standard      TEXT NOT NULL,
  subject       TEXT NOT NULL,
  chapter_id    TEXT NOT NULL,
  chapter_label TEXT NOT NULL,
  topic         TEXT,
  question      TEXT NOT NULL,
  options       JSONB NOT NULL,
  correct       INTEGER NOT NULL CHECK (correct BETWEEN 0 AND 3),
  explanation   TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_filter_idx
  ON questions (language, standard, subject, chapter_id);

-- ── User profiles (extends Supabase auth.users) ──────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  plan            TEXT DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  plan_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── User progress stats ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  user_id     UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total       INTEGER DEFAULT 0,
  correct     INTEGER DEFAULT 0,
  wrong       INTEGER DEFAULT 0,
  time_spent  INTEGER DEFAULT 0,
  subjects    JSONB DEFAULT '{}',
  chapters    JSONB DEFAULT '{}',
  history     JSONB DEFAULT '[]',
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Wrong-answer log ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mistakes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  correct     INTEGER NOT NULL CHECK (correct BETWEEN 0 AND 3),
  explanation TEXT DEFAULT '',
  subject     TEXT DEFAULT '',
  chapter     TEXT DEFAULT '',
  your_answer INTEGER NOT NULL CHECK (your_answer BETWEEN 0 AND 3),
  answered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mistakes_user_idx
  ON mistakes (user_id, answered_at DESC);

-- ── Global leaderboard ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  score           INTEGER NOT NULL,
  correct         INTEGER NOT NULL,
  total           INTEGER NOT NULL,
  time_taken      INTEGER NOT NULL,
  subject         TEXT DEFAULT '',
  language        TEXT DEFAULT '',
  standard        TEXT DEFAULT '',
  week_key        TEXT NOT NULL,
  selection_label TEXT DEFAULT '',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leaderboard_week_idx
  ON leaderboard (week_key, score DESC, time_taken ASC);

-- ── Daily practice tracking ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_practice (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language            TEXT NOT NULL,
  standard            TEXT NOT NULL,
  subject             TEXT NOT NULL,
  chapter_id          TEXT NOT NULL,
  practice_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  count               INTEGER DEFAULT 0,
  seen_fingerprints   TEXT[] DEFAULT '{}',
  UNIQUE (user_id, language, standard, subject, chapter_id, practice_date)
);

CREATE INDEX IF NOT EXISTS daily_practice_user_date_idx
  ON daily_practice (user_id, practice_date);

-- ── Auto-create profile on new user signup ───────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
