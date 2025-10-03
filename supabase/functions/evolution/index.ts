// Evolution API Integration - Unified Edge Function
// Handles all Evolution API operations through a single endpoint

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionRequest {
  action: 'getQR' | 'checkStatus' | 'sendMessage' | 'sendImage' | 'createInstance';
  number?: string;
  message?: string;
  text?: string;
  imageUrl?: string;
  caption?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL') || 'http://31.97.94.107:8080';
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY') || 'B6D711FCDE4D4FD5936544120E713976';
    const EVO_SESSION = Deno.env.get('EVO_SESSION') || 'isa25';

    console.log('[Evolution] Request received:', req.method);
    console.log('[Evolution] Base URL:', EVO_BASE_URL);
    console.log('[Evolution] Session:', EVO_SESSION);

    const body: EvolutionRequest = await req.json();
    const { action } = body;

    console.log('[Evolution] Action:', action);

    let result;

    switch (action) {
      case 'getQR': {
        console.log('[Evolution] Getting QR Code...');

        // 1) Buscar informações da instância
        const instancesRes = await fetch(
          `${EVO_BASE_URL}/instance/fetchInstances?instanceName=${EVO_SESSION}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!instancesRes.ok) {
          const errorText = await instancesRes.text();
          console.error('[Evolution] Instances fetch error:', errorText);
          throw new Error(`Evolution API error: ${instancesRes.status} - ${errorText}`);
        }

        const instances = await instancesRes.json();

        // 2) Solicitar o QR Code no endpoint de conexão
        const connectRes = await fetch(
          `${EVO_BASE_URL}/instance/connect/${EVO_SESSION}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!connectRes.ok) {
          const errorText = await connectRes.text();
          console.error('[Evolution] Connect error:', errorText);
          throw new Error(`Evolution API error: ${connectRes.status} - ${errorText}`);
        }

        const connectJson = await connectRes.json();

        // 3) Extrair o base64 de forma resiliente e garantir prefixo data URL
        let base64: string | undefined =
          connectJson?.qrcode?.base64 ||
          connectJson?.base64 ||
          connectJson?.qr ||
          connectJson?.qrcode;

        if (typeof base64 === 'string' && !base64.startsWith('data:image')) {
          base64 = `data:image/png;base64,${base64}`;
        }

        // 4) Anexar o QR Code ao primeiro item da lista, se existir
        if (Array.isArray(instances) && instances.length > 0) {
          (instances[0] as any).qrcode = { base64 };
        }

        result = instances;
        console.log('[Evolution] QR Code fetched successfully');
        break;
      }

      case 'checkStatus': {
        console.log('[Evolution] Checking status...');
        const response = await fetch(
          `${EVO_BASE_URL}/instance/fetchInstances?instanceName=${EVO_SESSION}`,
          {
            method: 'GET',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Evolution] Status check error:', errorText);
          throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        result = await response.json();
        console.log('[Evolution] Status checked successfully');
        break;
      }

      case 'sendMessage': {
        const number = body.number || body.text;
        const text = body.message || body.text;

        if (!number || !text) {
          throw new Error('Parameters "number" and "message" are required for sendMessage');
        }

        console.log('[Evolution] Sending message to:', number);

        const response = await fetch(
          `${EVO_BASE_URL}/message/sendText/${EVO_SESSION}`,
          {
            method: 'POST',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: number,
              text: text,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Evolution] Send message error:', errorText);
          throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        result = await response.json();
        console.log('[Evolution] Message sent successfully');
        break;
      }

      case 'sendImage': {
        const { number, imageUrl, caption } = body;

        if (!number || !imageUrl) {
          throw new Error('Parameters "number" and "imageUrl" are required for sendImage');
        }

        console.log('[Evolution] Sending image to:', number);

        const response = await fetch(
          `${EVO_BASE_URL}/message/sendImage/${EVO_SESSION}`,
          {
            method: 'POST',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              number: number,
              url: imageUrl,
              caption: caption || '',
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Evolution] Send image error:', errorText);
          throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        result = await response.json();
        console.log('[Evolution] Image sent successfully');
        break;
      }

      case 'createInstance': {
        console.log('[Evolution] Creating instance...');

        const response = await fetch(
          `${EVO_BASE_URL}/instance/create`,
          {
            method: 'POST',
            headers: {
              'apikey': EVO_API_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              instanceName: EVO_SESSION,
              integration: 'WHATSAPP-BAILEYS',
              qrcode: true,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[Evolution] Create instance error:', errorText);
          throw new Error(`Evolution API error: ${response.status} - ${errorText}`);
        }

        result = await response.json();
        console.log('[Evolution] Instance created successfully');
        break;
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action,
        result,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('[Evolution] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
