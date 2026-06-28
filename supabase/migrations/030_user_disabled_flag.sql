-- Add disabled flag to user_profiles so admin can block users from logging in
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

-- Allow the admin user (service role / authenticated admin) to read all profiles
-- Admin reads via RPC to bypass row-level security
CREATE OR REPLACE FUNCTION get_all_user_profiles()
RETURNS TABLE (
  id uuid,
  display_name text,
  email text,
  plan text,
  disabled boolean,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only the designated admin email may call this
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) <> 'karnanphysics2026@gmail.com' THEN
    RAISE EXCEPTION 'Access denied';
  END IF;
  RETURN QUERY
    SELECT
      u.id,
      COALESCE(up.display_name, '') AS display_name,
      u.email,
      COALESCE(up.plan, 'free') AS plan,
      COALESCE(up.disabled, false) AS disabled,
      u.created_at
    FROM auth.users u
    LEFT JOIN user_profiles up ON up.id = u.id
    ORDER BY u.created_at DESC;
END;
$$;

-- Allow authenticated users to call this RPC (the function itself enforces admin check)
GRANT EXECUTE ON FUNCTION get_all_user_profiles() TO authenticated;

-- Allow admin to update disabled flag on any row
CREATE POLICY "Admin can update any user_profile"
  ON user_profiles FOR UPDATE
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'karnanphysics2026@gmail.com'
  );
