// supabase/functions/send-whatsapp-message/index.ts
// Envia mensagem do agente para o WhatsApp via Evolution API

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

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      throw new Error('Evolution API credentials not configured');
    }

    const { phoneNumber, message, instanceName } = await req.json();

    if (!phoneNumber || !message) {
      return new Response(
        JSON.stringify({ error: 'phoneNumber and message are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log('📤 Enviando mensagem para:', phoneNumber);
    console.log('💬 Conteúdo:', message);
    console.log('📱 Instância:', instanceName);

    // Formatar número no padrão internacional (remover caracteres especiais)
    const formattedNumber = phoneNumber.replace(/\D/g, '');
    const remoteJid = `${formattedNumber}@s.whatsapp.net`;

    // Enviar mensagem via Evolution API
    const response = await fetch(
      `${EVO_BASE_URL}/message/sendText/${instanceName}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVO_API_KEY,
        },
        body: JSON.stringify({
          number: remoteJid,
          text: message,
        }),
      }
    );

    const responseData = await response.json();

    if (!response.ok) {
      console.error('❌ Erro ao enviar mensagem:', responseData);
      throw new Error(responseData.message || 'Failed to send message');
    }

    console.log('✅ Mensagem enviada com sucesso!');

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Erro ao enviar mensagem WhatsApp:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
