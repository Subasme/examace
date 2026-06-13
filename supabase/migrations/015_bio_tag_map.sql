-- Run fifth: link questions to question_tag_master

INSERT INTO question_tag_map (question_id, tag_id, sequence_num)
SELECT q.id,
       t.id,
       CAST(SUBSTRING(q.question_tag FROM 'Q(\d+)$') AS INT)
FROM questions q
JOIN question_tag_master t
  ON t.tag_code = SUBSTRING(q.question_tag FROM 1 FOR LENGTH(q.question_tag) - 5)
WHERE q.subject = 'Biology'
  AND q.question_tag LIKE 'BIO12%'
ON CONFLICT (question_id, tag_id) DO NOTHING;

-- Update question counts in chapters table
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
