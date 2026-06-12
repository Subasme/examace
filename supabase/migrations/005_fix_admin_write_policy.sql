-- Fix admin_config write policy: allow by admin email instead of plan check
-- (The plan-based check silently blocked saves for the admin user)

DROP POLICY IF EXISTS "Admin config write" ON admin_config;
CREATE POLICY "Admin config write" ON admin_config FOR ALL
  USING (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'karnanphysics2026@gmail.com'
  )
  WITH CHECK (
    (SELECT email FROM auth.users WHERE id = auth.uid()) = 'karnanphysics2026@gmail.com'
  );

-- Ensure the admin user's profile is set to unlimited
UPDATE public.profiles
   SET plan = 'unlimited'
 WHERE id = (SELECT id FROM auth.users WHERE email = 'karnanphysics2026@gmail.com');

-- Update the limit value to what the admin last intended (10)
INSERT INTO admin_config (key, value) VALUES ('free_daily_limit', '10')
  ON CONFLICT (key) DO UPDATE SET value = '10', updated_at = now();
