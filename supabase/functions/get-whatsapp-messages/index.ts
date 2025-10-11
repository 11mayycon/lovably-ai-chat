import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { instanceName, remoteJid } = await req.json();
    
    console.log('Buscando mensagens para:', { instanceName, remoteJid });
    
    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL');
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY');

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Evolution API não configurada" 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Buscar mensagens da Evolution API
    const url = `${EVO_BASE_URL}/chat/fetchMessages/${instanceName}?remoteJid=${encodeURIComponent(remoteJid)}&limit=100`;
    console.log('URL da requisição:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na Evolution API:', response.status, errorText);
      throw new Error(`Erro na Evolution API: ${response.status}`);
    }

    const data = await response.json();
    console.log('Mensagens recebidas:', Array.isArray(data) ? data.length : 0);
    
    // Formatar mensagens
    const messages = (Array.isArray(data) ? data : [])
      .filter((msg: any) => msg.key && msg.message) // Apenas mensagens válidas
      .map((msg: any) => {
        const isFromMe = msg.key.fromMe;
        const messageContent = msg.message.conversation || 
                             msg.message.extendedTextMessage?.text || 
                             msg.message.imageMessage?.caption ||
                             msg.message.videoMessage?.caption ||
                             '[Mídia]';
        
        return {
          id: msg.key.id,
          content: messageContent,
          sender_type: isFromMe ? 'agent' : 'client',
          created_at: new Date(msg.messageTimestamp * 1000).toISOString(),
          timestamp: msg.messageTimestamp,
        };
      })
      .sort((a: any, b: any) => a.timestamp - b.timestamp); // Ordenar por timestamp

    console.log('Mensagens processadas:', messages.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messages,
        total: messages.length 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro ao buscar mensagens:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: (error as Error).message || "Erro interno do servidor" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
