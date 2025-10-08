-- =====================================================
-- MIGRAÇÃO COMPLETA ISA 2.5 - NOVO PROJETO SUPABASE
-- Project ID: tcswbkvsatskhaskwnit
-- Execute este SQL no SQL Editor do Supabase Dashboard
-- =====================================================

-- 1. CREATE ENUM
CREATE TYPE public.app_role AS ENUM ('admin', 'support', 'super_admin');

-- =====================================================
-- 2. CREATE TABLES
-- =====================================================

-- Profiles Table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles Table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Subscriptions Table
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company TEXT,
  plan_name TEXT,
  duration_days INTEGER,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Support Rooms Table
CREATE TABLE public.support_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  admin_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  support_user_id UUID,
  max_members INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Room Members Table
CREATE TABLE public.room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.support_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- WhatsApp Connections Table
CREATE TABLE public.whatsapp_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_name TEXT NOT NULL UNIQUE,
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  support_room_id UUID REFERENCES public.support_rooms(id) ON DELETE SET NULL,
  phone_number TEXT,
  matricula TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  qr_code TEXT,
  last_connection TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Support Users Table
CREATE TABLE public.support_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  matricula TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendances Table
CREATE TABLE public.attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  whatsapp_connection_id UUID REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.support_rooms(id) ON DELETE SET NULL,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  initial_message TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  assigned_to TEXT DEFAULT 'ai',
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  observations TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id UUID NOT NULL REFERENCES public.attendances(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'agent', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Memory Table
CREATE TABLE public.ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructions TEXT NOT NULL,
  context JSONB DEFAULT '{}'::JSONB,
  quick_replies JSONB DEFAULT '[]'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quick Replies Table
CREATE TABLE public.quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activities Table
CREATE TABLE public.activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX idx_room_members_room_id ON public.room_members(room_id);
CREATE INDEX idx_room_members_user_id ON public.room_members(user_id);
CREATE INDEX idx_whatsapp_connections_admin ON public.whatsapp_connections(admin_user_id);
CREATE INDEX idx_whatsapp_connections_room ON public.whatsapp_connections(support_room_id);
CREATE INDEX idx_whatsapp_connections_status ON public.whatsapp_connections(status);
CREATE INDEX idx_attendances_connection ON public.attendances(whatsapp_connection_id);
CREATE INDEX idx_attendances_room ON public.attendances(room_id);
CREATE INDEX idx_attendances_agent ON public.attendances(agent_id);
CREATE INDEX idx_attendances_status ON public.attendances(status);
CREATE INDEX idx_attendances_client_phone ON public.attendances(client_phone);
CREATE INDEX idx_messages_attendance ON public.messages(attendance_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_quick_replies_user ON public.quick_replies(user_id);
CREATE INDEX idx_activities_user ON public.activities(user_id);
CREATE INDEX idx_activities_created_at ON public.activities(created_at DESC);

-- =====================================================
-- 4. CREATE FUNCTIONS
-- =====================================================

-- Function to check user role (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- =====================================================
-- 5. CREATE TRIGGERS
-- =====================================================

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_rooms_updated_at
  BEFORE UPDATE ON public.support_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_whatsapp_connections_updated_at
  BEFORE UPDATE ON public.whatsapp_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_users_updated_at
  BEFORE UPDATE ON public.support_users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendances_updated_at
  BEFORE UPDATE ON public.attendances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON public.ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_replies_updated_at
  BEFORE UPDATE ON public.quick_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 7. CREATE RLS POLICIES - PROFILES
-- =====================================================

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 8. CREATE RLS POLICIES - USER_ROLES
-- =====================================================

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all user roles"
  ON public.user_roles FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 9. CREATE RLS POLICIES - SUBSCRIPTIONS
-- =====================================================

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (is_super_admin(auth.uid()))
  WITH CHECK (is_super_admin(auth.uid()));

-- =====================================================
-- 10. CREATE RLS POLICIES - SUPPORT_ROOMS
-- =====================================================

CREATE POLICY "Admins can manage their own rooms"
  ON public.support_rooms FOR ALL
  USING (has_role(auth.uid(), 'admin') AND (admin_owner_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Support can view rooms they are members of"
  ON public.support_rooms FOR SELECT
  USING (
    has_role(auth.uid(), 'support') AND
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = support_rooms.id
      AND room_members.user_id = auth.uid()
    )
  );

-- =====================================================
-- 11. CREATE RLS POLICIES - ROOM_MEMBERS
-- =====================================================

CREATE POLICY "Admins can manage all room members"
  ON public.room_members FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can manage their own room membership"
  ON public.room_members FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- 12. CREATE RLS POLICIES - WHATSAPP_CONNECTIONS
-- =====================================================

CREATE POLICY "Admins can view their own connections"
  ON public.whatsapp_connections FOR SELECT
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can insert their own connections"
  ON public.whatsapp_connections FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin') AND admin_user_id = auth.uid());

CREATE POLICY "Admins can update their own connections"
  ON public.whatsapp_connections FOR UPDATE
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

CREATE POLICY "Admins can delete their own connections"
  ON public.whatsapp_connections FOR DELETE
  USING (has_role(auth.uid(), 'admin') AND (admin_user_id = auth.uid() OR is_super_admin(auth.uid())));

-- =====================================================
-- 13. CREATE RLS POLICIES - SUPPORT_USERS
-- =====================================================

CREATE POLICY "Admins can manage support users"
  ON public.support_users FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support users can view their own data"
  ON public.support_users FOR SELECT
  USING (true);

-- =====================================================
-- 14. CREATE RLS POLICIES - ATTENDANCES
-- =====================================================

CREATE POLICY "Admins can manage all attendances"
  ON public.attendances FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can view attendances from their room's WhatsApp"
  ON public.attendances FOR SELECT
  USING (
    has_role(auth.uid(), 'support') AND
    EXISTS (
      SELECT 1
      FROM room_members rm
      JOIN whatsapp_connections wc ON wc.support_room_id = rm.room_id
      WHERE rm.user_id = auth.uid()
      AND rm.room_id = attendances.room_id
      AND attendances.whatsapp_connection_id = wc.id
    )
  );

CREATE POLICY "Support can update their own attendances"
  ON public.attendances FOR UPDATE
  USING (agent_id = auth.uid());

-- =====================================================
-- 15. CREATE RLS POLICIES - MESSAGES
-- =====================================================

CREATE POLICY "Admins can manage all messages"
  ON public.messages FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view messages from their attendances"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM attendances
      WHERE attendances.id = messages.attendance_id
      AND (attendances.agent_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "Support can insert messages in their attendances"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM attendances
      WHERE attendances.id = messages.attendance_id
      AND attendances.agent_id = auth.uid()
    )
  );

-- =====================================================
-- 16. CREATE RLS POLICIES - AI_MEMORY
-- =====================================================

CREATE POLICY "Admins can manage AI memory"
  ON public.ai_memory FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can read AI memory"
  ON public.ai_memory FOR SELECT
  USING (has_role(auth.uid(), 'support'));

-- =====================================================
-- 17. CREATE RLS POLICIES - QUICK_REPLIES
-- =====================================================

CREATE POLICY "Users can manage their own quick replies"
  ON public.quick_replies FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all quick replies"
  ON public.quick_replies FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 18. CREATE RLS POLICIES - ACTIVITIES
-- =====================================================

CREATE POLICY "Admins can view all activities"
  ON public.activities FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can view activities in their context"
  ON public.activities FOR SELECT
  USING (has_role(auth.uid(), 'support') AND user_id = auth.uid());

-- =====================================================
-- 19. CREATE RLS POLICIES - SETTINGS
-- =====================================================

CREATE POLICY "Admins can manage settings"
  ON public.settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support can read settings"
  ON public.settings FOR SELECT
  USING (has_role(auth.uid(), 'support'));

-- =====================================================
-- 20. ENABLE REALTIME (OPCIONAL)
-- =====================================================

-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.attendances;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- =====================================================
-- FIM DA MIGRAÇÃO
-- =====================================================
