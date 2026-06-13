-- Safe deduplication for Biology and Physics questions.
-- question_responses.question_id has a FK to questions.id without CASCADE,
-- so we remap any responses that point at a duplicate → canonical id first.
-- Canonical = lexicographically smallest UUID in each duplicate group.

-- ══════════════════════════════════════════════════════════════════════════════
-- BIOLOGY
-- ══════════════════════════════════════════════════════════════════════════════

-- Step 1: Remap question_responses: duplicate Biology question_id → canonical
UPDATE question_responses qr
SET question_id = canon.canonical_id
FROM (
  WITH ranked AS (
    SELECT id,
      FIRST_VALUE(id) OVER (
        PARTITION BY language, chapter_id, question ORDER BY id
      ) AS canonical_id,
      ROW_NUMBER() OVER (
        PARTITION BY language, chapter_id, question ORDER BY id
      ) AS rn
    FROM questions
    WHERE subject = 'Biology' AND standard = '12th'
  )
  SELECT id AS dup_id, canonical_id FROM ranked WHERE rn > 1
) AS canon
WHERE qr.question_id = canon.dup_id;

-- Step 2: Delete duplicate Biology questions (FKs now point to canonical)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY language, chapter_id, question ORDER BY id
    ) AS rn
  FROM questions
  WHERE subject = 'Biology' AND standard = '12th'
)
DELETE FROM questions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 3: Refresh Biology question_count in chapters
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject = 'Biology' AND q.standard = '12th'
    AND q.chapter_id = c.chapter_id AND q.language = c.language
)
WHERE c.subject = 'Biology' AND c.standard = '12th';

-- ══════════════════════════════════════════════════════════════════════════════
-- PHYSICS
-- ══════════════════════════════════════════════════════════════════════════════

-- Step 4: Remap question_responses: duplicate Physics question_id → canonical
UPDATE question_responses qr
SET question_id = canon.canonical_id
FROM (
  WITH ranked AS (
    SELECT id,
      FIRST_VALUE(id) OVER (
        PARTITION BY language, chapter_id, question ORDER BY id
      ) AS canonical_id,
      ROW_NUMBER() OVER (
        PARTITION BY language, chapter_id, question ORDER BY id
      ) AS rn
    FROM questions
    WHERE subject = 'Physics' AND standard = '12th'
  )
  SELECT id AS dup_id, canonical_id FROM ranked WHERE rn > 1
) AS canon
WHERE qr.question_id = canon.dup_id;

-- Step 5: Delete duplicate Physics questions
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY language, chapter_id, question ORDER BY id
    ) AS rn
  FROM questions
  WHERE subject = 'Physics' AND standard = '12th'
)
DELETE FROM questions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Step 6: Refresh Physics question_count in chapters
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject = 'Physics' AND q.standard = '12th'
    AND q.chapter_id = c.chapter_id AND q.language = c.language
)
WHERE c.subject = 'Physics' AND c.standard = '12th';
