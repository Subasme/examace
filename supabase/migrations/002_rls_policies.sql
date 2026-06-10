-- ExamAce — Row Level Security policies
-- Run after 001_initial_schema.sql

-- ── chapters (public read, no write from client) ────────────────────────────
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Chapters are publicly readable" ON chapters;
CREATE POLICY "Chapters are publicly readable"
  ON chapters FOR SELECT USING (true);

-- ── questions (public read, no write from client) ────────────────────────────
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Questions are publicly readable" ON questions;
CREATE POLICY "Questions are publicly readable"
  ON questions FOR SELECT USING (true);

-- ── profiles ─────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON profiles;
CREATE POLICY "Users view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- ── user_progress ─────────────────────────────────────────────────────────────
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own progress" ON user_progress;
CREATE POLICY "Users manage own progress"
  ON user_progress FOR ALL USING (auth.uid() = user_id);

-- ── mistakes ─────────────────────────────────────────────────────────────────
ALTER TABLE mistakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own mistakes" ON mistakes;
CREATE POLICY "Users manage own mistakes"
  ON mistakes FOR ALL USING (auth.uid() = user_id);

-- ── leaderboard ──────────────────────────────────────────────────────────────
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leaderboard is publicly readable" ON leaderboard;
CREATE POLICY "Leaderboard is publicly readable"
  ON leaderboard FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert own scores" ON leaderboard;
CREATE POLICY "Authenticated users can insert own scores"
  ON leaderboard FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- ── daily_practice ────────────────────────────────────────────────────────────
ALTER TABLE daily_practice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own daily practice" ON daily_practice;
CREATE POLICY "Users manage own daily practice"
  ON daily_practice FOR ALL USING (auth.uid() = user_id);
