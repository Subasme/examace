-- ── 1. Welcome Email Queueing Trigger ──
CREATE OR REPLACE FUNCTION public.trg_queue_welcome_email()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.email_queue (user_id, recipient_email, template_id, payload)
  VALUES (
    NEW.id,
    NEW.email,
    'welcome_onboarding',
    jsonb_build_object(
      'display_name', COALESCE(NEW.raw_user_meta_data->>'display_name', 'Student'),
      'email', NEW.email
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger must be created in the public schema on the auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created_email
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trg_queue_welcome_email();

-- ── 2. Quiz Result Email Queueing Trigger ──
CREATE OR REPLACE FUNCTION public.trg_queue_quiz_result_email()
RETURNS TRIGGER AS $$
DECLARE
  v_email TEXT;
  v_name TEXT;
  v_quiz_title TEXT;
BEGIN
  -- Fetch user email and display name from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'display_name', 'Student')
  INTO v_email, v_name
  FROM auth.users
  WHERE id = NEW.user_id;

  -- Fetch daily quiz title
  SELECT title
  INTO v_quiz_title
  FROM public.daily_quizzes
  WHERE id = NEW.daily_quiz_id;

  INSERT INTO public.email_queue (user_id, recipient_email, template_id, payload)
  VALUES (
    NEW.user_id,
    v_email,
    'quiz_result_summary',
    jsonb_build_object(
      'display_name', v_name,
      'quiz_title', COALESCE(v_quiz_title, 'Daily Quiz'),
      'score', NEW.score,
      'correct_count', NEW.correct_count,
      'wrong_count', NEW.wrong_count,
      'time_taken', NEW.time_taken,
      'completed_at', NEW.completed_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_daily_quiz_attempt_email
  AFTER INSERT ON public.daily_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_queue_quiz_result_email();

-- ── 3. Google Sheets Sync Queueing Trigger ──
CREATE OR REPLACE FUNCTION public.trg_queue_sheets_sync()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.google_sheets_sync_logs (event_type, record_id, status)
  VALUES (
    'quiz_attempt',
    NEW.id,
    'pending'
  )
  ON CONFLICT (record_id, event_type) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_daily_quiz_attempt_sync
  AFTER INSERT ON public.daily_quiz_attempts
  FOR EACH ROW EXECUTE FUNCTION public.trg_queue_sheets_sync();
