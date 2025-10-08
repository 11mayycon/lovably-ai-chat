-- Habilitar realtime para as tabelas de atendimentos e mensagens

-- Adicionar tabela attendances à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;

-- Adicionar tabela messages à publicação de realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Garantir que a tabela tenha REPLICA IDENTITY FULL para capturar todas as mudanças
ALTER TABLE public.attendances REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;