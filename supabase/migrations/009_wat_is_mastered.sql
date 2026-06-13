-- Add is_mastered flag to wrong_answer_tracker
-- "Clear" in the UI sets this true rather than deleting rows,
-- so history is preserved for analytics.

ALTER TABLE wrong_answer_tracker
  ADD COLUMN IF NOT EXISTS is_mastered BOOLEAN NOT NULL DEFAULT false;

-- Partial index speeds up the common query: unmastered rows per user sorted by times_wrong
CREATE INDEX IF NOT EXISTS wat_active_idx
  ON wrong_answer_tracker(user_id, times_wrong DESC)
  WHERE NOT is_mastered;
