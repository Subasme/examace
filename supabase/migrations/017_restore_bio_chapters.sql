-- Restore Biology chapters that were wiped when migration 016 ran before 011.
-- Migration 016 Step 2 deleted all Biology chapters (chapter1..chapter13) because
-- the bio-ch01 format rows from migration 011 had not been inserted yet.
-- This migration re-inserts them with correct NCERT labels and refreshes counts.

INSERT INTO chapters (language, standard, subject, chapter_id, chapter_label, chapter_tag, question_count)
VALUES
  ('English','12th','Biology','bio-ch01','Reproduction in Organisms',              'BIO12EN01',0),
  ('English','12th','Biology','bio-ch02','Sexual Reproduction in Flowering Plants','BIO12EN02',0),
  ('English','12th','Biology','bio-ch03','Human Reproduction',                     'BIO12EN03',0),
  ('English','12th','Biology','bio-ch04','Reproductive Health',                    'BIO12EN04',0),
  ('English','12th','Biology','bio-ch05','Principles of Inheritance and Variation','BIO12EN05',0),
  ('English','12th','Biology','bio-ch06','Molecular Basis of Inheritance',         'BIO12EN06',0),
  ('English','12th','Biology','bio-ch07','Evolution',                              'BIO12EN07',0),
  ('English','12th','Biology','bio-ch08','Human Health and Disease',               'BIO12EN08',0),
  ('English','12th','Biology','bio-ch09','Strategies for Enhancement in Food Production','BIO12EN09',0),
  ('English','12th','Biology','bio-ch10','Microbes in Human Welfare',              'BIO12EN10',0),
  ('English','12th','Biology','bio-ch11','Biotechnology: Principles and Processes','BIO12EN11',0),
  ('English','12th','Biology','bio-ch12','Biotechnology and its Applications',     'BIO12EN12',0),
  ('English','12th','Biology','bio-ch13','Organisms and Populations',              'BIO12EN13',0),
  ('Tamil',  '12th','Biology','bio-ch01','Reproduction in Organisms',              'BIO12TA01',0),
  ('Tamil',  '12th','Biology','bio-ch02','Sexual Reproduction in Flowering Plants','BIO12TA02',0),
  ('Tamil',  '12th','Biology','bio-ch03','Human Reproduction',                     'BIO12TA03',0),
  ('Tamil',  '12th','Biology','bio-ch04','Reproductive Health',                    'BIO12TA04',0),
  ('Tamil',  '12th','Biology','bio-ch05','Principles of Inheritance and Variation','BIO12TA05',0),
  ('Tamil',  '12th','Biology','bio-ch06','Molecular Basis of Inheritance',         'BIO12TA06',0),
  ('Tamil',  '12th','Biology','bio-ch07','Evolution',                              'BIO12TA07',0),
  ('Tamil',  '12th','Biology','bio-ch08','Human Health and Disease',               'BIO12TA08',0),
  ('Tamil',  '12th','Biology','bio-ch09','Strategies for Enhancement in Food Production','BIO12TA09',0),
  ('Tamil',  '12th','Biology','bio-ch10','Microbes in Human Welfare',              'BIO12TA10',0),
  ('Tamil',  '12th','Biology','bio-ch11','Biotechnology: Principles and Processes','BIO12TA11',0),
  ('Tamil',  '12th','Biology','bio-ch12','Biotechnology and its Applications',     'BIO12TA12',0),
  ('Tamil',  '12th','Biology','bio-ch13','Organisms and Populations',              'BIO12TA13',0)
ON CONFLICT (language, standard, subject, chapter_id) DO UPDATE
  SET chapter_label = EXCLUDED.chapter_label,
      chapter_tag   = EXCLUDED.chapter_tag;

-- Refresh question_count from actual questions
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
