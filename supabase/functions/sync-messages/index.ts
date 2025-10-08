// Sync Messages - Sincroniza mensagens históricas da Evolution API para o Supabase
// Adaptado para trabalhar com a estrutura de attendances e messages

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface SyncRequest {
  instanceName: string;
  contactNumber?: string;
  attendanceId: string;
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
    const { instanceName, contactNumber, attendanceId, limit = 50 }: SyncRequest = await req.json();

    if (!attendanceId) {
      throw new Error("attendanceId is required");
    }

    console.log("[sync-messages] Instância:", instanceName);
    console.log("[sync-messages] Contato:", contactNumber);
    console.log("[sync-messages] Atendimento:", attendanceId);
    console.log("[sync-messages] Limite:", limit);

    // Buscar mensagens da Evolution API
    const evolutionUrl = `${evolutionApiUrl}/chat/findMessages/${instanceName}`;
    const params = new URLSearchParams();
    
    if (contactNumber) {
      // Formatar número no padrão WhatsApp
      const formattedNumber = contactNumber.replace(/\D/g, '');
      params.append("where", JSON.stringify({
        key: {
          remoteJid: `${formattedNumber}@s.whatsapp.net`
        }
      }));
    }
    
    params.append("limit", limit.toString());
    
    const fullUrl = `${evolutionUrl}?${params.toString()}`;
    console.log("[sync-messages] URL Evolution API:", fullUrl);

    const evolutionResponse = await fetch(fullUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "apikey": evolutionApiKey,
      },
    });

    if (!evolutionResponse.ok) {
      const errorText = await evolutionResponse.text();
      console.error("[sync-messages] Erro na Evolution API:", errorText);
      throw new Error(`Erro na Evolution API: ${evolutionResponse.status} ${evolutionResponse.statusText}`);
    }

    const evolutionMessages = await evolutionResponse.json();
    console.log("[sync-messages] Mensagens encontradas:", evolutionMessages.length);

    let processedCount = 0;
    let skippedCount = 0;

    // Processar mensagens do mais antigo para o mais recente
    const sortedMessages = evolutionMessages.sort((a: any, b: any) => {
      const timeA = a.messageTimestamp || 0;
      const timeB = b.messageTimestamp || 0;
      return timeA - timeB;
    });

    for (const msg of sortedMessages) {
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
        } else if (msg.message?.imageMessage?.caption) {
          messageText = `[Imagem] ${msg.message.imageMessage.caption}`;
        } else if (msg.message?.videoMessage?.caption) {
          messageText = `[Vídeo] ${msg.message.videoMessage.caption}`;
        } else if (msg.message?.documentMessage) {
          messageText = `[Documento] ${msg.message.documentMessage.fileName || 'Arquivo'}`;
        } else if (msg.message?.audioMessage) {
          messageText = '[Áudio]';
        } else {
          messageText = '[Mídia ou mensagem especial]';
        }

        // Verificar se a mensagem já existe
        const { data: existingMessage } = await supabase
          .from("messages")
          .select("id")
          .eq("attendance_id", attendanceId)
          .eq("content", messageText)
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Últimos 7 dias
          .maybeSingle();

        if (existingMessage) {
          skippedCount++;
          continue;
        }

        // Salvar mensagem
        const messageTimestamp = msg.messageTimestamp 
          ? new Date(msg.messageTimestamp * 1000).toISOString()
          : new Date().toISOString();

        const { error: messageInsertError } = await supabase
          .from("messages")
          .insert({
            attendance_id: attendanceId,
            content: messageText,
            sender_type: fromMe ? "agent" : "client",
            sender_id: null,
            created_at: messageTimestamp
          });

        if (messageInsertError) {
          console.error("[sync-messages] Erro ao salvar mensagem:", messageInsertError);
          skippedCount++;
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