// Webhook Handler - Recebe mensagens da Evolution API
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    console.log('🔔 Webhook recebido:', req.method, req.url);
    
    const body = await req.json();
    console.log('📥 Payload recebido:', JSON.stringify(body, null, 2));

    // Verificar se é um evento de mensagem
    if (body.event !== 'messages.upsert') {
      console.log('⚠️ Evento ignorado:', body.event);
      return new Response(
        JSON.stringify({ message: 'Evento ignorado', event: body.event }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // @ts-ignore
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    // @ts-ignore
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("❌ Variáveis de ambiente não configuradas");
      return new Response(
        JSON.stringify({ error: "Configuração do Supabase não encontrada" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    
    const messageData = body.data;
    if (!messageData) {
      console.log("❌ Dados da mensagem não encontrados");
      return new Response(
        JSON.stringify({ error: "Dados da mensagem não encontrados" }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Extrair informações da mensagem
    const remoteJid = messageData.key?.remoteJid;
    const fromMe = messageData.key?.fromMe || false;
    const messageId = messageData.key?.id;
    const instanceName = body.instance;
    
    // Extrair texto da mensagem
    let messageText = "";
    if (messageData.message?.conversation) {
      messageText = messageData.message.conversation;
    } else if (messageData.message?.extendedTextMessage?.text) {
      messageText = messageData.message.extendedTextMessage.text;
    }

    if (!messageText || !remoteJid) {
      console.log("⚠️ Mensagem sem texto ou remetente, ignorando");
      return new Response(
        JSON.stringify({ message: "Mensagem ignorada" }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Ignorar mensagens enviadas por nós
    if (fromMe) {
      console.log("⚠️ Mensagem enviada por nós, ignorando");
      return new Response(
        JSON.stringify({ message: "Mensagem própria ignorada" }),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("📱 Processando mensagem:", {
      remoteJid,
      messageText: messageText.substring(0, 50) + "...",
      instanceName
    });

    // Extrair número do telefone do remoteJid
    const phoneNumber = remoteJid.split('@')[0];
    
    // Verificar se já existe um atendimento ativo para este número
    let { data: existingAttendance, error: attendanceError } = await supabase
      .from('attendances')
      .select('id, client_name, client_phone')
      .eq('client_phone', phoneNumber)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (attendanceError && attendanceError.code !== 'PGRST116') {
      console.error("❌ Erro ao buscar atendimento:", attendanceError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar atendimento" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Se não existe atendimento ativo, criar um novo
    if (!existingAttendance) {
      const clientName = messageData.pushName || phoneNumber;
      
      const { data: newAttendance, error: createError } = await supabase
        .from('attendances')
        .insert({
          client_name: clientName,
          client_phone: phoneNumber,
          initial_message: messageText,
          status: 'waiting',
          assigned_to: 'ai',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) {
        console.error("❌ Erro ao criar atendimento:", createError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar atendimento" }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      existingAttendance = newAttendance;
      console.log("✅ Novo atendimento criado:", existingAttendance.client_name);
    }

    // Salvar a mensagem
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        attendance_id: existingAttendance.id,
        sender_type: 'client',
        content: messageText,
        created_at: new Date(messageData.messageTimestamp * 1000).toISOString()
      });

    if (messageError) {
      console.error("❌ Erro ao salvar mensagem:", messageError);
      return new Response(
        JSON.stringify({ error: "Erro ao salvar mensagem" }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log("✅ Mensagem salva com sucesso!");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Mensagem processada com sucesso",
        client: existingAttendance.client_name,
        text: messageText.substring(0, 100)
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("💥 Erro no webhook-handler:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error)
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});