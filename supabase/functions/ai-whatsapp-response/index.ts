import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
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
    const { clientPhone, clientMessage, attendanceId } = await req.json();
    
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GROQ_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('AI WhatsApp - Processing message from:', clientPhone);

    // Get AI memory/instructions
    const { data: aiMemory } = await supabase
      .from('ai_memory')
      .select('instructions, context')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get conversation history
    const { data: messages } = await supabase
      .from('messages')
      .select('content, sender_type, created_at')
      .eq('attendance_id', attendanceId)
      .order('created_at', { ascending: true });

    // Build conversation context
    const conversationHistory = (messages || []).map((msg: any) => ({
      role: msg.sender_type === 'client' ? 'user' : 'assistant',
      content: msg.content
    }));

    const companyInfo = aiMemory?.context?.company_name || 'nossa empresa';
    const customInstructions = aiMemory?.instructions || '';

    const systemPrompt = `Você é o InovaPro AI, um assistente de atendimento ao cliente inteligente e prestativo.

IMPORTANTE: Você está representando o suporte de ${companyInfo}. Ao se apresentar, diga que é do suporte da empresa.

${customInstructions}

Diretrizes de atendimento:
- Seja sempre cordial, profissional e empático
- Use uma linguagem clara e acessível
- Se apresente como "Suporte ${companyInfo}" quando apropriado
- Forneça respostas completas e úteis
- Se não souber algo, seja honesto e ofereça ajuda para encontrar a informação
- Mantenha um tom amigável mas profissional
- Evite respostas muito longas, seja objetivo

Contexto da empresa:
${JSON.stringify(aiMemory?.context || {}, null, 2)}`;

    // Call Groq API
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
          ...conversationHistory,
          { role: 'user', content: clientMessage }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Groq API error:', error);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('AI WhatsApp - Generated response successfully');

    // Save AI response to messages
    await supabase.from('messages').insert({
      attendance_id: attendanceId,
      sender_type: 'agent',
      sender_id: null,
      content: aiResponse
    });

    return new Response(
      JSON.stringify({ response: aiResponse }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-whatsapp-response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
