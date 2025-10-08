-- ============================================
-- CORREÇÃO DE RECURSÃO INFINITA NAS POLÍTICAS RLS
-- ============================================

-- Remover todas as políticas problemáticas das tabelas
DROP POLICY IF EXISTS "Admins can manage their own support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Support users can view rooms they are assigned to" ON public.support_rooms;
DROP POLICY IF EXISTS "Super admins can manage all support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Users can view room members of their rooms" ON public.room_members;
DROP POLICY IF EXISTS "Admins can manage room members" ON public.room_members;
DROP POLICY IF EXISTS "Super admins can manage all room members" ON public.room_members;

-- ============================================
-- POLÍTICAS SIMPLIFICADAS PARA SUPPORT_ROOMS
-- ============================================

-- POLÍTICA 1: Admins podem gerenciar suas próprias salas (sem referência circular)
CREATE POLICY "Admins manage own support rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND 
  (admin_owner_id = auth.uid() OR admin_owner_id IS NULL)
);

-- POLÍTICA 2: Usuários de suporte podem visualizar salas atribuídas (sem JOIN circular)
CREATE POLICY "Support users view assigned rooms"
ON public.support_rooms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support') AND 
  support_user_id = auth.uid()
);

-- POLÍTICA 3: Super admins podem gerenciar todas as salas
CREATE POLICY "Super admins manage all support rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- ============================================
-- POLÍTICAS SIMPLIFICADAS PARA ROOM_MEMBERS
-- ============================================

-- POLÍTICA 1: Usuários podem ver seus próprios registros de membro
CREATE POLICY "Users view own room membership"
ON public.room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- POLÍTICA 2: Admins podem gerenciar membros (verificação direta por admin_owner_id)
CREATE POLICY "Admins manage room members"
ON public.room_members
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND
  room_id IN (
    SELECT id FROM public.support_rooms 
    WHERE admin_owner_id = auth.uid()
  )
);

-- POLÍTICA 3: Super admins podem gerenciar todos os membros
CREATE POLICY "Super admins manage all room members"
ON public.room_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- POLÍTICA 4: Usuários de suporte podem ver membros de suas salas atribuídas
CREATE POLICY "Support users view room members"
ON public.room_members
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support') AND
  room_id IN (
    SELECT id FROM public.support_rooms 
    WHERE support_user_id = auth.uid()
  )
);