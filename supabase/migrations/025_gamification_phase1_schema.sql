-- ============================================================
-- Phase 1: Gamification Schema
-- XP, Levels, Streaks, Achievements, Chapter Mastery,
-- Daily Targets, Leaderboard Scores
-- ============================================================

-- ── 1. LEVEL DEFINITIONS (static reference) ─────────────────
CREATE TABLE IF NOT EXISTS level_definitions (
  level_id   integer PRIMARY KEY,
  title      text    NOT NULL,
  min_xp     integer NOT NULL,
  badge_icon text    NOT NULL DEFAULT '🏅'
);

INSERT INTO level_definitions (level_id, title, min_xp, badge_icon) VALUES
  (1,  'Beginner',      0,     '🌱'),
  (2,  'Learner',       500,   '📖'),
  (3,  'Explorer',      1500,  '🔍'),
  (4,  'Scholar',       3000,  '🎓'),
  (5,  'Achiever',      6000,  '⭐'),
  (6,  'NEET Warrior',  10000, '⚔️'),
  (7,  'Rank Booster',  15000, '🚀'),
  (8,  'Top Performer', 25000, '🏆'),
  (9,  'Future Doctor', 40000, '🩺'),
  (10, 'NEET Master',   60000, '👑')
ON CONFLICT (level_id) DO NOTHING;

ALTER TABLE level_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "levels_readable_by_all" ON level_definitions;
CREATE POLICY "levels_readable_by_all" ON level_definitions FOR SELECT USING (true);

-- ── 2. ACHIEVEMENT DEFINITIONS (static reference) ────────────
CREATE TABLE IF NOT EXISTS achievement_definitions (
  id             text    PRIMARY KEY,
  title          text    NOT NULL,
  description    text,
  icon           text    NOT NULL DEFAULT '🏅',
  category       text    NOT NULL CHECK (category IN ('practice','accuracy','consistency')),
  xp_reward      integer NOT NULL DEFAULT 0,
  criteria_type  text    NOT NULL,
  criteria_value integer NOT NULL
);

INSERT INTO achievement_definitions (id, title, description, icon, category, xp_reward, criteria_type, criteria_value) VALUES
  -- Practice
  ('first_test',       'First Test Completed', 'Complete your very first quiz',              '🎯', 'practice',    50,   'mcqs_solved',      1),
  ('mcq_100',          '100 MCQs Solved',      'Solve 100 MCQs in total',                   '💯', 'practice',    100,  'mcqs_solved',      100),
  ('mcq_1000',         '1000 MCQs Solved',     'Solve 1000 MCQs in total',                  '🔥', 'practice',    500,  'mcqs_solved',      1000),
  ('mcq_10000',        '10000 MCQs Solved',    'Solve 10000 MCQs — absolute legend',         '🌟', 'practice',    2000, 'mcqs_solved',      10000),
  -- Accuracy
  ('accuracy_80',      '80% Accuracy Club',    'Maintain 80%+ overall accuracy',             '🎯', 'accuracy',    200,  'accuracy',         80),
  ('accuracy_90',      '90% Accuracy Club',    'Maintain 90%+ overall accuracy',             '💎', 'accuracy',    500,  'accuracy',         90),
  ('biology_expert',   'Biology Expert',       'Score 80%+ in Biology (100+ MCQs)',          '🧬', 'accuracy',    300,  'subject_biology',  80),
  ('physics_expert',   'Physics Expert',       'Score 80%+ in Physics (100+ MCQs)',          '⚛️', 'accuracy',    300,  'subject_physics',  80),
  ('chemistry_expert', 'Chemistry Expert',     'Score 80%+ in Chemistry (100+ MCQs)',        '🧪', 'accuracy',    300,  'subject_chemistry',80),
  -- Consistency
  ('streak_3',         '3 Day Streak',         'Practice 3 days in a row',                  '🔥', 'consistency', 50,   'streak',           3),
  ('streak_7',         '7 Day Streak',         'Practice 7 days in a row',                  '🔥', 'consistency', 200,  'streak',           7),
  ('streak_30',        '30 Day Streak',        'Practice 30 days in a row',                 '⚡', 'consistency', 1000, 'streak',           30),
  ('streak_100',       '100 Day Streak',       'Practice 100 days in a row — unstoppable',  '🏆', 'consistency', 5000, 'streak',           100)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "achievements_readable_by_all" ON achievement_definitions;
CREATE POLICY "achievements_readable_by_all" ON achievement_definitions FOR SELECT USING (true);

-- ── 3. USER XP ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp (
  user_id    uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  total_xp   integer     NOT NULL DEFAULT 0,
  today_xp   integer     NOT NULL DEFAULT 0,
  xp_date    date        NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_xp" ON user_xp;
CREATE POLICY "users_own_xp" ON user_xp
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 4. XP TRANSACTIONS LOG ───────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_transactions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  xp_amount    integer     NOT NULL,
  reason       text        NOT NULL,
  reference_id text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_txn_user_date ON xp_transactions (user_id, created_at DESC);

ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_xp_txn" ON xp_transactions;
CREATE POLICY "users_own_xp_txn" ON xp_transactions
  USING (user_id = auth.uid());

-- ── 5. USER STREAKS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id             uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  current_streak      integer     NOT NULL DEFAULT 0,
  longest_streak      integer     NOT NULL DEFAULT 0,
  last_practice_date  date,
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_streaks" ON user_streaks;
CREATE POLICY "users_own_streaks" ON user_streaks
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 6. USER ACHIEVEMENTS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_achievements (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  achievement_id text        NOT NULL REFERENCES achievement_definitions(id),
  unlocked_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_achievements" ON user_achievements;
CREATE POLICY "users_own_achievements" ON user_achievements
  USING (user_id = auth.uid());

-- ── 7. CHAPTER MASTERY ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chapter_mastery (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  chapter_id     text        NOT NULL,
  subject        text        NOT NULL,
  attempts       integer     NOT NULL DEFAULT 0,
  correct        integer     NOT NULL DEFAULT 0,
  accuracy       numeric(5,2)NOT NULL DEFAULT 0,
  mastery_score  integer     NOT NULL DEFAULT 0 CHECK (mastery_score BETWEEN 0 AND 100),
  mastery_level  text        NOT NULL DEFAULT 'novice'
                             CHECK (mastery_level IN ('novice','learner','skilled','advanced','master')),
  last_practiced date,
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_chapter_mastery_user ON chapter_mastery (user_id);

ALTER TABLE chapter_mastery ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_mastery" ON chapter_mastery;
CREATE POLICY "users_own_mastery" ON chapter_mastery
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 8. DAILY TARGETS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS daily_targets (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  target_date         date        NOT NULL DEFAULT CURRENT_DATE,
  target_mcqs         integer     NOT NULL DEFAULT 75,
  completed_mcqs      integer     NOT NULL DEFAULT 0,
  physics_target      integer     NOT NULL DEFAULT 25,
  physics_completed   integer     NOT NULL DEFAULT 0,
  chemistry_target    integer     NOT NULL DEFAULT 25,
  chemistry_completed integer     NOT NULL DEFAULT 0,
  biology_target      integer     NOT NULL DEFAULT 25,
  biology_completed   integer     NOT NULL DEFAULT 0,
  is_completed        boolean     NOT NULL DEFAULT false,
  xp_awarded          boolean     NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, target_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_targets_user_date ON daily_targets (user_id, target_date DESC);

ALTER TABLE daily_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_own_targets" ON daily_targets;
CREATE POLICY "users_own_targets" ON daily_targets
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 9. LEADERBOARD SCORES (cached composite rank) ────────────
CREATE TABLE IF NOT EXISTS leaderboard_scores (
  user_id          uuid        PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name     text,
  total_xp         integer     NOT NULL DEFAULT 0,
  weekly_xp        integer     NOT NULL DEFAULT 0,
  overall_accuracy numeric(5,2)NOT NULL DEFAULT 0,
  current_streak   integer     NOT NULL DEFAULT 0,
  level_id         integer     NOT NULL DEFAULT 1,
  level_title      text        NOT NULL DEFAULT 'Beginner',
  rank_score       integer     NOT NULL DEFAULT 0,
  week_start       date,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_global ON leaderboard_scores (rank_score DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_weekly  ON leaderboard_scores (weekly_xp DESC, week_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_level   ON leaderboard_scores (level_id, rank_score DESC);

ALTER TABLE leaderboard_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leaderboard_readable" ON leaderboard_scores;
DROP POLICY IF EXISTS "leaderboard_own_write" ON leaderboard_scores;
CREATE POLICY "leaderboard_readable"  ON leaderboard_scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "leaderboard_own_write" ON leaderboard_scores
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Get level info from XP value
CREATE OR REPLACE FUNCTION get_level_from_xp(p_xp integer)
RETURNS TABLE (
  level_id   integer,
  title      text,
  badge_icon text,
  min_xp     integer,
  next_xp    integer,
  progress   integer
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    l.level_id,
    l.title,
    l.badge_icon,
    l.min_xp,
    COALESCE(
      (SELECT ld.min_xp FROM level_definitions ld WHERE ld.level_id = l.level_id + 1),
      999999
    ) AS next_xp,
    CASE
      WHEN COALESCE(
             (SELECT ld.min_xp FROM level_definitions ld WHERE ld.level_id = l.level_id + 1),
             999999
           ) = 999999 THEN 100
      ELSE LEAST(100, ROUND(
        (p_xp - l.min_xp) * 100.0 /
        NULLIF(
          COALESCE(
            (SELECT ld.min_xp FROM level_definitions ld WHERE ld.level_id = l.level_id + 1),
            999999
          ) - l.min_xp, 0)
      ))
    END AS progress
  FROM level_definitions l
  WHERE l.min_xp <= p_xp
  ORDER BY l.min_xp DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_level_from_xp TO authenticated, anon;

-- Award XP atomically (upserts user_xp + logs transaction)
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id  uuid,
  p_amount   integer,
  p_reason   text,
  p_ref_id   text DEFAULT NULL
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total integer; BEGIN
  INSERT INTO user_xp (user_id, total_xp, today_xp, xp_date)
  VALUES (p_user_id, p_amount, p_amount, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_xp   = user_xp.total_xp + p_amount,
    today_xp   = CASE
                   WHEN user_xp.xp_date < CURRENT_DATE THEN p_amount
                   ELSE user_xp.today_xp + p_amount
                 END,
    xp_date    = CURRENT_DATE,
    updated_at = now();

  INSERT INTO xp_transactions (user_id, xp_amount, reason, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id);

  SELECT total_xp INTO v_total FROM user_xp WHERE user_id = p_user_id;
  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION award_xp TO authenticated;

-- Update streak; returns new current streak
CREATE OR REPLACE FUNCTION update_streak(p_user_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last    date;
  v_current integer;
  v_longest integer;
BEGIN
  SELECT last_practice_date, current_streak, longest_streak
  INTO v_last, v_current, v_longest
  FROM user_streaks WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_practice_date)
    VALUES (p_user_id, 1, 1, CURRENT_DATE);
    RETURN 1;
  END IF;

  IF v_last = CURRENT_DATE THEN RETURN v_current; END IF;

  v_current := CASE WHEN v_last = CURRENT_DATE - 1 THEN v_current + 1 ELSE 1 END;
  v_longest := GREATEST(v_longest, v_current);

  UPDATE user_streaks SET
    current_streak     = v_current,
    longest_streak     = v_longest,
    last_practice_date = CURRENT_DATE,
    updated_at         = now()
  WHERE user_id = p_user_id;

  RETURN v_current;
END;
$$;

GRANT EXECUTE ON FUNCTION update_streak TO authenticated;

-- Update chapter mastery after a quiz session
CREATE OR REPLACE FUNCTION update_chapter_mastery(
  p_user_id    uuid,
  p_chapter_id text,
  p_subject    text,
  p_correct    integer,
  p_total      integer
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_attempts integer;
  v_correct  integer;
  v_acc      numeric;
  v_score    integer;
  v_level    text;
BEGIN
  INSERT INTO chapter_mastery (user_id, chapter_id, subject, attempts, correct,
    accuracy, last_practiced)
  VALUES (p_user_id, p_chapter_id, p_subject, p_total, p_correct,
    CASE WHEN p_total > 0 THEN ROUND(p_correct * 100.0 / p_total, 2) ELSE 0 END,
    CURRENT_DATE)
  ON CONFLICT (user_id, chapter_id) DO UPDATE SET
    attempts       = chapter_mastery.attempts + p_total,
    correct        = chapter_mastery.correct  + p_correct,
    accuracy       = CASE WHEN (chapter_mastery.attempts + p_total) > 0
                         THEN ROUND((chapter_mastery.correct + p_correct) * 100.0
                              / (chapter_mastery.attempts + p_total), 2)
                         ELSE 0 END,
    last_practiced = CURRENT_DATE,
    updated_at     = now();

  SELECT attempts, correct, accuracy
  INTO v_attempts, v_correct, v_acc
  FROM chapter_mastery WHERE user_id = p_user_id AND chapter_id = p_chapter_id;

  -- Mastery = accuracy × 70% + consistency (attempts toward 200) × 30%
  v_score := LEAST(100, ROUND(v_acc * 0.7 + LEAST(v_attempts / 200.0, 1.0) * 30));

  v_level := CASE
    WHEN v_score <= 20 THEN 'novice'
    WHEN v_score <= 40 THEN 'learner'
    WHEN v_score <= 60 THEN 'skilled'
    WHEN v_score <= 80 THEN 'advanced'
    ELSE 'master'
  END;

  UPDATE chapter_mastery SET mastery_score = v_score, mastery_level = v_level
  WHERE user_id = p_user_id AND chapter_id = p_chapter_id;
END;
$$;

GRANT EXECUTE ON FUNCTION update_chapter_mastery TO authenticated;

-- Get or create today's daily target (auto-sets target based on accuracy)
CREATE OR REPLACE FUNCTION get_or_create_daily_target(p_user_id uuid)
RETURNS daily_targets LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row     daily_targets;
  v_acc     numeric;
  v_target  integer;
  v_phys    integer;
  v_chem    integer;
  v_bio     integer;
BEGIN
  SELECT * INTO v_row FROM daily_targets
  WHERE user_id = p_user_id AND target_date = CURRENT_DATE;
  IF FOUND THEN RETURN v_row; END IF;

  SELECT COALESCE(
    (SELECT ROUND(SUM(correct) * 100.0 / NULLIF(SUM(attempts), 0), 2)
     FROM chapter_mastery WHERE user_id = p_user_id), 0)
  INTO v_acc;

  IF v_acc > 80 THEN
    v_target := 150; v_phys := 50; v_chem := 50; v_bio := 50;
  ELSIF v_acc >= 60 THEN
    v_target := 100; v_phys := 34; v_chem := 33; v_bio := 33;
  ELSE
    v_target := 75; v_phys := 25; v_chem := 25; v_bio := 25;
  END IF;

  INSERT INTO daily_targets (user_id, target_date, target_mcqs,
    physics_target, chemistry_target, biology_target)
  VALUES (p_user_id, CURRENT_DATE, v_target, v_phys, v_chem, v_bio)
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_daily_target TO authenticated;

-- Refresh leaderboard_scores for one user (call after XP/streak/accuracy changes)
CREATE OR REPLACE FUNCTION refresh_leaderboard_score(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_name    text;
  v_xp      integer;
  v_wacc    numeric;
  v_streak  integer;
  v_level   integer;
  v_ltitle  text;
  v_wxp     integer;
  v_score   integer;
BEGIN
  SELECT COALESCE(up.display_name, au.email)
  INTO v_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = p_user_id;

  SELECT COALESCE(total_xp, 0) INTO v_xp FROM user_xp WHERE user_id = p_user_id;

  SELECT COALESCE(
    (SELECT ROUND(SUM(correct) * 100.0 / NULLIF(SUM(attempts), 0), 2)
     FROM chapter_mastery WHERE user_id = p_user_id), 0)
  INTO v_wacc;

  SELECT COALESCE(current_streak, 0) INTO v_streak
  FROM user_streaks WHERE user_id = p_user_id;

  SELECT l.level_id, l.title INTO v_level, v_ltitle
  FROM level_definitions l WHERE l.min_xp <= v_xp ORDER BY l.min_xp DESC LIMIT 1;

  -- Weekly XP = XP earned since last Monday
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_wxp
  FROM xp_transactions
  WHERE user_id = p_user_id
    AND created_at >= date_trunc('week', CURRENT_DATE);

  -- Rank score = total_xp + accuracy*10 + streak*50
  v_score := v_xp + ROUND(v_wacc * 10) + (v_streak * 50);

  INSERT INTO leaderboard_scores
    (user_id, display_name, total_xp, weekly_xp, overall_accuracy,
     current_streak, level_id, level_title, rank_score, week_start)
  VALUES
    (p_user_id, v_name, v_xp, v_wxp, v_wacc,
     v_streak, COALESCE(v_level,1), COALESCE(v_ltitle,'Beginner'), v_score,
     date_trunc('week', CURRENT_DATE)::date)
  ON CONFLICT (user_id) DO UPDATE SET
    display_name     = EXCLUDED.display_name,
    total_xp         = EXCLUDED.total_xp,
    weekly_xp        = EXCLUDED.weekly_xp,
    overall_accuracy = EXCLUDED.overall_accuracy,
    current_streak   = EXCLUDED.current_streak,
    level_id         = EXCLUDED.level_id,
    level_title      = EXCLUDED.level_title,
    rank_score       = EXCLUDED.rank_score,
    week_start       = EXCLUDED.week_start,
    updated_at       = now();
END;
$$;

GRANT EXECUTE ON FUNCTION refresh_leaderboard_score TO authenticated;

-- Check and unlock achievements for a user; returns newly unlocked achievement IDs
CREATE OR REPLACE FUNCTION check_achievements(p_user_id uuid)
RETURNS TABLE (achievement_id text, title text, icon text, xp_reward integer)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_mcqs  integer;
  v_accuracy    numeric;
  v_streak      integer;
  v_bio_acc     numeric;
  v_bio_att     integer;
  v_phy_acc     numeric;
  v_phy_att     integer;
  v_chem_acc    numeric;
  v_chem_att    integer;
  r             achievement_definitions%ROWTYPE;
  v_unlocked    boolean;
  v_xp_total    integer := 0;
BEGIN
  -- Gather stats
  SELECT COALESCE(SUM(attempts),0), COALESCE(SUM(correct),0)
  INTO v_total_mcqs, v_total_mcqs  -- reuse var; refine below
  FROM chapter_mastery WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(attempts),0) INTO v_total_mcqs
  FROM chapter_mastery WHERE user_id = p_user_id;

  SELECT COALESCE(ROUND(SUM(correct)*100.0/NULLIF(SUM(attempts),0),2), 0)
  INTO v_accuracy FROM chapter_mastery WHERE user_id = p_user_id;

  SELECT COALESCE(current_streak,0) INTO v_streak
  FROM user_streaks WHERE user_id = p_user_id;

  SELECT COALESCE(ROUND(SUM(correct)*100.0/NULLIF(SUM(attempts),0),2),0),
         COALESCE(SUM(attempts),0)
  INTO v_bio_acc, v_bio_att
  FROM chapter_mastery WHERE user_id = p_user_id AND subject = 'Biology';

  SELECT COALESCE(ROUND(SUM(correct)*100.0/NULLIF(SUM(attempts),0),2),0),
         COALESCE(SUM(attempts),0)
  INTO v_phy_acc, v_phy_att
  FROM chapter_mastery WHERE user_id = p_user_id AND subject = 'Physics';

  SELECT COALESCE(ROUND(SUM(correct)*100.0/NULLIF(SUM(attempts),0),2),0),
         COALESCE(SUM(attempts),0)
  INTO v_chem_acc, v_chem_att
  FROM chapter_mastery WHERE user_id = p_user_id AND subject = 'Chemistry';

  -- Check each definition
  FOR r IN SELECT * FROM achievement_definitions LOOP
    -- Skip already unlocked
    IF EXISTS (
      SELECT 1 FROM user_achievements
      WHERE user_id = p_user_id AND achievement_id = r.id
    ) THEN CONTINUE; END IF;

    v_unlocked := CASE r.criteria_type
      WHEN 'mcqs_solved'      THEN v_total_mcqs   >= r.criteria_value
      WHEN 'accuracy'         THEN v_accuracy      >= r.criteria_value
      WHEN 'streak'           THEN v_streak        >= r.criteria_value
      WHEN 'subject_biology'  THEN v_bio_acc       >= r.criteria_value AND v_bio_att  >= 100
      WHEN 'subject_physics'  THEN v_phy_acc       >= r.criteria_value AND v_phy_att  >= 100
      WHEN 'subject_chemistry'THEN v_chem_acc      >= r.criteria_value AND v_chem_att >= 100
      ELSE false
    END;

    IF v_unlocked THEN
      INSERT INTO user_achievements (user_id, achievement_id)
      VALUES (p_user_id, r.id)
      ON CONFLICT DO NOTHING;

      -- Award achievement XP
      IF r.xp_reward > 0 THEN
        PERFORM award_xp(p_user_id, r.xp_reward, 'achievement', r.id);
      END IF;

      achievement_id := r.id;
      title          := r.title;
      icon           := r.icon;
      xp_reward      := r.xp_reward;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_achievements TO authenticated;
