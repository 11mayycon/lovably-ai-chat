// Sync Messages - Sincroniza mensagens entre Evolution API e Supabase
// Função auxiliar para buscar mensagens históricas e manter sincronização

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SyncRequest {
  instanceName: string;
  contactNumber?: string;
  limit?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[sync-messages] Iniciando sincronização de mensagens");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const evolutionApiUrl = Deno.env.get("EVO_BASE_URL");
    const evolutionApiKey = Deno.env.get("EVO_API_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!evolutionApiUrl || !evolutionApiKey) {
      throw new Error("Missing EVO_BASE_URL or EVO_API_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const { instanceName, contactNumber, limit = 50 }: SyncRequest = await req.json();

    console.log("[sync-messages] Instância:", instanceName);
    console.log("[sync-messages] Contato:", contactNumber || "todos");
    console.log("[sync-messages] Limite:", limit);

    // Buscar mensagens da Evolution API
    let evolutionUrl = `${evolutionApiUrl}/chat/findMessages/${instanceName}`;
    const params = new URLSearchParams();
    
    if (contactNumber) {
      params.append("where", JSON.stringify({
        key: {
          remoteJid: `${contactNumber}@s.whatsapp.net`
        }
      }));
    }
    
    params.append("limit", limit.toString());
    
    if (params.toString()) {
      evolutionUrl += `?${params.toString()}`;
    }

    console.log("[sync-messages] Buscando mensagens da Evolution API...");
    
    const evolutionResponse = await fetch(evolutionUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
    });

    if (!evolutionResponse.ok) {
      throw new Error(`Erro na Evolution API: ${evolutionResponse.status} ${evolutionResponse.statusText}`);
    }

    const evolutionMessages = await evolutionResponse.json();
    console.log("[sync-messages] Mensagens encontradas:", evolutionMessages.length);

    let processedCount = 0;
    let skippedCount = 0;

    for (const msg of evolutionMessages) {
      try {
        // Extrair informações da mensagem
        const remoteJid = msg.key?.remoteJid;
        const fromMe = msg.key?.fromMe || false;
        const messageId = msg.key?.id;
        
        if (!remoteJid || !messageId) {
          skippedCount++;
          continue;
        }

        // Extrair texto da mensagem
        let messageText = "";
        if (msg.message?.conversation) {
          messageText = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
          messageText = msg.message.extendedTextMessage.text;
        }

        if (!messageText) {
          skippedCount++;
          continue;
        }

        // Extrair número do contato
        const contactNum = remoteJid.replace("@s.whatsapp.net", "").replace("@g.us", "");
        const contactName = msg.pushName || contactNum;

        // Verificar/criar contato
        let contact = await supabase
          .from("contacts")
          .select("*")
          .eq("number", contactNum)
          .eq("instance_id", instanceName)
          .maybeSingle();

        if (contact.error) {
          console.error("[sync-messages] Erro ao buscar contato:", contact.error);
          continue;
        }

        if (!contact.data) {
          const newContact = await supabase
            .from("contacts")
            .insert({
              name: contactName,
              number: contactNum,
              instance_id: instanceName,
              created_at: new Date().toISOString()
            })
            .select()
            .single();

          if (newContact.error) {
            console.error("[sync-messages] Erro ao criar contato:", newContact.error);
            continue;
          }

          contact.data = newContact.data;
        }

        // Verificar se a mensagem já existe
        const existingMessage = await supabase
          .from("messages")
          .select("id")
          .eq("message_id", messageId)
          .eq("contact_id", contact.data.id)
          .maybeSingle();

        if (existingMessage.data) {
          skippedCount++;
          continue;
        }

        // Salvar mensagem
        const messageInsert = await supabase
          .from("messages")
          .insert({
            contact_id: contact.data.id,
            instance_id: instanceName,
            message_id: messageId,
            content: messageText,
            direction: fromMe ? "out" : "in",
            timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString(),
            created_at: new Date().toISOString()
          });

        if (messageInsert.error) {
          console.error("[sync-messages] Erro ao salvar mensagem:", messageInsert.error);
          continue;
        }

        processedCount++;

      } catch (error) {
        console.error("[sync-messages] Erro ao processar mensagem:", error);
        skippedCount++;
      }
    }

    console.log("[sync-messages] Sincronização concluída:");
    console.log("- Processadas:", processedCount);
    console.log("- Ignoradas:", skippedCount);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        skipped: skippedCount,
        total: evolutionMessages.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[sync-messages] Erro:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 500 
      }
    );
  }
});