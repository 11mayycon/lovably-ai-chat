-- Corrigir check constraint para aceitar 'connecting'
ALTER TABLE whatsapp_connections DROP CONSTRAINT IF EXISTS whatsapp_connections_status_check;
ALTER TABLE whatsapp_connections ADD CONSTRAINT whatsapp_connections_status_check 
  CHECK (status IN ('disconnected', 'waiting', 'connected', 'connecting'));

-- Criar tabela para armazenar contatos do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  profile_pic_url TEXT,
  is_group BOOLEAN DEFAULT false,
  last_message_at TIMESTAMP WITH TIME ZONE,
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(whatsapp_connection_id, contact_phone)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_connection ON whatsapp_contacts(whatsapp_connection_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_phone ON whatsapp_contacts(contact_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_contacts_last_message ON whatsapp_contacts(last_message_at DESC);

-- Habilitar RLS
ALTER TABLE whatsapp_contacts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para whatsapp_contacts
CREATE POLICY "Admins can view contacts from their connections"
  ON whatsapp_contacts FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role) AND 
    EXISTS (
      SELECT 1 FROM whatsapp_connections wc
      WHERE wc.id = whatsapp_contacts.whatsapp_connection_id
      AND (wc.admin_user_id = auth.uid() OR is_super_admin(auth.uid()))
    )
  );

CREATE POLICY "Support can view contacts from their room's WhatsApp"
  ON whatsapp_contacts FOR SELECT
  USING (
    has_role(auth.uid(), 'support'::app_role) AND
    EXISTS (
      SELECT 1 FROM whatsapp_connections wc
      JOIN room_members rm ON rm.room_id = wc.support_room_id
      WHERE wc.id = whatsapp_contacts.whatsapp_connection_id
      AND rm.user_id = auth.uid()
    )
  );

-- Trigger para atualizar updated_at
CREATE TRIGGER update_whatsapp_contacts_updated_at
  BEFORE UPDATE ON whatsapp_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();