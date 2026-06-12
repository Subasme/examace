-- Migration: real chapter names + question_tag system
-- Run AFTER 003_admin_config.sql
-- Tag format: {standard}{subject}CH{nn}  e.g. 12PHYCH01, 12CHECH03, 12BIOCH11
-- Question tag: {chapter_tag}Q{nnnn}      e.g. 12PHYCH01Q0001

-- ── Add tag columns ─────────────────────────────────────────────────────────
ALTER TABLE chapters  ADD COLUMN IF NOT EXISTS chapter_tag TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS question_tag TEXT UNIQUE;

-- ── Physics: update existing labels (ch1–ch6) and tag them ──────────────────
UPDATE chapters SET chapter_label='Electric Charges and Fields',         chapter_tag='12PHYCH01' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter1';
UPDATE chapters SET chapter_label='Electrostatic Potential and Capacitance', chapter_tag='12PHYCH02' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter2';
UPDATE chapters SET chapter_label='Current Electricity',                 chapter_tag='12PHYCH03' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter3';
UPDATE chapters SET chapter_label='Moving Charges and Magnetism',        chapter_tag='12PHYCH04' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter4';
UPDATE chapters SET chapter_label='Magnetism and Matter',                chapter_tag='12PHYCH05' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter5';
UPDATE chapters SET chapter_label='Electromagnetic Induction',           chapter_tag='12PHYCH06' WHERE language='English' AND standard='12th' AND subject='Physics' AND chapter_id='chapter6';

UPDATE chapters SET chapter_label='Electric Charges and Fields',         chapter_tag='12PHYCH01' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter1';
UPDATE chapters SET chapter_label='Electrostatic Potential and Capacitance', chapter_tag='12PHYCH02' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter2';
UPDATE chapters SET chapter_label='Current Electricity',                 chapter_tag='12PHYCH03' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter3';
UPDATE chapters SET chapter_label='Moving Charges and Magnetism',        chapter_tag='12PHYCH04' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter4';
UPDATE chapters SET chapter_label='Magnetism and Matter',                chapter_tag='12PHYCH05' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter5';
UPDATE chapters SET chapter_label='Electromagnetic Induction',           chapter_tag='12PHYCH06' WHERE language='Tamil' AND standard='12th' AND subject='Physics' AND chapter_id='chapter6';

-- ── Physics: insert remaining ch7–ch14 ─────────────────────────────────────
INSERT INTO chapters (language,standard,subject,chapter_id,chapter_label,question_count,chapter_tag) VALUES
('English','12th','Physics','chapter7', 'Alternating Current',                   0,'12PHYCH07'),
('English','12th','Physics','chapter8', 'Electromagnetic Waves',                 0,'12PHYCH08'),
('English','12th','Physics','chapter9', 'Ray Optics and Optical Instruments',    0,'12PHYCH09'),
('English','12th','Physics','chapter10','Wave Optics',                           0,'12PHYCH10'),
('English','12th','Physics','chapter11','Dual Nature of Radiation and Matter',   0,'12PHYCH11'),
('English','12th','Physics','chapter12','Atoms',                                 0,'12PHYCH12'),
('English','12th','Physics','chapter13','Nuclei',                                0,'12PHYCH13'),
('English','12th','Physics','chapter14','Semiconductor Electronics',             0,'12PHYCH14'),
('Tamil',  '12th','Physics','chapter7', 'Alternating Current',                   0,'12PHYCH07'),
('Tamil',  '12th','Physics','chapter8', 'Electromagnetic Waves',                 0,'12PHYCH08'),
('Tamil',  '12th','Physics','chapter9', 'Ray Optics and Optical Instruments',    0,'12PHYCH09'),
('Tamil',  '12th','Physics','chapter10','Wave Optics',                           0,'12PHYCH10'),
('Tamil',  '12th','Physics','chapter11','Dual Nature of Radiation and Matter',   0,'12PHYCH11'),
('Tamil',  '12th','Physics','chapter12','Atoms',                                 0,'12PHYCH12'),
('Tamil',  '12th','Physics','chapter13','Nuclei',                                0,'12PHYCH13'),
('Tamil',  '12th','Physics','chapter14','Semiconductor Electronics',             0,'12PHYCH14')
ON CONFLICT (language,standard,subject,chapter_id) DO UPDATE
  SET chapter_label=EXCLUDED.chapter_label, chapter_tag=EXCLUDED.chapter_tag;

-- ── Chemistry: insert ch1–ch10 ──────────────────────────────────────────────
INSERT INTO chapters (language,standard,subject,chapter_id,chapter_label,question_count,chapter_tag) VALUES
('English','12th','Chemistry','chapter1', 'Solutions',                                   0,'12CHECH01'),
('English','12th','Chemistry','chapter2', 'Electrochemistry',                            0,'12CHECH02'),
('English','12th','Chemistry','chapter3', 'Chemical Kinetics',                           0,'12CHECH03'),
('English','12th','Chemistry','chapter4', 'd and f Block Elements',                      0,'12CHECH04'),
('English','12th','Chemistry','chapter5', 'Coordination Compounds',                      0,'12CHECH05'),
('English','12th','Chemistry','chapter6', 'Haloalkanes and Haloarenes',                  0,'12CHECH06'),
('English','12th','Chemistry','chapter7', 'Alcohols, Phenols and Ethers',                0,'12CHECH07'),
('English','12th','Chemistry','chapter8', 'Aldehydes, Ketones and Carboxylic Acids',     0,'12CHECH08'),
('English','12th','Chemistry','chapter9', 'Amines',                                      0,'12CHECH09'),
('English','12th','Chemistry','chapter10','Biomolecules',                                0,'12CHECH10'),
('Tamil',  '12th','Chemistry','chapter1', 'Solutions',                                   0,'12CHECH01'),
('Tamil',  '12th','Chemistry','chapter2', 'Electrochemistry',                            0,'12CHECH02'),
('Tamil',  '12th','Chemistry','chapter3', 'Chemical Kinetics',                           0,'12CHECH03'),
('Tamil',  '12th','Chemistry','chapter4', 'd and f Block Elements',                      0,'12CHECH04'),
('Tamil',  '12th','Chemistry','chapter5', 'Coordination Compounds',                      0,'12CHECH05'),
('Tamil',  '12th','Chemistry','chapter6', 'Haloalkanes and Haloarenes',                  0,'12CHECH06'),
('Tamil',  '12th','Chemistry','chapter7', 'Alcohols, Phenols and Ethers',                0,'12CHECH07'),
('Tamil',  '12th','Chemistry','chapter8', 'Aldehydes, Ketones and Carboxylic Acids',     0,'12CHECH08'),
('Tamil',  '12th','Chemistry','chapter9', 'Amines',                                      0,'12CHECH09'),
('Tamil',  '12th','Chemistry','chapter10','Biomolecules',                                0,'12CHECH10')
ON CONFLICT (language,standard,subject,chapter_id) DO UPDATE
  SET chapter_label=EXCLUDED.chapter_label, chapter_tag=EXCLUDED.chapter_tag;

-- ── Biology: insert ch1–ch13 ────────────────────────────────────────────────
INSERT INTO chapters (language,standard,subject,chapter_id,chapter_label,question_count,chapter_tag) VALUES
('English','12th','Biology','chapter1', 'Sexual Reproduction in Flowering Plants', 0,'12BIOCH01'),
('English','12th','Biology','chapter2', 'Human Reproduction',                      0,'12BIOCH02'),
('English','12th','Biology','chapter3', 'Reproductive Health',                     0,'12BIOCH03'),
('English','12th','Biology','chapter4', 'Principles of Inheritance and Variation', 0,'12BIOCH04'),
('English','12th','Biology','chapter5', 'Molecular Basis of Inheritance',          0,'12BIOCH05'),
('English','12th','Biology','chapter6', 'Evolution',                               0,'12BIOCH06'),
('English','12th','Biology','chapter7', 'Human Health and Disease',                0,'12BIOCH07'),
('English','12th','Biology','chapter8', 'Microbes in Human Welfare',               0,'12BIOCH08'),
('English','12th','Biology','chapter9', 'Biotechnology: Principles and Processes', 0,'12BIOCH09'),
('English','12th','Biology','chapter10','Biotechnology and its Applications',      0,'12BIOCH10'),
('English','12th','Biology','chapter11','Organisms and Populations',               0,'12BIOCH11'),
('English','12th','Biology','chapter12','Ecosystem',                               0,'12BIOCH12'),
('English','12th','Biology','chapter13','Biodiversity and Conservation',           0,'12BIOCH13'),
('Tamil',  '12th','Biology','chapter1', 'Sexual Reproduction in Flowering Plants', 0,'12BIOCH01'),
('Tamil',  '12th','Biology','chapter2', 'Human Reproduction',                      0,'12BIOCH02'),
('Tamil',  '12th','Biology','chapter3', 'Reproductive Health',                     0,'12BIOCH03'),
('Tamil',  '12th','Biology','chapter4', 'Principles of Inheritance and Variation', 0,'12BIOCH04'),
('Tamil',  '12th','Biology','chapter5', 'Molecular Basis of Inheritance',          0,'12BIOCH05'),
('Tamil',  '12th','Biology','chapter6', 'Evolution',                               0,'12BIOCH06'),
('Tamil',  '12th','Biology','chapter7', 'Human Health and Disease',                0,'12BIOCH07'),
('Tamil',  '12th','Biology','chapter8', 'Microbes in Human Welfare',               0,'12BIOCH08'),
('Tamil',  '12th','Biology','chapter9', 'Biotechnology: Principles and Processes', 0,'12BIOCH09'),
('Tamil',  '12th','Biology','chapter10','Biotechnology and its Applications',      0,'12BIOCH10'),
('Tamil',  '12th','Biology','chapter11','Organisms and Populations',               0,'12BIOCH11'),
('Tamil',  '12th','Biology','chapter12','Ecosystem',                               0,'12BIOCH12'),
('Tamil',  '12th','Biology','chapter13','Biodiversity and Conservation',           0,'12BIOCH13')
ON CONFLICT (language,standard,subject,chapter_id) DO UPDATE
  SET chapter_label=EXCLUDED.chapter_label, chapter_tag=EXCLUDED.chapter_tag;

-- ── Update chapter_label in existing questions to match real names ──────────
UPDATE questions SET chapter_label='Electric Charges and Fields'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter1';
UPDATE questions SET chapter_label='Electrostatic Potential and Capacitance'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter2';
UPDATE questions SET chapter_label='Current Electricity'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter3';
UPDATE questions SET chapter_label='Moving Charges and Magnetism'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter4';
UPDATE questions SET chapter_label='Magnetism and Matter'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter5';
UPDATE questions SET chapter_label='Electromagnetic Induction'
  WHERE standard='12th' AND subject='Physics' AND chapter_id='chapter6';

-- ── Auto question_tag trigger for new inserts ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_question_tag()
RETURNS TRIGGER AS $$
DECLARE
  ctag TEXT;
  seq_num INTEGER;
BEGIN
  SELECT chapter_tag INTO ctag
    FROM chapters
   WHERE language=NEW.language AND standard=NEW.standard
     AND subject=NEW.subject   AND chapter_id=NEW.chapter_id;

  IF ctag IS NULL THEN RETURN NEW; END IF;

  SELECT COALESCE(MAX(
    CAST(REGEXP_REPLACE(question_tag, '^.*Q', '') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM questions
  WHERE language=NEW.language AND standard=NEW.standard
    AND subject=NEW.subject   AND chapter_id=NEW.chapter_id
    AND question_tag IS NOT NULL;

  NEW.question_tag := ctag || 'Q' || LPAD(seq_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_question_tag ON questions;
CREATE TRIGGER trg_question_tag
  BEFORE INSERT ON questions
  FOR EACH ROW WHEN (NEW.question_tag IS NULL)
  EXECUTE FUNCTION fn_set_question_tag();

-- ── Back-fill question_tag for all existing rows ─────────────────────────────
WITH ranked AS (
  SELECT
    q.id,
    c.chapter_tag || 'Q' || LPAD(
      ROW_NUMBER() OVER (
        PARTITION BY q.language, q.standard, q.subject, q.chapter_id
        ORDER BY q.created_at, q.id
      )::TEXT, 4, '0'
    ) AS new_tag
  FROM questions q
  JOIN chapters c
    ON c.language=q.language AND c.standard=q.standard
   AND c.subject=q.subject   AND c.chapter_id=q.chapter_id
  WHERE q.question_tag IS NULL
)
UPDATE questions
   SET question_tag = ranked.new_tag
  FROM ranked
 WHERE questions.id = ranked.id;
