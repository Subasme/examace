-- Remap existing Biology questions from old chapter_id format (chapter1, chapter2 …)
-- to new format (bio-ch01, bio-ch02 …) so they are found by the chapter selection UI.
-- Also syncs chapter_label in the questions table to match the NCERT names.
-- Safe to run multiple times — the WHERE filters to rows that still need updating.

-- Step 1: Remap chapter_id in questions table
UPDATE questions
SET
  chapter_id    = 'bio-ch' || LPAD((REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT::TEXT, 2, '0'),
  chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
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
  END
WHERE subject  = 'Biology'
  AND standard = '12th'
  AND chapter_id NOT LIKE 'bio-ch%'
  AND (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT BETWEEN 1 AND 13;

-- Step 2: Refresh question_count in chapters table
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Biology'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
)
WHERE c.subject = 'Biology' AND c.standard = '12th';
