// @deno-types="https://esm.sh/@supabase/supabase-js@2/dist/module/index.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="https://esm.sh/groq-sdk@0.3.3/index.d.ts"
import Groq from "https://esm.sh/groq-sdk@0.3.3";
import { corsHeaders } from "../_shared/cors.ts";

// Initialize Groq client with the API key from environment variables
const groq = new Groq({
  apiKey: Deno.env.get("GROQ_API_KEY"),
});

// System prompt that defines the AI's persona and role
const SYSTEM_PROMPT = `
Você é o "INOVAPRO AI", um assistente virtual inteligente integrado ao sistema de atendimento da InovaPro.
Sua principal função é auxiliar os agentes de suporte humano, fornecendo informações rápidas, sugerindo respostas e ajudando a resolver os problemas dos clientes de forma eficiente.

## Suas Capacidades:
- **Respostas Rápidas:** Fornecer respostas claras e concisas para as perguntas dos agentes.
- **Sugestão de Respostas:** Ajudar a formular respostas para os clientes com base no histórico da conversa.
- **Base de Conhecimento:** Você tem acesso a uma base de conhecimento sobre produtos, serviços e procedimentos comuns da empresa.
- **Tom Profissional e Amigável:** Mantenha sempre um tom prestativo, profissional e amigável em suas interações.

## Como Interagir:
- O agente de suporte irá conversar com você em uma sala de chat privada.
- Você receberá o histórico da conversa para ter contexto.
- Responda diretamente às perguntas e solicitações do agente.

Responda sempre em português brasileiro de forma clara e objetiva.
`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get the message and context from the request body
    const { message, contextChat } = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error("A mensagem é obrigatória e deve ser uma string.");
    }

    // Prepare messages for Groq API
    const groqMessages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // Add context messages if provided
    if (contextChat && Array.isArray(contextChat)) {
      contextChat.forEach((msg: any) => {
        if (msg.role && msg.content) {
          groqMessages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        }
      });
    }

    // Add the current user message
    groqMessages.push({
      role: "user",
      content: message
    });

    // Call the Groq API to get the AI's response
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: Deno.env.get("GROQ_MODEL") || "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("A IA não conseguiu gerar uma resposta.");
    }

    // Return the AI response
    return new Response(JSON.stringify({ 
      reply: aiResponse,
      success: true 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função ai-direct-chat:", (error as Error).message);
    
    // Return a more user-friendly error message
    let errorMessage = "Erro interno do servidor. Tente novamente.";
    
    if ((error as Error).message.includes("API key")) {
      errorMessage = "Chave da API Groq não configurada. Entre em contato com o administrador.";
    } else if ((error as Error).message.includes("rate limit")) {
      errorMessage = "Muitas solicitações. Aguarde alguns segundos e tente novamente.";
    } else if ((error as Error).message.includes("model")) {
      errorMessage = "Modelo de IA indisponível. Tente novamente em alguns instantes.";
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});