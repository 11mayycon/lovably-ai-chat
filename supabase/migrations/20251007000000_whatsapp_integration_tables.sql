-- ============================================
-- TABELAS PARA INTEGRAÇÃO WHATSAPP
-- ============================================

-- TABELA: whatsapp_instances (instâncias da Evolution API)
CREATE TABLE IF NOT EXISTS whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL UNIQUE,
  instance_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connecting' CHECK (status IN ('connecting', 'connected', 'disconnected')),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- TABELA: contacts (contatos do WhatsApp)
CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  number TEXT NOT NULL,
  whatsapp_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  instance_name TEXT NOT NULL,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(whatsapp_id, instance_name)
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_name ON whatsapp_instances(instance_name);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_status ON whatsapp_instances(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_instances_admin ON whatsapp_instances(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_contacts_instance ON contacts(instance_name);
CREATE INDEX IF NOT EXISTS idx_contacts_number ON contacts(number);
CREATE INDEX IF NOT EXISTS idx_contacts_whatsapp_id ON contacts(whatsapp_id);
CREATE INDEX IF NOT EXISTS idx_contacts_admin ON contacts(admin_user_id);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

CREATE TRIGGER update_whatsapp_instances_updated_at
  BEFORE UPDATE ON whatsapp_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE whatsapp_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: whatsapp_instances
CREATE POLICY "Admins can manage their own instances"
  ON whatsapp_instances FOR ALL
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

-- POLÍTICAS: contacts
CREATE POLICY "Admins can manage their own contacts"
  ON contacts FOR ALL
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Support can view contacts from their admin"
  ON contacts FOR SELECT
  USING (
    has_role(auth.uid(), 'support') AND 
    EXISTS (
      SELECT 1 FROM room_members rm
      JOIN support_rooms sr ON sr.id = rm.room_id
      WHERE rm.user_id = auth.uid() 
      AND sr.admin_owner_id = contacts.admin_user_id
    )
  );