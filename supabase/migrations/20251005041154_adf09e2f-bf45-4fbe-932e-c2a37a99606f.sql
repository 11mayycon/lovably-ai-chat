-- ============================================
-- RECRIAÇÃO COMPLETA DAS TABELAS DO ISA 2.5
-- ============================================

-- 1. Remover tabelas existentes (CASCADE remove foreign keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS whatsapp_connections CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS support_rooms CASCADE;
DROP TABLE IF EXISTS quick_replies CASCADE;
DROP TABLE IF EXISTS ai_memory CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- 2. TABELA: whatsapp_connections (instâncias Evolution API)
CREATE TABLE whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  instance_name TEXT NOT NULL UNIQUE,
  matricula TEXT UNIQUE,
  phone_number TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('disconnected', 'waiting', 'connected')),
  qr_code TEXT,
  last_connection TIMESTAMP WITH TIME ZONE,
  support_room_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. TABELA: support_rooms (salas de atendimento)
CREATE TABLE support_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  admin_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  support_user_id UUID,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Adicionar foreign key de whatsapp_connections para support_rooms
ALTER TABLE whatsapp_connections 
ADD CONSTRAINT fk_support_room 
FOREIGN KEY (support_room_id) 
REFERENCES support_rooms(id) 
ON DELETE SET NULL;

-- 4. TABELA: room_members (membros das salas)
CREATE TABLE room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES support_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- 5. TABELA: attendances (atendimentos)
CREATE TABLE attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_connection_id UUID REFERENCES whatsapp_connections(id) ON DELETE SET NULL,
  room_id UUID REFERENCES support_rooms(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  initial_message TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'finished')),
  assigned_to TEXT DEFAULT 'ai' CHECK (assigned_to IN ('ai', 'human')),
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  observations TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. TABELA: messages (mensagens dos atendimentos)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES attendances(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'ai', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. TABELA: ai_memory (memória da IA)
CREATE TABLE ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions TEXT NOT NULL,
  context JSONB DEFAULT '{}'::JSONB,
  quick_replies JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. TABELA: quick_replies (respostas rápidas)
CREATE TABLE quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 9. TABELA: activities (log de atividades)
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. TABELA: settings (configurações do sistema)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX idx_whatsapp_connections_admin ON whatsapp_connections(admin_user_id);
CREATE INDEX idx_whatsapp_connections_status ON whatsapp_connections(status);
CREATE INDEX idx_attendances_status ON attendances(status);
CREATE INDEX idx_attendances_room ON attendances(room_id);
CREATE INDEX idx_attendances_agent ON attendances(agent_id);
CREATE INDEX idx_messages_attendance ON messages(attendance_id);
CREATE INDEX idx_room_members_room ON room_members(room_id);
CREATE INDEX idx_room_members_user ON room_members(user_id);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON whatsapp_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_rooms_updated_at
  BEFORE UPDATE ON support_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at
  BEFORE UPDATE ON attendances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quick_replies_updated_at
  BEFORE UPDATE ON quick_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: whatsapp_connections
CREATE POLICY "Admins can view their own connections"
  ON whatsapp_connections FOR SELECT
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can insert their own connections"
  ON whatsapp_connections FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE POLICY "Admins can update their own connections"
  ON whatsapp_connections FOR UPDATE
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete their own connections"
  ON whatsapp_connections FOR DELETE
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

-- POLÍTICAS: support_rooms
CREATE POLICY "Admins can manage their own rooms"
  ON support_rooms FOR ALL
  USING (has_role(auth.uid(), 'admin') AND (admin_owner_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Support can view rooms they are members of"
  ON support_rooms FOR SELECT
  USING (
    has_role(auth.uid(), 'support') AND 
    EXISTS (SELECT 1 FROM room_members WHERE room_id = support_rooms.id AND user_id = auth.uid())
  );

-- POLÍTICAS: room_members
CREATE POLICY "Admins can manage all room members"
  ON room_members FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own room membership"
  ON room_members FOR ALL
  USING (user_id = auth.uid());

-- POLÍTICAS: attendances
CREATE POLICY "Admins can manage all attendances"
  ON attendances FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can view attendances from their room's WhatsApp"
  ON attendances FOR SELECT
  USING (
    has_role(auth.uid(), 'support') AND 
    EXISTS (
      SELECT 1 FROM room_members rm
      JOIN whatsapp_connections wc ON wc.support_room_id = rm.room_id
      WHERE rm.user_id = auth.uid() 
      AND rm.room_id = attendances.room_id 
      AND attendances.whatsapp_connection_id = wc.id
    )
  );

CREATE POLICY "Support can update their own attendances"
  ON attendances FOR UPDATE
  USING (agent_id = auth.uid());

-- POLÍTICAS: messages
CREATE POLICY "Admins can manage all messages"
  ON messages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view messages from their attendances"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attendances 
      WHERE attendances.id = messages.attendance_id 
      AND (attendances.agent_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Support can insert messages in their attendances"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendances 
      WHERE attendances.id = messages.attendance_id 
      AND attendances.agent_id = auth.uid()
    )
  );

-- POLÍTICAS: ai_memory
CREATE POLICY "Admins can manage AI memory"
  ON ai_memory FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can read AI memory"
  ON ai_memory FOR SELECT
  USING (has_role(auth.uid(), 'support'));

-- POLÍTICAS: quick_replies
CREATE POLICY "Users can manage their own quick replies"
  ON quick_replies FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quick replies"
  ON quick_replies FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- POLÍTICAS: activities
CREATE POLICY "Admins can view all activities"
  ON activities FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can view activities in their context"
  ON activities FOR SELECT
  USING (has_role(auth.uid(), 'support') AND user_id = auth.uid());

-- POLÍTICAS: settings
CREATE POLICY "Admins can manage settings"
  ON settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can read settings"
  ON settings FOR SELECT
  USING (has_role(auth.uid(), 'support'));