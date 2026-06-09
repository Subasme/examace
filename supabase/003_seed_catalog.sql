-- Run this AFTER 001_initial_schema.sql and 002_rls_policies.sql
INSERT INTO chapters (language,standard,subject,chapter_id,chapter_label,question_count) VALUES
('English','12th','Physics','chapter1','Chapter 1',456),
('English','12th','Physics','chapter2','Chapter 2',347),
('English','12th','Physics','chapter3','Chapter 3',244),
('English','12th','Physics','chapter4','Chapter 4',384),
('English','12th','Physics','chapter5','Chapter 5',213),
('English','12th','Physics','chapter6','Chapter 6',249),
('Tamil','12th','Physics','chapter1','Chapter 1',456),
('Tamil','12th','Physics','chapter2','Chapter 2',345),
('Tamil','12th','Physics','chapter3','Chapter 3',244),
('Tamil','12th','Physics','chapter4','Chapter 4',384),
('Tamil','12th','Physics','chapter5','Chapter 5',213),
('Tamil','12th','Physics','chapter6','Chapter 6',249)
ON CONFLICT (language,standard,subject,chapter_id) DO UPDATE SET question_count=EXCLUDED.question_count;
