import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, history } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY não configurada');
    }

    // Criar cliente Supabase com service role para acesso administrativo
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[AI-CHAT] Query recebida:', query);

    // Buscar contexto do banco de dados
    const context = await getDatabaseContext(supabase);

    // Construir mensagens para a IA
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente administrativo avançado do sistema ISA 2.5 (Inteligência de Suporte Automatizado).

VOCÊ TEM ACESSO COMPLETO E TOTAL ao banco de dados Supabase e pode executar QUALQUER operação administrativa.

## CAPACIDADES ADMINISTRATIVAS:
- Consultar dados de todas as tabelas
- Bloquear/desbloquear usuários
- Deletar usuários e dados
- Modificar configurações do sistema
- Gerar relatórios financeiros e estatísticas
- Gerenciar assinaturas e planos
- Visualizar histórico completo de atividades
- Executar operações em massa

## CONTEXTO DO BANCO DE DADOS:
${context}

## INSTRUÇÕES:
1. Quando solicitado a executar ações administrativas, indique que você pode executá-las
2. Para consultas, forneça respostas detalhadas baseadas nos dados
3. Para ações de modificação/exclusão, confirme a ação antes de executar
4. Seja preciso e profissional nas respostas
5. Forneça estatísticas e insights quando relevante

Responda em português de forma clara e profissional.`
      },
      ...history.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      })),
      {
        role: 'user',
        content: query
      }
    ];

    // Chamar Groq API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[AI-CHAT] Erro Groq API:', errorData);
      throw new Error(`Erro na API Groq: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || "Desculpe, não consegui gerar uma resposta.";

    console.log('[AI-CHAT] Resposta gerada com sucesso');

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[AI-CHAT] Erro:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function getDatabaseContext(supabase: any): Promise<string> {
  try {
    // Buscar estatísticas gerais
    const [
      { count: totalUsers },
      { count: totalAttendances },
      { count: activeSubscriptions },
      { data: recentActivities }
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('attendances').select('*', { count: 'exact', head: true }),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(10)
    ]);

    return `
### ESTATÍSTICAS GERAIS:
- Total de Usuários: ${totalUsers || 0}
- Total de Atendimentos: ${totalAttendances || 0}
- Assinaturas Ativas: ${activeSubscriptions || 0}

### ATIVIDADES RECENTES:
${recentActivities?.map((a: any) => `- ${a.type}: ${a.description}`).join('\n') || 'Nenhuma atividade recente'}

### TABELAS DISPONÍVEIS:
- profiles: Perfis de usuários
- user_roles: Papéis dos usuários (admin, support, super_admin)
- subscriptions: Assinaturas e planos
- whatsapp_connections: Conexões do WhatsApp
- support_rooms: Salas de suporte
- room_members: Membros das salas
- support_users: Usuários de suporte
- attendances: Atendimentos
- messages: Mensagens dos atendimentos
- ai_memory: Memória da IA
- quick_replies: Respostas rápidas
- activities: Registro de atividades
- settings: Configurações do sistema
`;
  } catch (error) {
    console.error('[AI-CHAT] Erro ao buscar contexto:', error);
    return 'Erro ao carregar contexto do banco de dados.';
  }
}
