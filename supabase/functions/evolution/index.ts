
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
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      throw new Error("Credenciais da Evolution API não encontradas no Supabase.");
    }

    // CORREÇÃO: Extrair 'numeroWhatsApp' do corpo da requisição
    const { action, instanceName, numeroWhatsApp } = await req.json();

    switch (action) {
      case '''createInstance''':
        // CORREÇÃO: Passar 'numeroWhatsApp' para a função de criação
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
    console.error("[EVOLUTION-FUNCTION-ERROR]", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
        status: 400,
      }
    );
  }
});

// CORREÇÃO: A função agora aceita 'numeroWhatsApp'
async function handleCreateInstance(apiUrl: string, apiKey: string, numeroWhatsApp: string | undefined) {
  if (!numeroWhatsApp) {
    throw new Error("O campo '''numeroWhatsApp''' é obrigatório para criar uma instância.");
  }

  const generatedInstanceName = `isa_instance_${Date.now().toString(36)}`;
  const token = `token_${Date.now().toString(36)}`;
  const url = `${apiUrl}/instance/create`;
  
  const requestBody = {
    instanceName: generatedInstanceName,
    token,
    qrcode: true,
    number: numeroWhatsApp, // CORREÇÃO: Usando o número fornecido pelo frontend
  };
  
  const apiHeaders = {
    '''Content-Type''': '''application/json''',
    '''apikey''': apiKey,
  };

  console.log("Enviando para a Evolution API:", JSON.stringify(requestBody));

  const evolutionResponse = await fetch(url, {
    method: '''POST''',
    headers: apiHeaders,
    body: JSON.stringify(requestBody),
  });

  const responseBody = await evolutionResponse.json();

  if (!evolutionResponse.ok) {
    const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
    throw new Error(`A Evolution API retornou um erro (Status: ${evolutionResponse.status}): ${errorMessage}`);
  }

  return new Response(
    JSON.stringify({ success: true, data: responseBody }),
    {
      headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
      status: 200,
    }
  );
}

// (As funções handleCheckStatus e handleDeleteInstance permanecem as mesmas)
async function handleCheckStatus(apiUrl: string, apiKey: string, instanceName: string) {
    const url = `${apiUrl}/instance/connectionState/${instanceName}`;
    const apiHeaders = { '''apikey''': apiKey };
    const evolutionResponse = await fetch(url, { method: '''GET''', headers: apiHeaders });
    const responseBody = await evolutionResponse.json();
    if (!evolutionResponse.ok) {
      const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
      throw new Error(`Erro ao verificar status (Status: ${evolutionResponse.status}): ${errorMessage}`);
    }
    return new Response(JSON.stringify({ success: true, data: responseBody }), {
      headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
      status: 200,
    });
}
async function handleDeleteInstance(apiUrl: string, apiKey: string, instanceName: string) {
    const url = `${apiUrl}/instance/logout/${instanceName}`;
    const apiHeaders = { '''apikey''': apiKey };
    const evolutionResponse = await fetch(url, { method: '''DELETE''', headers: apiHeaders });
    if (!evolutionResponse.ok) {
      try {
          const responseBody = await evolutionResponse.json();
          if (responseBody.message && responseBody.message.includes("instance not found")) {
              // Continua se a instância não for encontrada
          } else {
              const errorMessage = responseBody.message || responseBody.error || JSON.stringify(responseBody);
              throw new Error(`Erro ao deletar instância (Status: ${evolutionResponse.status}): ${errorMessage}`);
          }
      } catch (e) {
          throw new Error(`Erro ao deletar instância (Status: ${evolutionResponse.status})`);
      }
    }
    return new Response(JSON.stringify({ success: true, data: { message: "Instância desconectada com sucesso." } }), {
      headers: { ...corsHeaders, '''Content-Type''': '''application/json''' },
      status: 200,
    });
}
