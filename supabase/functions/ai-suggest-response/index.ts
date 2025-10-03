import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, context } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY not configured');
    }

    console.log('AI Suggest - Generating response suggestion for messages:', messages.length);

    // Build conversation context for AI
    const conversationHistory = messages.map((msg: any) => ({
      role: msg.sender_type === 'client' ? 'user' : 'assistant',
      content: msg.content
    }));

    const systemPrompt = `Você é um assistente de IA chamado InovaPro AI que ajuda atendentes a responder clientes de forma profissional e empática. 
    
Sua função é analisar a conversa e sugerir uma resposta apropriada que o atendente pode usar, editar ou se inspirar.

Contexto do atendimento: ${context || 'Não fornecido'}

Diretrizes:
- Seja profissional, mas amigável
- Use linguagem clara e objetiva
- Seja empático com as necessidades do cliente
- Forneça soluções práticas quando possível
- Mantenha um tom positivo e prestativo`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    console.log('AI Suggest - Generated suggestion successfully');

    return new Response(
      JSON.stringify({ suggestion }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-suggest-response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
