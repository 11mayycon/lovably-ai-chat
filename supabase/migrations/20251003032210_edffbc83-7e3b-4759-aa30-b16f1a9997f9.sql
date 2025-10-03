-- Criar tabela de usuários de suporte
CREATE TABLE public.support_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  matricula TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.support_users ENABLE ROW LEVEL SECURITY;

-- Políticas para support_users
CREATE POLICY "Admins can manage support users"
  ON public.support_users
  FOR ALL
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Support users can view their own data"
  ON public.support_users
  FOR SELECT
  USING (true);

-- Modificar support_rooms para usar matrícula
ALTER TABLE public.support_rooms DROP COLUMN password;
ALTER TABLE public.support_rooms ADD COLUMN support_user_id UUID REFERENCES public.support_users(id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_support_users_updated_at
  BEFORE UPDATE ON public.support_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();