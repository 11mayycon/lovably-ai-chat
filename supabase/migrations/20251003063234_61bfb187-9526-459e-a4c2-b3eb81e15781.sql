-- Fix infinite recursion in user_roles RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Super admins can manage all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create correct policies using security definer functions
CREATE POLICY "Super admins can manage all user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Ensure maiconsillva2025@gmail.com has super_admin role
-- Comentado pois o usuário não existe mais no banco
-- DO $$
-- DECLARE
--   target_user_id uuid := 'e67790a4-6d70-416a-87cc-4d9a6355be2d';
-- BEGIN
--   -- Insert super_admin role if not exists
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES (target_user_id, 'super_admin'::app_role)
--   ON CONFLICT (user_id, role) DO NOTHING;
-- END $$;