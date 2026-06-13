-- Migration: Normalize schema for NEET platform
-- Run in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)

-- ── 1. Language lookup ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS languages (
  id   SMALLINT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);
INSERT INTO languages (id, name) VALUES (1,'English'),(2,'Tamil')
  ON CONFLICT (id) DO NOTHING;

-- ── 2. Subjects lookup ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id      SERIAL PRIMARY KEY,
  name    TEXT NOT NULL,
  standard TEXT NOT NULL DEFAULT '12th',
  UNIQUE (name, standard)
);
INSERT INTO subjects (name, standard)
  SELECT DISTINCT subject, standard FROM chapters
  ON CONFLICT (name, standard) DO NOTHING;

-- ── 3. Add correct_option (A/B/C/D) to questions ────────────────────────────
ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_option TEXT
  CHECK (correct_option IN ('A','B','C','D'));

UPDATE questions
   SET correct_option = CASE correct
     WHEN 0 THEN 'A' WHEN 1 THEN 'B' WHEN 2 THEN 'C' WHEN 3 THEN 'D'
   END
 WHERE correct_option IS NULL AND correct BETWEEN 0 AND 3;

-- ── 4. question_translations (one row per question per language) ──────────────
CREATE TABLE IF NOT EXISTS question_translations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  lang_id      SMALLINT NOT NULL REFERENCES languages(id),
  question_text TEXT NOT NULL,
  explanation   TEXT DEFAULT '',
  UNIQUE (question_id, lang_id)
);

-- Migrate existing English questions → lang_id 1
INSERT INTO question_translations (question_id, lang_id, question_text, explanation)
  SELECT q.id, 1,
    TRIM(SPLIT_PART(q.question,    ' | ', 1)),
    TRIM(SPLIT_PART(q.explanation, ' | ', 1))
  FROM questions q
  WHERE q.language = 'English'
  ON CONFLICT (question_id, lang_id) DO NOTHING;

-- Migrate existing Tamil questions → lang_id 2
INSERT INTO question_translations (question_id, lang_id, question_text, explanation)
  SELECT q.id, 2,
    TRIM(SPLIT_PART(q.question,    ' | ', 1)),
    TRIM(SPLIT_PART(q.explanation, ' | ', 1))
  FROM questions q
  WHERE q.language = 'Tamil'
  ON CONFLICT (question_id, lang_id) DO NOTHING;

-- ── 5. options (one row per option per question per language) ─────────────────
CREATE TABLE IF NOT EXISTS options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  lang_id     SMALLINT NOT NULL REFERENCES languages(id),
  option_key  TEXT NOT NULL CHECK (option_key IN ('A','B','C','D')),
  option_text TEXT NOT NULL,
  UNIQUE (question_id, lang_id, option_key)
);

-- Migrate from JSONB options array [A,B,C,D]
INSERT INTO options (question_id, lang_id, option_key, option_text)
  SELECT q.id,
    CASE q.language WHEN 'English' THEN 1 ELSE 2 END,
    unnest(ARRAY['A','B','C','D']),
    unnest(ARRAY[
      q.options->>0, q.options->>1, q.options->>2, q.options->>3
    ])
  FROM questions q
  WHERE q.options IS NOT NULL AND jsonb_array_length(q.options) = 4
  ON CONFLICT (question_id, lang_id, option_key) DO NOTHING;

-- ── 6. question_tag_master ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_tag_master (
  id       SERIAL PRIMARY KEY,
  tag_code TEXT NOT NULL UNIQUE,  -- e.g. 12PHYCH01
  standard TEXT NOT NULL,
  subject  TEXT NOT NULL,
  chapter_id TEXT NOT NULL
);
INSERT INTO question_tag_master (tag_code, standard, subject, chapter_id)
  SELECT DISTINCT chapter_tag, standard, subject, chapter_id
  FROM chapters WHERE chapter_tag IS NOT NULL
  ON CONFLICT (tag_code) DO NOTHING;

-- ── 7. question_tag_map ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_tag_map (
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  tag_id       INT  NOT NULL REFERENCES question_tag_master(id),
  sequence_num INT  NOT NULL,
  PRIMARY KEY (question_id, tag_id)
);
INSERT INTO question_tag_map (question_id, tag_id, sequence_num)
  SELECT q.id, t.id,
    CAST(REGEXP_REPLACE(q.question_tag, '^.*Q0*', '') AS INT)
  FROM questions q
  JOIN question_tag_master t
    ON t.standard  = q.standard
   AND t.subject   = q.subject
   AND t.chapter_id = q.chapter_id
  WHERE q.question_tag IS NOT NULL
  ON CONFLICT (question_id, tag_id) DO NOTHING;

-- ── 8. user_profiles (extended, replaces old profiles) ───────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  plan            TEXT DEFAULT 'free' CHECK (plan IN ('free','premium','unlimited')),
  plan_expires_at TIMESTAMPTZ,
  lang_id         SMALLINT DEFAULT 1 REFERENCES languages(id),
  standard        TEXT DEFAULT '12th',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);
-- Copy existing profiles
INSERT INTO user_profiles (id, display_name, plan, plan_expires_at, created_at, updated_at)
  SELECT id, display_name, plan, plan_expires_at, created_at, updated_at
  FROM profiles
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_profiles_self" ON user_profiles;
CREATE POLICY "user_profiles_self" ON user_profiles
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
GRANT SELECT,INSERT,UPDATE ON user_profiles TO authenticated;

-- ── 9. exam_sessions ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode         TEXT NOT NULL CHECK (mode IN ('practice','timed','grand','challenge','weakareas')),
  language     TEXT NOT NULL,
  standard     TEXT NOT NULL,
  subject      TEXT,
  chapter_id   TEXT,
  started_at   TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  total_q      INT DEFAULT 0,
  correct_q    INT DEFAULT 0,
  wrong_q      INT DEFAULT 0,
  skipped_q    INT DEFAULT 0,
  neet_score   INT DEFAULT 0,   -- +4 correct, -1 wrong, 0 skip
  time_taken   INT DEFAULT 0    -- seconds
);
CREATE INDEX IF NOT EXISTS exam_sessions_user_idx ON exam_sessions(user_id, started_at DESC);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "exam_sessions_self" ON exam_sessions;
CREATE POLICY "exam_sessions_self" ON exam_sessions
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT,INSERT,UPDATE ON exam_sessions TO authenticated;

-- ── 10. question_responses ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id),
  selected_option TEXT CHECK (selected_option IN ('A','B','C','D')),  -- NULL = skipped
  is_correct      BOOL,
  neet_score      INT NOT NULL DEFAULT 0,  -- +4/-1/0
  time_taken      INT DEFAULT 0            -- seconds on this question
);
CREATE INDEX IF NOT EXISTS qr_session_idx ON question_responses(session_id);

ALTER TABLE question_responses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qr_via_session" ON question_responses;
CREATE POLICY "qr_via_session" ON question_responses
  USING (EXISTS (SELECT 1 FROM exam_sessions s WHERE s.id=session_id AND s.user_id=auth.uid()));
GRANT SELECT,INSERT ON question_responses TO authenticated;

-- ── 11. wrong_answer_tracker ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wrong_answer_tracker (
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  times_wrong   INT DEFAULT 1,
  last_wrong_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS wat_user_idx ON wrong_answer_tracker(user_id, last_wrong_at DESC);

ALTER TABLE wrong_answer_tracker ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "wat_self" ON wrong_answer_tracker;
CREATE POLICY "wat_self" ON wrong_answer_tracker
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT,INSERT,UPDATE ON wrong_answer_tracker TO authenticated;

-- ── 12. topic_performance ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_performance (
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  standard   TEXT NOT NULL DEFAULT '12th',
  total      INT DEFAULT 0,
  correct    INT DEFAULT 0,
  neet_score INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, subject, chapter_id, standard)
);

ALTER TABLE topic_performance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tp_self" ON topic_performance;
CREATE POLICY "tp_self" ON topic_performance
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
GRANT SELECT,INSERT,UPDATE ON topic_performance TO authenticated;

-- ── 13. previous_year_papers ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS previous_year_papers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  year        INT NOT NULL,
  exam_name   TEXT DEFAULT 'NEET UG',
  UNIQUE (question_id, year)
);
GRANT SELECT ON previous_year_papers TO anon, authenticated;

-- ── 14. question_edits (audit log) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_edits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id   UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  edited_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  field_changed TEXT NOT NULL,
  old_value     TEXT,
  new_value     TEXT,
  edited_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS qe_question_idx ON question_edits(question_id, edited_at DESC);
GRANT INSERT ON question_edits TO authenticated;

-- ── 15. Public read grants ────────────────────────────────────────────────────
ALTER TABLE question_translations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qt_public_read" ON question_translations;
CREATE POLICY "qt_public_read" ON question_translations FOR SELECT USING (true);

ALTER TABLE options ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "options_public_read" ON options;
CREATE POLICY "options_public_read" ON options FOR SELECT USING (true);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subjects_public_read" ON subjects;
CREATE POLICY "subjects_public_read" ON subjects FOR SELECT USING (true);

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "languages_public_read" ON languages;
CREATE POLICY "languages_public_read" ON languages FOR SELECT USING (true);

GRANT SELECT ON languages, subjects, question_translations, options,
               question_tag_master, question_tag_map, previous_year_papers
  TO anon, authenticated;
GRANT SELECT,INSERT ON exam_sessions, question_responses TO authenticated;
GRANT SELECT,INSERT,UPDATE ON wrong_answer_tracker, topic_performance TO authenticated;
