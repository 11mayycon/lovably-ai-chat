import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { instanceName } = await req.json();
    
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

    // Buscar contatos da Evolution API
    const response = await fetch(`${EVO_BASE_URL}/chat/findContacts/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na Evolution API: ${response.status}`);
    }

    const data = await response.json();
    
    // Filtrar e formatar contatos
    const contacts = (Array.isArray(data) ? data : [])
      .map((contact: any) => ({
        id: contact.id || contact.remoteJid,
        name: contact.pushName || contact.name || contact.verifiedName || (contact.id || '').replace('@s.whatsapp.net', ''),
        phone: (contact.id || contact.remoteJid || '').replace('@s.whatsapp.net', ''),
        profilePicUrl: contact.profilePicUrl || contact.profilePictureUrl || null,
        isGroup: String(contact.id || '').includes('@g.us'),
        lastSeen: contact.lastSeen || null,
      }))
      .slice(0, 200); // Limitar para segurança

    return new Response(
      JSON.stringify({ 
        success: true, 
        contacts,
        total: contacts.length 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro ao buscar contatos:", error);
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