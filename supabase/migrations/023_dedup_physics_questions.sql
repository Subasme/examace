-- Deduplicate Physics questions (same root cause as Biology — data imported
-- multiple times, producing 4-6 copies of each question).
-- Keeps one row per unique (language, chapter_id, question).

-- ── Step 1: Diagnostic — confirm duplicates before deleting ─────────────────
SELECT language, chapter_id,
  COUNT(*) AS total_rows,
  COUNT(DISTINCT question) AS unique_questions,
  COUNT(*) - COUNT(DISTINCT question) AS duplicate_rows
FROM questions
WHERE subject = 'Physics' AND standard = '12th'
GROUP BY language, chapter_id
ORDER BY language, chapter_id;

-- ── Step 2: Delete duplicate Physics questions ──────────────────────────────
-- Run after confirming Step 1 shows duplicate_rows > 0.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY language, chapter_id, question
      ORDER BY id
    ) AS rn
  FROM questions
  WHERE subject = 'Physics' AND standard = '12th'
)
DELETE FROM questions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── Step 3: Refresh Physics question_count in chapters table ─────────────────
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Physics'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
)
WHERE c.subject = 'Physics' AND c.standard = '12th';
