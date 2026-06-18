-- Bulk version of increment_wrong_count: accepts an array of question UUIDs.
-- One DB call replaces N parallel RPC calls, eliminating the post-quiz hang.
-- Call via: db.rpc('bulk_increment_wrong_count', { p_user_id: '...', p_question_ids: [...] })

CREATE OR REPLACE FUNCTION bulk_increment_wrong_count(
  p_user_id     UUID,
  p_question_ids UUID[]
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF p_question_ids IS NULL OR array_length(p_question_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO wrong_answer_tracker (user_id, question_id, times_wrong, last_wrong_at, is_mastered)
  SELECT p_user_id, unnest(p_question_ids), 1, NOW(), false
  ON CONFLICT (user_id, question_id) DO UPDATE
    SET times_wrong   = wrong_answer_tracker.times_wrong + 1,
        last_wrong_at = NOW(),
        is_mastered   = false;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_increment_wrong_count(UUID, UUID[]) TO authenticated;
