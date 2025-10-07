
import { createClient } from '''https://esm.sh/@supabase/supabase-js@2''';

const corsHeaders = {
  '''Access-Control-Allow-Origin''': '''*''',
  '''Access-Control-Allow-Headers''': '''authorization, x-client-info, apikey, content-type''',
};

// Função principal do Deno
Deno.serve(async (req) => {
  if (req.method === '''OPTIONS''') {
    return new Response('''ok''', { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVO_BASE_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVO_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Credenciais da Evolution API não configuradas.");
    }

    console.log("[EVOLUTION] API URL:", EVOLUTION_API_URL);

    const { action, instanceName, numeroWhatsApp } = await req.json();
    console.log(`[EVOLUTION] Action: ${action}, Instance: ${instanceName || 'new'}`);

    switch (action) {
      case '''createInstance''':
        return await handleCreateInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, numeroWhatsApp);
      case '''checkStatus''':
        if (!instanceName) throw new Error("O '''instanceName''' é obrigatório para '''checkStatus'''.");
        return await handleCheckStatus(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      case '''deleteInstance''':
        if (!instanceName) throw new Error("O '''instanceName''' é obrigatório para '''deleteInstance'''.");
        return await handleDeleteInstance(EVOLUTION_API_URL, EVOLUTION_API_KEY, instanceName);
      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }
  } catch (err) {
    console.error("[EVOLUTION-ERROR]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
        status: 400,
      }
    );
  }
});

async function handleCreateInstance(apiUrl: string, apiKey: string, numeroWhatsApp: string | undefined) {
  if (!numeroWhatsApp) {
    throw new Error("O campo 'numeroWhatsApp' é obrigatório para criar uma instância.");
  }

  const generatedInstanceName = `isa_instance_${Date.now().toString(36)}`;
  const token = `token_${Date.now().toString(36)}`;
  const url = `${apiUrl}/instance/create`;
  
  const requestBody = {
    instanceName: generatedInstanceName,
    token,
    qrcode: true,
    number: numeroWhatsApp,
    webhook: `${Deno.env.get("SUPABASE_URL")}/functions/v1/evolution-webhook`,
    webhook_by_events: true,
    events: [
      "APPLICATION_STARTUP",
      "QRCODE_UPDATED",
      "CONNECTION_UPDATE",
      "MESSAGES_UPSERT",
      "MESSAGES_UPDATE",
      "SEND_MESSAGE"
    ]
  };
  
  const apiHeaders = {
    '''Content-Type''': '''application/json''',
    '''apikey''': apiKey,
  };

  console.log("[EVOLUTION] Criando instância:", generatedInstanceName);

  const evolutionResponse = await fetch(url, {
    method: '''POST''',
    headers: apiHeaders,
    body: JSON.stringify(requestBody),
  });

  const responseBody = await evolutionResponse.json();

  if (!evolutionResponse.ok) {
    const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
    throw new Error(`A Evolution API retornou erro (Status: ${evolutionResponse.status}): ${errorMessage}`);
  }

  console.log("[EVOLUTION] Instância criada com sucesso");

  // Aguardar 3 segundos para a instância inicializar
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Tentar obter o QR Code
  try {
    const connectUrl = `${apiUrl}/instance/connect/${generatedInstanceName}`;
    const qrResponse = await fetch(connectUrl, { 
      method: '''GET''', 
      headers: { '''apikey''': apiKey } 
    });
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      responseBody.qrcode = qrData.qrcode;
      console.log("[EVOLUTION] QR Code obtido com sucesso");
    }
  } catch (qrError) {
    console.error("[EVOLUTION] Erro ao obter QR Code:", qrError);
  }

  return new Response(
    JSON.stringify({ success: true, data: responseBody }),
    {
      headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
      status: 200,
    }
  );
}

async function handleCheckStatus(apiUrl: string, apiKey: string, instanceName: string) {
  const url = `${apiUrl}/instance/connectionState/${instanceName}`;
  const apiHeaders = { '''apikey''': apiKey };
  
  console.log("[EVOLUTION] Verificando status:", instanceName);
  
  const evolutionResponse = await fetch(url, { method: '''GET''', headers: apiHeaders });
  const responseBody = await evolutionResponse.json();
  
  if (!evolutionResponse.ok) {
    const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
    throw new Error(`Erro ao verificar status (Status: ${evolutionResponse.status}): ${errorMessage}`);
  }
  
  console.log("[EVOLUTION] Status:", responseBody.instance?.state);
  
  return new Response(JSON.stringify({ success: true, data: responseBody }), {
    headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
    status: 200,
  });
}
async function handleDeleteInstance(apiUrl: string, apiKey: string, instanceName: string) {
  const url = `${apiUrl}/instance/logout/${instanceName}`;
  const apiHeaders = { '''apikey''': apiKey };
  
  console.log("[EVOLUTION] Deletando instância:", instanceName);
  
  const evolutionResponse = await fetch(url, { method: '''DELETE''', headers: apiHeaders });
  
  if (!evolutionResponse.ok) {
    try {
      const responseBody = await evolutionResponse.json();
      if (responseBody.message && responseBody.message.includes("instance not found")) {
        console.log("[EVOLUTION] Instância já não existe");
      } else {
        const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
        throw new Error(`Erro ao deletar instância (Status: ${evolutionResponse.status}): ${errorMessage}`);
      }
    } catch (e) {
      if (e.message.includes("Erro ao deletar")) throw e;
    }
  }
  
  console.log("[EVOLUTION] Instância desconectada com sucesso");
  
  return new Response(JSON.stringify({ success: true, data: { message: "Instância desconectada com sucesso." } }), {
    headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
    status: 200,
  });
}
