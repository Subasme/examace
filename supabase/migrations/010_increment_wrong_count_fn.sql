-- Atomic upsert + increment for wrong_answer_tracker.
-- Replaces the JS-side upsert with times_wrong:1 which never incremented.
-- Call via: db.rpc('increment_wrong_count', { p_user_id: '...', p_question_id: '...' })

CREATE OR REPLACE FUNCTION increment_wrong_count(p_user_id UUID, p_question_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO wrong_answer_tracker (user_id, question_id, times_wrong, last_wrong_at, is_mastered)
  VALUES (p_user_id, p_question_id, 1, NOW(), false)
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET times_wrong    = wrong_answer_tracker.times_wrong + 1,
        last_wrong_at  = NOW(),
        is_mastered    = false;   -- un-master if they got it wrong again
END;
$$;

GRANT EXECUTE ON FUNCTION increment_wrong_count(UUID, UUID) TO authenticated;
