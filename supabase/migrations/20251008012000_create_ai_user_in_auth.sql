-- Criar usuário AI na tabela auth.users
-- Nota: Esta é uma abordagem especial para criar um usuário "virtual" para o AI

-- Primeiro, vamos verificar se o usuário AI já existe
DO $$
BEGIN
  -- Inserir o usuário AI na tabela auth.users se não existir
  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) VALUES (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'ai@inovapro.com',
    '$2a$10$dummy.encrypted.password.hash.for.ai.user.that.cannot.login',
    now(),
    now(),
    now(),
    '{"provider": "system", "providers": ["system"]}',
    '{"full_name": "INOVAPRO AI", "is_bot": true}',
    false,
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (id) DO NOTHING;

  -- Criar perfil para o usuário AI
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    created_at,
    updated_at
  ) VALUES (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef'::uuid,
    'ai@inovapro.com',
    'INOVAPRO AI',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;

  -- Adicionar role de support para o usuário AI
  INSERT INTO public.user_roles (
    user_id,
    role,
    created_at
  ) VALUES (
    'a1b2c3d4-e5f6-7890-1234-567890abcdef'::uuid,
    'support'::public.app_role,
    now()
  )
  ON CONFLICT (user_id, role) DO NOTHING;

END $$;