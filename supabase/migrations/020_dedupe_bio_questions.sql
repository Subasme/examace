-- Step 1 — DIAGNOSTIC (run this first, read the output before proceeding)
-- Shows how many Biology questions exist per tag format per language.
-- Rows with tag NOT LIKE 'BIO12%' are the old duplicates to be removed.
SELECT
  language,
  CASE
    WHEN question_tag LIKE 'BIO12EN%' THEN 'new-english  (BIO12EN…)'
    WHEN question_tag LIKE 'BIO12TA%' THEN 'new-tamil    (BIO12TA…)'
    WHEN question_tag IS NULL          THEN 'old-no-tag'
    ELSE                                    'old-' || LEFT(question_tag, 12)
  END AS tag_group,
  COUNT(*) AS question_count
FROM questions
WHERE subject = 'Biology' AND standard = '12th'
GROUP BY language, tag_group
ORDER BY language, tag_group;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2 — CLEANUP
-- Only run after confirming the diagnostic shows BOTH old and new rows.
-- Deletes old-format Biology questions (those whose tag is NOT BIO12EN/TA)
-- but only when new-format rows already exist (safety guard).
-- ─────────────────────────────────────────────────────────────────────────────
DELETE FROM questions
WHERE subject  = 'Biology'
  AND standard = '12th'
  AND (question_tag NOT LIKE 'BIO12%' OR question_tag IS NULL)
  AND EXISTS (
    SELECT 1 FROM questions
    WHERE subject = 'Biology' AND standard = '12th'
      AND question_tag LIKE 'BIO12%'
    LIMIT 1
  );

-- Step 3 — Refresh question_count in chapters table
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Biology'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
)
WHERE c.subject = 'Biology' AND c.standard = '12th';
