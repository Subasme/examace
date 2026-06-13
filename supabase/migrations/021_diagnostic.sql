-- ── DIAGNOSTIC — run ALL four queries and share the output ──────────────────

-- 1. Raw question count in the questions table (source of truth)
SELECT language, subject, COUNT(*) AS total_questions
FROM questions
WHERE standard = '12th'
GROUP BY language, subject
ORDER BY language, subject;

-- 2. Chapter table state: shows every chapter with its stored question_count
SELECT language, subject, chapter_id, question_count
FROM chapters
WHERE standard = '12th'
ORDER BY language, subject, chapter_id;

-- 3. Biology questions grouped by question_tag prefix (first 8 chars)
--    Look for entries that have the same question TEXT appearing twice
SELECT
  language,
  LEFT(COALESCE(question_tag, 'NULL'), 8) AS tag_prefix,
  COUNT(*) AS question_count
FROM questions
WHERE subject = 'Biology' AND standard = '12th'
GROUP BY language, tag_prefix
ORDER BY language, tag_prefix;

-- 4. Exact duplicate detection — find Biology questions with identical text
SELECT language, question, COUNT(*) AS copies
FROM questions
WHERE subject = 'Biology' AND standard = '12th'
GROUP BY language, question
HAVING COUNT(*) > 1
ORDER BY copies DESC
LIMIT 20;
