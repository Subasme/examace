-- Track where a user signed up from (e.g. 'main_app', 'electrostatics_landing')
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS signup_source TEXT DEFAULT 'main_app';

-- Drop first because return type is changing (adding signup_source column)
DROP FUNCTION IF EXISTS get_all_user_profiles();

-- Update get_all_user_profiles to include signup_source
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  plan text,
  disabled boolean,
  signup_source text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()) <> 'karnanphysics2026@gmail.com' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      COALESCE(up.display_name, '')::text          AS display_name,
      u.email::text,
      COALESCE(up.plan, 'free')::text              AS plan,
      COALESCE(up.disabled, false)                 AS disabled,
      COALESCE(up.signup_source, 'main_app')::text AS signup_source,
      u.created_at
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO authenticated;
