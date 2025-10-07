
-- Add full_name and is_bot columns to the room_members table
ALTER TABLE public.room_members
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Add the "INOVAPRO AI" user as a member of the "SaaS" room
INSERT INTO public.room_members (room_id, user_id, full_name, is_bot)
SELECT 
    r.id, -- The id of the room
    'a1b2c3d4-e5f6-7890-1234-567890abcdef', -- The user_id of the AI assistant
    'INOVAPRO AI', -- The full name of the AI assistant
    true -- Mark this member as a bot
FROM 
    public.support_rooms r
WHERE 
    r.name = 'SaaS'
ON CONFLICT (room_id, user_id) DO NOTHING;
