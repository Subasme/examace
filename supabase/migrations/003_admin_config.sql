-- Admin configuration table
CREATE TABLE IF NOT EXISTS admin_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO admin_config (key, value) VALUES
  ('free_daily_limit', '5'),
  ('free_max_test_duration', '30')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_plan_check
  CHECK (plan IN ('free', 'premium', 'unlimited'));

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin config public read" ON admin_config;
CREATE POLICY "Admin config public read" ON admin_config FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin config write" ON admin_config;
CREATE POLICY "Admin config write" ON admin_config FOR ALL
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'unlimited'));

GRANT SELECT ON public.admin_config TO anon, authenticated;
GRANT ALL ON public.admin_config TO service_role;
