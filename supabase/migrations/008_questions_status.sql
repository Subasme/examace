-- Add status column to questions table
ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','draft','archived'));

-- All existing questions are active
UPDATE questions SET status = 'active' WHERE status IS NULL OR status = 'active';

CREATE INDEX IF NOT EXISTS questions_status_idx ON questions(status);
