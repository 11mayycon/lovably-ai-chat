// supabase/functions/evolution/index.ts
// Função Edge: integra Evolution API com validação, logs, retries e endpoint de debug

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// @ts-ignore
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const body = await req.json().catch(() => ({}));
    const { action, instanceName } = body;

    // @ts-ignore
    const EVOLUTION_API_URL = Deno.env.get('EVO_BASE_URL');
    // @ts-ignore
    const EVOLUTION_API_KEY = Deno.env.get('EVO_API_KEY');
    // @ts-ignore
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 🔍 Logs iniciais para debug (redact secrets)
    console.log("🟣 [EVOLUTION DEBUG] Início");
    console.log("🔹 Path:", path);
    console.log("🔹 Action:", action);
    console.log("🔹 Instance:", instanceName || "ISA");
    console.log("🔹 EVOLUTION_API_URL:", EVOLUTION_API_URL);
    console.log("🔹 Tem chave de API?:", EVOLUTION_API_KEY ? "✅ Sim" : "❌ Não");

    if (!EVOLUTION_API_URL) {
      console.error("❌ ERRO: EVO_BASE_URL não configurado!");
      return new Response(
        JSON.stringify({ 
          error: "Servidor Evolution API não configurado",
          details: "Entre em contato com o administrador para configurar a integração com Evolution API"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!EVOLUTION_API_KEY) {
      console.error("❌ ERRO: EVO_API_KEY não configurado!");
      return new Response(
        JSON.stringify({ 
          error: "Chave da Evolution API não configurada",
          details: "Entre em contato com o administrador para configurar a integração com Evolution API"
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Utilitário: redatar tokens
    const redact = (obj: Record<string, unknown>) => {
      try {
        const clone = JSON.parse(JSON.stringify(obj || {}));
        if (clone && typeof clone === 'object') {
          for (const key of Object.keys(clone)) {
            if (['token', 'apikey', 'apiKey', 'authorization'].includes(key)) {
              (clone as any)[key] = '[REDACTED]';
            }
          }
        }
        return clone;
      } catch {
        return obj;
      }
    };

    // Utilitário: fetch com retries limitados (429 e 5xx)
    const evoFetch = async (
      input: string,
      init?: RequestInit,
      retries = 2,
      backoffMs = 500
    ): Promise<Response> => {
      const start = Date.now();
      let attempt = 0;
      while (true) {
        const res = await fetch(input, init);
        const duration = Date.now() - start;
        console.log(`⏱️ Evolution resposta em ${duration}ms (status ${res.status})`);
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          if (attempt < retries) {
            const wait = backoffMs * Math.pow(2, attempt);
            console.log(`🔁 Retry ${attempt + 1}/${retries} em ${wait}ms para ${input}`);
            await new Promise((r) => setTimeout(r, wait));
            attempt++;
            continue;
          }
        }
        return res;
      }
    };

    // Endpoint de debug: GET /debug/evolution/echo
    if (req.method === 'GET' && path.endsWith('/debug/evolution/echo')) {
      const start = Date.now();
      try {
        const res = await fetch(EVOLUTION_API_URL!, { method: 'HEAD' }).catch(() => fetch(EVOLUTION_API_URL!));
        const duration = Date.now() - start;
        const ok = res.ok;
        return new Response(
          JSON.stringify({ ok, status: res.status, statusText: res.statusText, responseTimeMs: duration }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        const duration = Date.now() - start;
        return new Response(
          JSON.stringify({ ok: false, error: (err as Error).message, responseTimeMs: duration }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 🔄 Switch principal
    switch (action) {
      case "createInstance": {
        // Validação básica do payload
        const name = (instanceName && String(instanceName).trim()) || "ISA";
        console.log("🟢 createInstance ->", name);
        console.log("📥 Body:", JSON.stringify(redact(body)));

        const response = await evoFetch(`${EVOLUTION_API_URL}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": EVOLUTION_API_KEY,
          },
          body: JSON.stringify({
            instanceName: name,
            webhookUrl: "https://hook.inovapro.cloud/whatsapp",
            integration: "WHATSAPP-BAILEYS",
            qrcode: true,
          }),
        });
        console.log("📡 Evolution Status:", response.status, response.statusText);

        const text = await response.text();
        console.log("📜 Corpo da resposta Evolution:", text);

        if (!response.ok) {
          // Parse error message if possible
          let errorMessage = "Erro ao criar instância no WhatsApp";
          let errorDetails = text;
          
          try {
            const errorData = JSON.parse(text);
            if (errorData.response?.message) {
              const msg = Array.isArray(errorData.response.message) 
                ? errorData.response.message.join(', ') 
                : errorData.response.message;
              
              // Check for specific error
              if (msg.includes('evolution_api.Instance') && msg.includes('does not exist')) {
                errorMessage = "Banco de dados da Evolution API não configurado";
                errorDetails = "A Evolution API não está configurada corretamente. Verifique se o banco de dados foi inicializado e as tabelas foram criadas.";
              } else {
                errorMessage = "Erro na Evolution API";
                errorDetails = msg;
              }
            }
          } catch (e) {
            // Keep original text if parsing fails
          }
          
          return new Response(
            JSON.stringify({
              error: errorMessage,
              details: errorDetails,
              status: response.status,
              statusText: response.statusText,
            }),
            { 
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const data = JSON.parse(text);
        console.log("✅ Instância criada com sucesso!");
        // Formato amigável para o frontend
        const payload = {
          instanceName: name,
          qrcode: data?.qrcode?.code || null,
          instance: data?.instance || null,
          raw: data,
        };
        return new Response(JSON.stringify(payload), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case "checkStatus": {
        const name = (instanceName && String(instanceName).trim()) || "ISA";
        console.log("🟢 checkStatus ->", name);
        const response = await evoFetch(
          `${EVOLUTION_API_URL}/instance/connectionState/${name}`,
          { headers: { "apikey": EVOLUTION_API_KEY } }
        );

        console.log("📡 Status check response:", response.status, response.statusText);
        
        const text = await response.text();
        console.log("📜 Status response body:", text);

        if (!response.ok) {
          return new Response(
            JSON.stringify({
              error: "Erro ao verificar status",
              status: response.status,
              statusText: response.statusText,
              body: text,
            }),
            { 
              status: response.status,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }

        const data = JSON.parse(text);
        return new Response(JSON.stringify({ instanceName: name, ...data }), { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case "deleteInstance": {
        const name = (instanceName && String(instanceName).trim()) || "ISA";
        console.log("🟡 deleteInstance ->", name);
        const response = await evoFetch(
          `${EVOLUTION_API_URL}/instance/delete/${name}`,
          { method: "DELETE", headers: { "apikey": EVOLUTION_API_KEY || "" } }
        );
        const text = await response.text();
        if (!response.ok) {
          return new Response(text || '{}', { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
        return new Response(text || '{}', { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      default:
        console.error("❌ Ação inválida:", action);
        return new Response(JSON.stringify({ error: "Ação inválida", details: { path, action } }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error: any) {
    console.error("💥 ERRO GERAL NA FUNÇÃO:", error.message);
    console.error("🧾 Stack:", error.stack);

    return new Response(
      JSON.stringify({
        error: "Falha na chamada da função",
        message: error.message,
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
