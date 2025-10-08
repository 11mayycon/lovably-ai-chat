import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { instanceName } = await req.json();
    
    const evolutionApiUrl = Deno.env.get('EVOLUTION_API_URL');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
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
    const response = await fetch(`${evolutionApiUrl}/chat/findContacts/${instanceName}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': evolutionApiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Erro na Evolution API: ${response.status}`);
    }

    const data = await response.json();
    
    // Filtrar e formatar contatos
    const contacts = data
      .filter((contact: any) => contact.id && contact.pushName)
      .map((contact: any) => ({
        id: contact.id,
        name: contact.pushName || contact.id,
        phone: contact.id.replace('@s.whatsapp.net', ''),
        profilePicUrl: contact.profilePicUrl || null,
        isGroup: contact.id.includes('@g.us'),
        lastSeen: contact.lastSeen || null
      }))
      .slice(0, 50); // Limitar a 50 contatos

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