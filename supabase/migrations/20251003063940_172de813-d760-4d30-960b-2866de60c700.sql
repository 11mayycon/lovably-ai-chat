-- Add plan fields to subscriptions for admin creation
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_name text,
  ADD COLUMN IF NOT EXISTS duration_days integer;

-- Ensure updated_at trigger function exists (already created).
-- No further policy changes needed; existing policies cover super_admin/admin flows.