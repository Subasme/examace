-- ── 1. Daily Quizzes ──
CREATE TABLE IF NOT EXISTS daily_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  standard TEXT NOT NULL DEFAULT '12th',
  subject TEXT NOT NULL DEFAULT 'Physics',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dq_date_subject_std UNIQUE (publish_date, subject, standard)
);

CREATE INDEX IF NOT EXISTS idx_dq_publish_date ON daily_quizzes(publish_date DESC);

-- ── 2. Daily Quiz Questions ──
CREATE TABLE IF NOT EXISTS daily_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_quiz_id UUID NOT NULL REFERENCES daily_quizzes(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  sequence_num INT NOT NULL,
  points INT NOT NULL DEFAULT 4,
  CONSTRAINT uq_dqq_quiz_question UNIQUE (daily_quiz_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_dqq_quiz_id ON daily_quiz_questions(daily_quiz_id, sequence_num);

-- ── 3. Daily Quiz Attempts ──
CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_quiz_id UUID NOT NULL REFERENCES daily_quizzes(id) ON DELETE RESTRICT,
  attempt_number INT NOT NULL DEFAULT 1,
  score INT NOT NULL,
  correct_count INT NOT NULL,
  wrong_count INT NOT NULL,
  time_taken INT NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_dqa_user_quiz_attempt UNIQUE (user_id, daily_quiz_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS idx_dqa_user_quiz ON daily_quiz_attempts(user_id, daily_quiz_id, attempt_number);

-- ── 4. Flashcards ──
CREATE TABLE IF NOT EXISTS flashcards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  chapter_id TEXT NOT NULL,
  front_text TEXT NOT NULL,
  back_text TEXT NOT NULL,
  front_image_url TEXT,
  back_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fc_subj_chap ON flashcards(subject, chapter_id);

-- ── 5. User Flashcard Progress (SM-2 Spaced Repetition) ──
CREATE TABLE IF NOT EXISTS user_flashcard_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE,
  box_number INT NOT NULL DEFAULT 1,
  easiness_factor NUMERIC(4,2) NOT NULL DEFAULT 2.50,
  repetitions INT NOT NULL DEFAULT 0,
  interval_days INT NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_reviewed_at TIMESTAMPTZ,
  CONSTRAINT uq_ufp_user_card UNIQUE (user_id, flashcard_id)
);

CREATE INDEX IF NOT EXISTS idx_ufp_user_review ON user_flashcard_progress(user_id, next_review_at);

-- ── 6. Google Sheets Sync Logs ──
CREATE TABLE IF NOT EXISTS google_sheets_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  record_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'synced', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  error_msg TEXT,
  synced_at TIMESTAMPTZ,
  CONSTRAINT uq_gsl_record UNIQUE (record_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_gsl_pending ON google_sheets_sync_logs(status) WHERE status = 'failed' OR status = 'pending';

-- ── 7. Email Queue ──
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  template_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_msg TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_eq_pending ON email_queue(status) WHERE status = 'pending';

-- ── 8. Row Level Security (RLS) ──
ALTER TABLE daily_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flashcard_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_sheets_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- 8.1 Daily Quizzes & Questions RLS (Read for all auth, Write for admin only)
CREATE POLICY "Public read daily_quizzes" ON daily_quizzes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write daily_quizzes" ON daily_quizzes FOR ALL TO authenticated USING (auth.jwt()->>'email' = 'karnanphysics2026@gmail.com');

CREATE POLICY "Public read daily_quiz_questions" ON daily_quiz_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write daily_quiz_questions" ON daily_quiz_questions FOR ALL TO authenticated USING (auth.jwt()->>'email' = 'karnanphysics2026@gmail.com');

-- 8.2 Daily Quiz Attempts RLS (Owner access only)
CREATE POLICY "Users access own daily_quiz_attempts" ON daily_quiz_attempts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8.3 Flashcards & Progress RLS (Read cards for auth, progress is owner only)
CREATE POLICY "Public read flashcards" ON flashcards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin write flashcards" ON flashcards FOR ALL TO authenticated USING (auth.jwt()->>'email' = 'karnanphysics2026@gmail.com');

CREATE POLICY "Users access own flashcard progress" ON user_flashcard_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 8.4 Sync Logs & Email Queue RLS (Admin only)
CREATE POLICY "Admin access sync_logs" ON google_sheets_sync_logs FOR ALL TO authenticated USING (auth.jwt()->>'email' = 'karnanphysics2026@gmail.com');
CREATE POLICY "Admin access email_queue" ON email_queue FOR ALL TO authenticated USING (auth.jwt()->>'email' = 'karnanphysics2026@gmail.com');
