import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { instanceName } = await req.json();
    
    console.log('Buscando chats para instância:', instanceName);
    
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

    // Buscar chats da Evolution API - endpoint correto
    const response = await fetch(`${EVO_BASE_URL}/chat/findChats/${instanceName}`, {
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
    console.log('Dados recebidos da Evolution:', data);
    
    // Formatar chats com todas as informações necessárias
    const chats = (Array.isArray(data) ? data : [])
      .filter((chat: any) => chat.id) // Apenas chats com ID válido
      .map((chat: any) => {
        const chatId = chat.id;
        const isGroup = chatId.includes('@g.us');
        
        return {
          id: chatId,
          name: chat.name || chat.pushName || chat.verifiedName || chatId.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          profilePicUrl: chat.profilePicUrl || null,
          isGroup,
          unreadCount: chat.unreadCount || 0,
          lastMessage: chat.lastMessage?.message || null,
          lastMessageTimestamp: chat.lastMessage?.messageTimestamp || chat.conversationTimestamp || null,
        };
      })
      .sort((a: any, b: any) => {
        // Ordenar por timestamp da última mensagem (mais recente primeiro)
        const timeA = a.lastMessageTimestamp || 0;
        const timeB = b.lastMessageTimestamp || 0;
        return timeB - timeA;
      });

    console.log('Chats processados:', chats.length);

    return new Response(
      JSON.stringify({ 
        success: true, 
        chats,
        total: chats.length 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro ao buscar chats:", error);
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
