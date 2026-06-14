-- Remove duplicate Biology questions.
-- Root cause: old Biology data was imported multiple times (question_tag IS NULL
-- for all of them). This keeps the lowest UUID per unique question text per chapter.
--
-- Also fixes Physics: chapters table only has chapter1-chapter6;
-- inserts the missing chapter7-chapter14 rows with NCERT labels.

-- ── Step 1: Dedup Biology questions ─────────────────────────────────────────
-- Keeps one row per (language, chapter_id, question) — the rest are deleted.
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY language, chapter_id, question
      ORDER BY id
    ) AS rn
  FROM questions
  WHERE subject = 'Biology' AND standard = '12th'
)
DELETE FROM questions
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── Step 2: Refresh Biology question_count ───────────────────────────────────
UPDATE chapters c
SET question_count = (
  SELECT COUNT(*) FROM questions q
  WHERE q.subject    = 'Biology'
    AND q.standard   = '12th'
    AND q.chapter_id = c.chapter_id
    AND q.language   = c.language
)
WHERE c.subject = 'Biology' AND c.standard = '12th';

-- ── Step 3: Insert missing Physics chapters (chapter7–chapter14) ─────────────
-- Migration 018 already fixed labels for existing chapters but the rows for
-- chapter7–14 were never inserted into the chapters table.
INSERT INTO chapters (language, standard, subject, chapter_id, chapter_label, chapter_tag, question_count)
VALUES
  ('English','12th','Physics','chapter7', 'Alternating Current',                                               'PHY12EN07', 0),
  ('English','12th','Physics','chapter8', 'Electromagnetic Waves',                                             'PHY12EN08', 0),
  ('English','12th','Physics','chapter9', 'Ray Optics and Optical Instruments',                                'PHY12EN09', 0),
  ('English','12th','Physics','chapter10','Wave Optics',                                                       'PHY12EN10', 0),
  ('English','12th','Physics','chapter11','Dual Nature of Radiation and Matter',                               'PHY12EN11', 0),
  ('English','12th','Physics','chapter12','Atoms',                                                             'PHY12EN12', 0),
  ('English','12th','Physics','chapter13','Nuclei',                                                            'PHY12EN13', 0),
  ('English','12th','Physics','chapter14','Semiconductor Electronics: Materials, Devices and Simple Circuits', 'PHY12EN14', 0),
  ('Tamil',  '12th','Physics','chapter7', 'Alternating Current',                                               'PHY12TA07', 0),
  ('Tamil',  '12th','Physics','chapter8', 'Electromagnetic Waves',                                             'PHY12TA08', 0),
  ('Tamil',  '12th','Physics','chapter9', 'Ray Optics and Optical Instruments',                                'PHY12TA09', 0),
  ('Tamil',  '12th','Physics','chapter10','Wave Optics',                                                       'PHY12TA10', 0),
  ('Tamil',  '12th','Physics','chapter11','Dual Nature of Radiation and Matter',                               'PHY12TA11', 0),
  ('Tamil',  '12th','Physics','chapter12','Atoms',                                                             'PHY12TA12', 0),
  ('Tamil',  '12th','Physics','chapter13','Nuclei',                                                            'PHY12TA13', 0),
  ('Tamil',  '12th','Physics','chapter14','Semiconductor Electronics: Materials, Devices and Simple Circuits', 'PHY12TA14', 0)
ON CONFLICT (language, standard, subject, chapter_id) DO NOTHING;
