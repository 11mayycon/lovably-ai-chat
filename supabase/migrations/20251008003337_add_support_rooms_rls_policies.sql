-- ============================================
-- POLÍTICAS RLS PARA TABELA SUPPORT_ROOMS
-- ============================================

-- Habilitar RLS na tabela support_rooms se ainda não estiver habilitado
ALTER TABLE public.support_rooms ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Admins can manage their own support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Support users can view rooms they are assigned to" ON public.support_rooms;
DROP POLICY IF EXISTS "Super admins can manage all support rooms" ON public.support_rooms;

-- POLÍTICA 1: Admins podem gerenciar suas próprias salas de suporte
CREATE POLICY "Admins can manage their own support rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND 
  (admin_owner_id = auth.uid() OR admin_owner_id IS NULL)
);

-- POLÍTICA 2: Usuários de suporte podem visualizar salas onde estão atribuídos
CREATE POLICY "Support users can view rooms they are assigned to"
ON public.support_rooms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support') AND 
  (
    support_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.room_id = support_rooms.id 
      AND rm.user_id = auth.uid()
    )
  )
);

-- POLÍTICA 3: Super admins podem gerenciar todas as salas
CREATE POLICY "Super admins can manage all support rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- ============================================
-- POLÍTICAS RLS PARA TABELA ROOM_MEMBERS
-- ============================================

-- Habilitar RLS na tabela room_members se ainda não estiver habilitado
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Users can view room members of their rooms" ON public.room_members;
DROP POLICY IF EXISTS "Admins can manage room members" ON public.room_members;
DROP POLICY IF EXISTS "Super admins can manage all room members" ON public.room_members;

-- POLÍTICA 1: Usuários podem visualizar membros das salas onde estão
CREATE POLICY "Users can view room members of their rooms"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.support_rooms sr
    WHERE sr.id = room_members.room_id
    AND (
      sr.admin_owner_id = auth.uid() OR
      sr.support_user_id = auth.uid() OR
      has_role(auth.uid(), 'super_admin')
    )
  )
);

-- POLÍTICA 2: Admins podem gerenciar membros de suas salas
CREATE POLICY "Admins can manage room members"
ON public.room_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.support_rooms sr
    WHERE sr.id = room_members.room_id
    AND sr.admin_owner_id = auth.uid()
  )
);

-- POLÍTICA 3: Super admins podem gerenciar todos os membros
CREATE POLICY "Super admins can manage all room members"
ON public.room_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));