-- Adicionar campos necessários para WWebJS na tabela whatsapp_connections
ALTER TABLE whatsapp_connections 
ADD COLUMN IF NOT EXISTS admin_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_connections_admin_user_id 
ON whatsapp_connections(admin_user_id);

-- Atualizar políticas RLS
DROP POLICY IF EXISTS "Admins can manage their own connections" ON whatsapp_connections;

CREATE POLICY "Admins can manage their own WhatsApp connections"
ON whatsapp_connections
FOR ALL
USING (auth.uid() = admin_user_id)
WITH CHECK (auth.uid() = admin_user_id);