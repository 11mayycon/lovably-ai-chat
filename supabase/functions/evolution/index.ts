// ============================================
// EVOLUTION API - UNIFIED GATEWAY
// Integração completa com Evolution API v2.3.4
// ============================================
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EvolutionRequest {
  action: 'createInstance' | 'deleteInstance' | 'getQR' | 'checkStatus' | 'sendMessage' | 'sendImage' | 'fetchInstances';
  instanceName?: string;
  userId?: string;
  number?: string;
  text?: string;
  image?: string;
  caption?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Obter credenciais Evolution da env
    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL') || 'http://31.97.94.107:8080';
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY') || 'B6D711FCDE4D4FD5936544120E713976';
    
    console.log(`[Evolution] Base URL: ${EVO_BASE_URL}`);
    
    const body: EvolutionRequest = await req.json();
    const { action, instanceName, userId, number, text, image, caption } = body;

    console.log(`[Evolution] Action: ${action}`, { instanceName, userId });

    // Headers padrão para Evolution API
    const headers = {
      'apikey': EVO_API_KEY,
      'Content-Type': 'application/json',
    };

    // ============================================
    // 1. CREATE INSTANCE (Criar nova instância)
    // ============================================
    if (action === 'createInstance') {
      const newInstanceName = instanceName || `isa_user_${userId || Date.now()}`;
      
      console.log(`[Evolution] Creating instance: ${newInstanceName}`);

      const createResponse = await fetch(`${EVO_BASE_URL}/instance/create`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          instanceName: newInstanceName,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        })
      });

      const createData = await createResponse.json();
      console.log('[Evolution] Create response:', createData);

      if (!createResponse.ok && createResponse.status !== 201) {
        // Se a instância já existe, não é erro crítico
        if (createData.error?.includes('already exists') || createData.message?.includes('already exists')) {
          console.log('[Evolution] Instance already exists, continuing...');
          return new Response(
            JSON.stringify({ 
              success: true, 
              action, 
              result: { instanceName: newInstanceName, alreadyExists: true }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        throw new Error(createData.error || createData.message || 'Erro ao criar instância');
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          action, 
          result: { ...createData, instanceName: newInstanceName }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 2. DELETE INSTANCE (Deletar instância)
    // ============================================
    if (action === 'deleteInstance') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para deleteInstance');
      }

      console.log(`[Evolution] Deleting instance: ${instanceName}`);

      const deleteResponse = await fetch(`${EVO_BASE_URL}/instance/delete/${instanceName}`, {
        method: 'DELETE',
        headers
      });

      const deleteData = await deleteResponse.json();
      console.log('[Evolution] Delete response:', deleteData);

      if (!deleteResponse.ok) {
        throw new Error(deleteData.error || deleteData.message || 'Erro ao deletar instância');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: deleteData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 3. GET QR CODE (Obter QR Code)
    // ============================================
    if (action === 'getQR') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para getQR');
      }
      
      console.log(`[Evolution] Fetching QR for: ${instanceName}`);

      const qrResponse = await fetch(`${EVO_BASE_URL}/instance/connect/${instanceName}`, {
        method: 'GET',
        headers
      });

      const qrData = await qrResponse.json();
      console.log('[Evolution] QR response:', qrData);

      if (!qrResponse.ok) {
        throw new Error(qrData.error || qrData.message || 'Erro ao obter QR Code');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: qrData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 4. FETCH INSTANCES (Listar instâncias)
    // ============================================
    if (action === 'fetchInstances') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para fetchInstances');
      }
      
      console.log(`[Evolution] Fetching instances: ${instanceName}`);

      const fetchResponse = await fetch(`${EVO_BASE_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers
      });

      const fetchData = await fetchResponse.json();
      console.log('[Evolution] Fetch response:', fetchData);

      if (!fetchResponse.ok) {
        throw new Error(fetchData.error || fetchData.message || 'Erro ao buscar instâncias');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: fetchData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 5. CHECK STATUS (Verificar status)
    // ============================================
    if (action === 'checkStatus') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para checkStatus');
      }
      
      console.log(`[Evolution] Checking status: ${instanceName}`);

      const statusResponse = await fetch(`${EVO_BASE_URL}/instance/fetchInstances?instanceName=${instanceName}`, {
        method: 'GET',
        headers
      });

      const statusData = await statusResponse.json();
      console.log('[Evolution] Status response:', statusData);

      if (!statusResponse.ok) {
        throw new Error(statusData.error || statusData.message || 'Erro ao verificar status');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: statusData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 6. SEND MESSAGE (Enviar mensagem texto)
    // ============================================
    if (action === 'sendMessage') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para sendMessage');
      }
      
      if (!number || !text) {
        throw new Error('number e text são obrigatórios para sendMessage');
      }

      console.log(`[Evolution] Sending message from ${instanceName} to ${number}`);

      const sendResponse = await fetch(`${EVO_BASE_URL}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: number,
          text: text
        })
      });

      const sendData = await sendResponse.json();
      console.log('[Evolution] Send message response:', sendData);

      if (!sendResponse.ok) {
        throw new Error(sendData.error || sendData.message || 'Erro ao enviar mensagem');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: sendData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================
    // 7. SEND IMAGE (Enviar imagem)
    // ============================================
    if (action === 'sendImage') {
      if (!instanceName) {
        throw new Error('instanceName é obrigatório para sendImage');
      }
      
      if (!number || !image) {
        throw new Error('number e image são obrigatórios para sendImage');
      }

      console.log(`[Evolution] Sending image from ${instanceName} to ${number}`);

      const sendResponse = await fetch(`${EVO_BASE_URL}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          number: number,
          mediatype: 'image',
          media: image,
          caption: caption || ''
        })
      });

      const sendData = await sendResponse.json();
      console.log('[Evolution] Send image response:', sendData);

      if (!sendResponse.ok) {
        throw new Error(sendData.error || sendData.message || 'Erro ao enviar imagem');
      }

      return new Response(
        JSON.stringify({ success: true, action, result: sendData }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação inválida
    throw new Error(`Ação inválida: ${action}`);

  } catch (error) {
    console.error('[Evolution] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
