-- ============================================
-- CRIAR SALA FINANCAS
-- ============================================

-- Criar a sala 'financas' que está sendo mostrada na interface
INSERT INTO public.support_rooms (name, description, max_members, created_at, updated_at)
VALUES (
    'financas',
    'Sala para questões financeiras e contábeis',
    30,
    NOW(),
    NOW()
);

-- Adicionar o INOVAPRO AI como membro da sala financas
INSERT INTO public.room_members (room_id, user_id, full_name, is_bot, is_online)
SELECT 
    sr.id,
    'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    'INOVAPRO AI',
    true,
    true
FROM public.support_rooms sr
WHERE sr.name = 'financas';