
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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

Responda sempre em português brasileiro.
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the attendance ID from the request body
    const { attendance_id } = await req.json();

    if (!attendance_id) {
      throw new Error("O ID do atendimento (attendance_id) é obrigatório.");
    }
    
    // 1. Fetch the last 10 messages from the conversation for context
    const { data: messages, error: historyError } = await supabaseAdmin
      .from("messages")
      .select("content, sender_type")
      .eq("attendance_id", attendance_id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (historyError) throw historyError;

    // 2. Format the message history for the Groq API
    // The roles are mapped to 'user' (for the agent) and 'assistant' (for the AI)
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.reverse().map((msg) => ({
        role: msg.sender_type === "agent" ? "user" : "assistant",
        content: msg.content,
      })),
    ];
    
    // 3. Call the Groq API to get the AI's response
    const chatCompletion = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama3-8b-8192", // Efficient and capable model
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false, // We wait for the full response
    });

    const aiResponse = chatCompletion.choices[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("A IA não conseguiu gerar uma resposta.");
    }

    // 4. Save the AI's response back into the messages table
    const { error: insertError } = await supabaseAdmin.from("messages").insert({
      attendance_id: attendance_id,
      sender_type: "ai",
      sender_id: "a1b2c3d4-e5f6-7890-1234-567890abcdef", // The fixed user ID for the bot
      content: aiResponse,
    });

    if (insertError) throw insertError;

    // Return a success response
    return new Response(JSON.stringify({ success: true, message: "Resposta da IA processada e salva." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erro na função groq-message-handler:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Internal Server Error for failures
    });
  }
});
