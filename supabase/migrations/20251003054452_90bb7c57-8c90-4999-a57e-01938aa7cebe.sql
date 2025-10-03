-- Garantir que attendances tenha room_id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attendances' AND column_name = 'room_id'
  ) THEN
    ALTER TABLE public.attendances 
    ADD COLUMN room_id uuid REFERENCES public.support_rooms(id);
  END IF;
END $$;

-- Garantir realtime para attendances
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_attendances_room_status 
ON public.attendances(room_id, status);

CREATE INDEX IF NOT EXISTS idx_attendances_agent_status 
ON public.attendances(agent_id, status);
