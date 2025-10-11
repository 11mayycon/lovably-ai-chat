import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { instanceName } = await req.json();
    
    console.log('Verificando status da conexão para:', instanceName);
    
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

    // Verificar status da conexão
    const response = await fetch(`${EVO_BASE_URL}/instance/connectionState/${instanceName}`, {
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
    console.log('Status da conexão:', data);
    
    const status = data?.instance?.state || 'disconnected';

    return new Response(
      JSON.stringify({ 
        success: true, 
        status,
        connected: status === 'open'
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Erro ao verificar status da conexão:", error);
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
