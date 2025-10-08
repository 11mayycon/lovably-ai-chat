-- ============================================
-- RECRIAR SALAS DE SUPORTE COM AI INCLUÍDO
-- ============================================

-- Primeiro, vamos limpar todas as salas existentes e seus dados relacionados
-- Deletar mensagens relacionadas aos atendimentos das salas
DELETE FROM public.messages 
WHERE attendance_id IN (
    SELECT id FROM public.attendances 
    WHERE room_id IN (SELECT id FROM public.support_rooms)
);

-- Deletar atendimentos das salas
DELETE FROM public.attendances 
WHERE room_id IN (SELECT id FROM public.support_rooms);

-- Deletar membros das salas
DELETE FROM public.room_members 
WHERE room_id IN (SELECT id FROM public.support_rooms);

-- Deletar as salas de suporte
DELETE FROM public.support_rooms;

-- Agora vamos recriar as salas com configuração padrão
-- Sala 1: Suporte Geral
INSERT INTO public.support_rooms (name, description, max_members, created_at, updated_at)
VALUES (
    'Suporte Geral',
    'Sala para atendimento geral de clientes',
    50,
    NOW(),
    NOW()
);

-- Sala 2: Suporte Técnico
INSERT INTO public.support_rooms (name, description, max_members, created_at, updated_at)
VALUES (
    'Suporte Técnico',
    'Sala para questões técnicas e problemas do sistema',
    30,
    NOW(),
    NOW()
);

-- Sala 3: Vendas e Comercial
INSERT INTO public.support_rooms (name, description, max_members, created_at, updated_at)
VALUES (
    'Vendas e Comercial',
    'Sala para questões comerciais e vendas',
    25,
    NOW(),
    NOW()
);