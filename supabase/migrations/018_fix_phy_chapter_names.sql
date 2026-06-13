-- Fix Physics chapter labels in both chapters table and questions table.
-- Uses REGEXP_REPLACE to handle any numeric-suffix chapter_id format
-- (chapter1, chapter01, phy-ch01, etc.) so this is safe to re-run.

-- Step 1: Update chapter_label and chapter_tag in chapters table
UPDATE chapters
SET
  chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
    WHEN 1  THEN 'Electric Charges and Fields'
    WHEN 2  THEN 'Electrostatic Potential and Capacitance'
    WHEN 3  THEN 'Current Electricity'
    WHEN 4  THEN 'Moving Charges and Magnetism'
    WHEN 5  THEN 'Magnetism and Matter'
    WHEN 6  THEN 'Electromagnetic Induction'
    WHEN 7  THEN 'Alternating Current'
    WHEN 8  THEN 'Electromagnetic Waves'
    WHEN 9  THEN 'Ray Optics and Optical Instruments'
    WHEN 10 THEN 'Wave Optics'
    WHEN 11 THEN 'Dual Nature of Radiation and Matter'
    WHEN 12 THEN 'Atoms'
    WHEN 13 THEN 'Nuclei'
    WHEN 14 THEN 'Semiconductor Electronics: Materials, Devices and Simple Circuits'
  END,
  chapter_tag = 'PHY12' ||
    CASE WHEN language = 'English' THEN 'EN' ELSE 'TA' END ||
    LPAD((REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT::TEXT, 2, '0')
WHERE subject = 'Physics' AND standard = '12th'
  AND (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT BETWEEN 1 AND 14;

-- Step 2: Sync chapter_label in questions table to match
UPDATE questions
SET chapter_label = CASE (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT
    WHEN 1  THEN 'Electric Charges and Fields'
    WHEN 2  THEN 'Electrostatic Potential and Capacitance'
    WHEN 3  THEN 'Current Electricity'
    WHEN 4  THEN 'Moving Charges and Magnetism'
    WHEN 5  THEN 'Magnetism and Matter'
    WHEN 6  THEN 'Electromagnetic Induction'
    WHEN 7  THEN 'Alternating Current'
    WHEN 8  THEN 'Electromagnetic Waves'
    WHEN 9  THEN 'Ray Optics and Optical Instruments'
    WHEN 10 THEN 'Wave Optics'
    WHEN 11 THEN 'Dual Nature of Radiation and Matter'
    WHEN 12 THEN 'Atoms'
    WHEN 13 THEN 'Nuclei'
    WHEN 14 THEN 'Semiconductor Electronics: Materials, Devices and Simple Circuits'
  END
WHERE subject = 'Physics' AND standard = '12th'
  AND (REGEXP_REPLACE(chapter_id, '[^0-9]', '', 'g'))::INT BETWEEN 1 AND 14;

-- Step 3: Refresh question_count in chapters table
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Physics'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
    AND q.status     = 'active'
)
WHERE c.subject = 'Physics' AND c.standard = '12th';
