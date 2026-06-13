-- Fix Biology chapter names and remove duplicate chapter entries
-- Root cause: chapters table had old-format entries (chapter_id = 'ch01' etc.)
-- with labels like "Chapter 1" alongside newly inserted bio-ch01 entries.
-- The questions imported in 012 use bio-ch01 format, so we need that to win.

-- Step 1: Apply correct NCERT chapter labels to ALL Biology chapters
-- regardless of chapter_id format (extracts the number from any format)
UPDATE chapters
SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
  WHEN 1  THEN 'Reproduction in Organisms'
  WHEN 2  THEN 'Sexual Reproduction in Flowering Plants'
  WHEN 3  THEN 'Human Reproduction'
  WHEN 4  THEN 'Reproductive Health'
  WHEN 5  THEN 'Principles of Inheritance and Variation'
  WHEN 6  THEN 'Molecular Basis of Inheritance'
  WHEN 7  THEN 'Evolution'
  WHEN 8  THEN 'Human Health and Disease'
  WHEN 9  THEN 'Strategies for Enhancement in Food Production'
  WHEN 10 THEN 'Microbes in Human Welfare'
  WHEN 11 THEN 'Biotechnology: Principles and Processes'
  WHEN 12 THEN 'Biotechnology and its Applications'
  WHEN 13 THEN 'Organisms and Populations'
END,
chapter_tag = 'BIO12' ||
  CASE WHEN language = 'English' THEN 'EN' ELSE 'TA' END ||
  LPAD((REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT::TEXT, 2, '0')
WHERE subject = 'Biology' AND standard = '12th'
  AND (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT BETWEEN 1 AND 13;

-- Step 2: Remove old-format Biology chapters (not bio-ch01 style) — they have
-- 0 questions linked to them since imported questions all use bio-ch* ids
DELETE FROM chapters
WHERE subject  = 'Biology'
  AND standard = '12th'
  AND chapter_id NOT LIKE 'bio-ch%';

-- Step 3: Refresh question_count from actual questions table
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Biology'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
    AND q.status     = 'active'
)
WHERE c.subject = 'Biology' AND c.standard = '12th';
