-- ============================================
-- CORREÇÃO FINAL DE RECURSÃO INFINITA NAS POLÍTICAS RLS
-- ============================================

-- Desabilitar RLS temporariamente para limpeza completa
ALTER TABLE public.support_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Admins manage own support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Support users view assigned rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Super admins manage all support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Users view own room membership" ON public.room_members;
DROP POLICY IF EXISTS "Admins manage room members" ON public.room_members;
DROP POLICY IF EXISTS "Super admins manage all room members" ON public.room_members;
DROP POLICY IF EXISTS "Support users view room members" ON public.room_members;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Admins can manage their own support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Support users can view rooms they are assigned to" ON public.support_rooms;
DROP POLICY IF EXISTS "Super admins can manage all support rooms" ON public.support_rooms;
DROP POLICY IF EXISTS "Users can view room members of their rooms" ON public.room_members;
DROP POLICY IF EXISTS "Admins can manage room members" ON public.room_members;
DROP POLICY IF EXISTS "Super admins can manage all room members" ON public.room_members;

-- ============================================
-- POLÍTICAS ULTRA SIMPLES PARA SUPPORT_ROOMS
-- ============================================

-- Reabilitar RLS para support_rooms
ALTER TABLE public.support_rooms ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Super admins podem fazer tudo
CREATE POLICY "super_admin_all_support_rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- POLÍTICA 2: Admins podem gerenciar suas próprias salas (SEM subconsultas)
CREATE POLICY "admin_own_support_rooms"
ON public.support_rooms
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin') AND 
  admin_owner_id = auth.uid()
);

-- POLÍTICA 3: Usuários de suporte podem ver suas salas (SEM subconsultas)
CREATE POLICY "support_view_assigned_rooms"
ON public.support_rooms
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'support') AND 
  support_user_id = auth.uid()
);

-- ============================================
-- POLÍTICAS ULTRA SIMPLES PARA ROOM_MEMBERS
-- ============================================

-- Reabilitar RLS para room_members
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: Super admins podem fazer tudo
CREATE POLICY "super_admin_all_room_members"
ON public.room_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'));

-- POLÍTICA 2: Usuários podem ver seus próprios registros (SEM subconsultas)
CREATE POLICY "user_own_membership"
ON public.room_members
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- POLÍTICA 3: Permitir inserção para usuários autenticados (temporário para testes)
CREATE POLICY "authenticated_insert_members"
ON public.room_members
FOR INSERT
TO authenticated
WITH CHECK (true);

-- POLÍTICA 4: Permitir atualização para usuários autenticados (temporário para testes)
CREATE POLICY "authenticated_update_members"
ON public.room_members
FOR UPDATE
TO authenticated
USING (true);

-- POLÍTICA 5: Permitir exclusão para usuários autenticados (temporário para testes)
CREATE POLICY "authenticated_delete_members"
ON public.room_members
FOR DELETE
TO authenticated
USING (true);