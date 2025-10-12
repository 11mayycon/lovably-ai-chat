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
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          chats: [],
          error: `Evolution API retornou erro: ${response.status}`,
          details: errorText
        }),
        { 
          status: 200, // Retornar 200 mas com success: false
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const data = await response.json();
    console.log('Dados recebidos da Evolution (tipo):', typeof data, 'é array:', Array.isArray(data));
    console.log('Dados recebidos (amostra):', JSON.stringify(data).substring(0, 500));
    
    // A Evolution API pode retornar array direto ou objeto com array
    let chatsArray = [];
    if (Array.isArray(data)) {
      chatsArray = data;
    } else if (data && Array.isArray(data.chats)) {
      chatsArray = data.chats;
    } else if (data && Array.isArray(data.data)) {
      chatsArray = data.data;
    } else {
      console.log('Formato inesperado de resposta:', data);
    }
    
    console.log('Total de chats no array:', chatsArray.length);
    
    // Formatar chats com todas as informações necessárias
    const chats = chatsArray
      .filter((chat: any) => chat && chat.id) // Apenas chats com ID válido
      .map((chat: any) => {
        const chatId = chat.id;
        const isGroup = chatId.includes('@g.us');
        
        return {
          id: chatId,
          name: chat.name || chat.pushName || chat.verifiedName || chatId.replace('@s.whatsapp.net', '').replace('@g.us', ''),
          pushName: chat.pushName || chat.name || '',
          profilePicUrl: chat.profilePicUrl || null,
          isGroup,
          unreadCount: chat.unreadCount || 0,
          lastMessage: chat.lastMessage?.message || chat.lastMessage || null,
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
    if (chats.length > 0) {
      console.log('Primeiro chat (exemplo):', JSON.stringify(chats[0], null, 2));
    }

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
