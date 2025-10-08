-- Add admin owner and room association to WhatsApp connections
ALTER TABLE public.whatsapp_connections
  ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS support_room_id uuid REFERENCES public.support_rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS matricula text UNIQUE;

-- Add WhatsApp connection reference to attendances
ALTER TABLE public.attendances
  ADD COLUMN IF NOT EXISTS whatsapp_connection_id uuid REFERENCES public.whatsapp_connections(id) ON DELETE SET NULL;

-- Update RLS policies for whatsapp_connections to be isolated per admin
DROP POLICY IF EXISTS "Admins can manage WhatsApp connections" ON public.whatsapp_connections;

CREATE POLICY "Admins can view their own WhatsApp connections"
ON public.whatsapp_connections
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid()))
);

CREATE POLICY "Admins can insert their own WhatsApp connections"
ON public.whatsapp_connections
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND admin_user_id = auth.uid()
);

CREATE POLICY "Admins can update their own WhatsApp connections"
ON public.whatsapp_connections
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid()))
);

CREATE POLICY "Admins can delete their own WhatsApp connections"
ON public.whatsapp_connections
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid()))
);

-- Update attendances RLS to only show attendances from their room's WhatsApp connection
DROP POLICY IF EXISTS "Support can view attendances in their rooms" ON public.attendances;

CREATE POLICY "Support can view attendances from their room's WhatsApp"
ON public.attendances
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.room_members rm
    INNER JOIN public.whatsapp_connections wc ON wc.support_room_id = rm.room_id
    WHERE rm.user_id = auth.uid() 
    AND rm.room_id = attendances.room_id
    AND attendances.whatsapp_connection_id = wc.id
  )
);

-- Update support_rooms to link to admin owner
ALTER TABLE public.support_rooms
  ADD COLUMN IF NOT EXISTS admin_owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update support_rooms RLS to show only rooms owned by the admin
DROP POLICY IF EXISTS "Admins can manage support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Support can view support rooms" ON public.support_rooms;

CREATE POLICY "Admins can manage their own support rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_owner_id = auth.uid() OR is_super_admin(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND (admin_owner_id = auth.uid() OR is_super_admin(auth.uid()))
);

CREATE POLICY "Support can view rooms they are members of"
ON public.support_rooms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support'::app_role) 
  AND EXISTS (
    SELECT 1 FROM public.room_members 
    WHERE room_id = support_rooms.id 
    AND user_id = auth.uid()
  )
);