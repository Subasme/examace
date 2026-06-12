-- Optimize mistakes table: store question_id reference instead of duplicating full text
-- This reduces each row from ~1.5 KB to ~150 bytes (10x smaller)

ALTER TABLE mistakes ADD COLUMN IF NOT EXISTS question_id UUID REFERENCES questions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS mistakes_question_id_idx ON mistakes(question_id);

-- Optional: after backfilling question_id, you can drop the redundant columns
-- (don't drop yet — existing app code still reads them)
-- ALTER TABLE mistakes DROP COLUMN question;
-- ALTER TABLE mistakes DROP COLUMN options;
-- ALTER TABLE mistakes DROP COLUMN explanation;
