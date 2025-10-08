import { corsHeaders } from "../_shared/cors.ts";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    // Get the message and context from the request body
    const { message, contextChat } = await req.json();

    if (!message || typeof message !== 'string') {
      throw new Error("A mensagem é obrigatória e deve ser uma string.");
    }

    // Prepare messages for Lovable AI Gateway
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT }
    ];

    // Add context messages if provided
    if (contextChat && Array.isArray(contextChat)) {
      contextChat.forEach((msg: any) => {
        if (msg.role && msg.content) {
          messages.push({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          });
        }
      });
    }

    // Add the current user message
    messages.push({
      role: "user",
      content: message
    });

    // Call the Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Limite de requisições excedido. Por favor, tente novamente em alguns instantes.");
      }
      if (response.status === 402) {
        throw new Error("Créditos insuficientes. Por favor, adicione créditos à sua conta Lovable.");
      }
      throw new Error("Erro ao comunicar com a IA. Tente novamente.");
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

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
    
    if ((error as Error).message.includes("Limite de requisições")) {
      errorMessage = (error as Error).message;
    } else if ((error as Error).message.includes("Créditos insuficientes")) {
      errorMessage = (error as Error).message;
    } else if ((error as Error).message.includes("comunicar com a IA")) {
      errorMessage = (error as Error).message;
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