-- Chapter progression: sequential unlock system
-- Students must score a threshold to clear a chapter and unlock the next one.
-- Threshold decreases with each attempt: 80% → 70% → 60% → 50%+
-- A minimum of 20 questions must be answered for an attempt to count.

CREATE TABLE IF NOT EXISTS chapter_unlock (
  user_id      UUID         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject      TEXT         NOT NULL,
  chapter_id   TEXT         NOT NULL,
  attempt_no   INT          NOT NULL DEFAULT 0,
  best_score   NUMERIC(5,2) NOT NULL DEFAULT 0,
  is_cleared   BOOLEAN      NOT NULL DEFAULT FALSE,
  cleared_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subject, chapter_id)
);

CREATE INDEX IF NOT EXISTS idx_cu_user_subject ON chapter_unlock (user_id, subject);

ALTER TABLE chapter_unlock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cu_self" ON chapter_unlock;
CREATE POLICY "cu_self" ON chapter_unlock
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
GRANT SELECT, INSERT, UPDATE ON chapter_unlock TO authenticated;

-- Required score (%) for attempt number N
CREATE OR REPLACE FUNCTION unlock_threshold(p_attempt INT)
RETURNS INT LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN p_attempt <= 1 THEN 80
    WHEN p_attempt  = 2 THEN 70
    WHEN p_attempt  = 3 THEN 60
    ELSE 50
  END;
$$;
GRANT EXECUTE ON FUNCTION unlock_threshold TO authenticated, anon;

-- Record a chapter attempt; return pass/fail + thresholds
CREATE OR REPLACE FUNCTION record_chapter_attempt(
  p_user_id    UUID,
  p_subject    TEXT,
  p_chapter_id TEXT,
  p_score_pct  NUMERIC,
  p_questions  INT DEFAULT 0
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_row       chapter_unlock%ROWTYPE;
  v_attempt   INT;
  v_threshold INT;
  v_passed    BOOLEAN;
BEGIN
  IF p_questions < 20 THEN
    RETURN json_build_object('counted', false, 'reason', 'Need at least 20 questions');
  END IF;

  INSERT INTO chapter_unlock (user_id, subject, chapter_id)
  VALUES (p_user_id, p_subject, p_chapter_id)
  ON CONFLICT (user_id, subject, chapter_id) DO NOTHING;

  SELECT * INTO v_row FROM chapter_unlock
  WHERE user_id = p_user_id AND subject = p_subject AND chapter_id = p_chapter_id;

  -- If already cleared, just record the extra attempt and update best score
  IF v_row.is_cleared THEN
    UPDATE chapter_unlock SET
      attempt_no = attempt_no + 1,
      best_score = GREATEST(best_score, p_score_pct),
      updated_at = now()
    WHERE user_id = p_user_id AND subject = p_subject AND chapter_id = p_chapter_id;
    RETURN json_build_object(
      'counted', true, 'passed', true, 'already_cleared', true,
      'attempt_no', v_row.attempt_no + 1, 'score', p_score_pct,
      'best_score', GREATEST(v_row.best_score, p_score_pct)
    );
  END IF;

  v_attempt   := v_row.attempt_no + 1;
  v_threshold := unlock_threshold(v_attempt);
  v_passed    := p_score_pct >= v_threshold;

  UPDATE chapter_unlock SET
    attempt_no = v_attempt,
    best_score = GREATEST(best_score, p_score_pct),
    is_cleared = v_passed,
    cleared_at = CASE WHEN v_passed THEN now() ELSE cleared_at END,
    updated_at = now()
  WHERE user_id = p_user_id AND subject = p_subject AND chapter_id = p_chapter_id;

  RETURN json_build_object(
    'counted',        true,
    'passed',         v_passed,
    'attempt_no',     v_attempt,
    'score',          p_score_pct,
    'threshold',      v_threshold,
    'next_threshold', CASE WHEN v_passed THEN NULL ELSE unlock_threshold(v_attempt + 1) END
  );
END;
$$;
GRANT EXECUTE ON FUNCTION record_chapter_attempt TO authenticated;

-- Fetch all unlock statuses for a user + subject
CREATE OR REPLACE FUNCTION get_chapter_unlock_status(
  p_user_id UUID,
  p_subject  TEXT
) RETURNS TABLE (
  chapter_id TEXT,
  attempt_no INT,
  best_score NUMERIC,
  is_cleared BOOLEAN,
  cleared_at TIMESTAMPTZ
) LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT chapter_id, attempt_no, best_score, is_cleared, cleared_at
  FROM chapter_unlock
  WHERE user_id = p_user_id AND subject = p_subject;
$$;
GRANT EXECUTE ON FUNCTION get_chapter_unlock_status TO authenticated;
