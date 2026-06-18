-- Migration: make question_tag a true unique key
-- Adds language prefix (EN/TA) so English and Tamil never collide,
-- re-backfills all existing rows, then enforces UNIQUE constraint.
-- After this migration the import script uses UPSERT on question_tag
-- so re-imports update questions in place (preserving UUIDs and FK refs).

-- ── 1. Drop the old non-unique index ────────────────────────────────────────
DROP INDEX IF EXISTS idx_questions_tag;

-- ── 2. Clear existing tags (NULLs are fine; UNIQUE allows multiple NULLs) ──
UPDATE questions SET question_tag = NULL;

-- ── 3. Backfill with language-prefixed tags ──────────────────────────────────
-- Format: {lang_code}{chapter_tag}Q{nnnn}
-- e.g.  EN12PHYCH01Q0001  (English 12th Physics Ch1 Q1)
--       TA12CHECH03Q0042  (Tamil  12th Chemistry Ch3 Q42)
WITH ranked AS (
  SELECT
    q.id,
    CASE q.language WHEN 'English' THEN 'EN' WHEN 'Tamil' THEN 'TA' ELSE 'XX' END
    || c.chapter_tag
    || 'Q'
    || LPAD(
         ROW_NUMBER() OVER (
           PARTITION BY q.language, q.standard, q.subject, q.chapter_id
           ORDER BY q.created_at, q.id
         )::TEXT,
       4, '0') AS new_tag
  FROM questions q
  JOIN chapters c
    ON  c.language   = q.language
    AND c.standard   = q.standard
    AND c.subject    = q.subject
    AND c.chapter_id = q.chapter_id
)
UPDATE questions
   SET question_tag = ranked.new_tag
  FROM ranked
 WHERE questions.id = ranked.id;

-- ── 4. Add UNIQUE constraint (drop first in case it already exists) ─────────
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_tag_key;
ALTER TABLE questions
  ADD CONSTRAINT questions_question_tag_key UNIQUE (question_tag);

-- ── 5. Re-create covering index (still useful for fast lookups by tag) ───────
CREATE INDEX IF NOT EXISTS idx_questions_tag ON questions (question_tag);

-- ── 6. Update trigger to include language prefix ─────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_question_tag()
RETURNS TRIGGER AS $$
DECLARE
  v_ctag     TEXT;
  v_langcode TEXT;
  v_seq      INTEGER;
BEGIN
  SELECT chapter_tag INTO v_ctag
    FROM chapters
   WHERE language   = NEW.language
     AND standard   = NEW.standard
     AND subject    = NEW.subject
     AND chapter_id = NEW.chapter_id;

  IF v_ctag IS NULL THEN RETURN NEW; END IF;

  v_langcode := CASE NEW.language
    WHEN 'English' THEN 'EN'
    WHEN 'Tamil'   THEN 'TA'
    ELSE 'XX'
  END;

  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(question_tag, '^.*Q', '') AS INTEGER)
  ), 0) + 1
  INTO v_seq
  FROM questions
  WHERE language   = NEW.language
    AND standard   = NEW.standard
    AND subject    = NEW.subject
    AND chapter_id = NEW.chapter_id
    AND question_tag IS NOT NULL;

  NEW.question_tag := v_langcode || v_ctag || 'Q' || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_question_tag ON questions;
CREATE TRIGGER trg_question_tag
  BEFORE INSERT ON questions
  FOR EACH ROW WHEN (NEW.question_tag IS NULL)
  EXECUTE FUNCTION fn_set_question_tag();
