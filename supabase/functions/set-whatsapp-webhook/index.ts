// supabase/functions/set-whatsapp-webhook/index.ts
// Configura webhook na Evolution API para uma instância

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // @ts-ignore
    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL');
    // @ts-ignore
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY');
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');

    if (!EVO_BASE_URL || !EVO_API_KEY || !SUPABASE_URL) {
      throw new Error('Evolution API credentials not configured');
    }

    const { instanceName } = await req.json();

    if (!instanceName) {
      return new Response(
        JSON.stringify({ error: 'instanceName is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('🔧 Configurando webhook para instância:', instanceName);

    // URL do webhook aponta para a edge function
    const webhookUrl = `${SUPABASE_URL}/functions/v1/whatsapp-webhook`;

    // Configurar webhook na Evolution API
    const response = await fetch(
      `${EVO_BASE_URL}/webhook/set/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_API_KEY,
        },
        body: JSON.stringify({
          url: webhookUrl,
          webhook_by_events: false,
          webhook_base64: false,
          events: [
            "QRCODE_UPDATED",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE", 
            "CONNECTION_UPDATE",
            "SEND_MESSAGE"
          ]
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao configurar webhook:', responseData);
      throw new Error(responseData.message || 'Failed to set webhook');
    }

    console.log('✅ Webhook configurado com sucesso:', webhookUrl);

    return new Response(
      JSON.stringify({ success: true, webhook: webhookUrl, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Erro ao configurar webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});