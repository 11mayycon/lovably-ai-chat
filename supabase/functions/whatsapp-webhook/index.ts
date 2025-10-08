// supabase/functions/whatsapp-webhook/index.ts
// Recebe mensagens do WhatsApp via Evolution API e salva no banco

// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    // @ts-ignore
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const webhookData = await req.json();

    console.log('📥 Webhook recebido:', JSON.stringify(webhookData, null, 2));

    // Processar diferentes tipos de eventos
    const event = webhookData.event;
    const instance = webhookData.instance;
    const data = webhookData.data;

    // Processar apenas mensagens recebidas
    if (event === 'messages.upsert' && data?.key?.fromMe === false) {
      const remoteJid = data.key.remoteJid;
      const messageText = data.message?.conversation || 
                         data.message?.extendedTextMessage?.text || 
                         '[Mídia ou mensagem especial]';
      
      console.log('📨 Nova mensagem de:', remoteJid);
      console.log('💬 Conteúdo:', messageText);

      // Extrair número do telefone (remover @s.whatsapp.net)
      const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
      
      // Nome do contato (se disponível)
      const contactName = data.pushName || phoneNumber;

      // Buscar ou criar atendimento
      let { data: attendance, error: attendanceError } = await supabase
        .from('attendances')
        .select('*')
        .eq('client_phone', phoneNumber)
        .eq('status', 'active')
        .maybeSingle();

      if (attendanceError) {
        console.error('❌ Erro ao buscar atendimento:', attendanceError);
        throw attendanceError;
      }

      // Se não existe atendimento ativo, criar um novo
      if (!attendance) {
        console.log('🆕 Criando novo atendimento para:', contactName);
        
        // Buscar conexão WhatsApp pelo instance name
        const { data: whatsappConnection } = await supabase
          .from('whatsapp_connections')
          .select('id, support_room_id')
          .eq('instance_name', instance)
          .eq('status', 'connected')
          .maybeSingle();

        const { data: newAttendance, error: createError } = await supabase
          .from('attendances')
          .insert({
            client_name: contactName,
            client_phone: phoneNumber,
            status: 'active',
            assigned_to: 'waiting',
            initial_message: messageText,
            whatsapp_connection_id: whatsappConnection?.id,
            room_id: whatsappConnection?.support_room_id,
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Erro ao criar atendimento:', createError);
          throw createError;
        }

        attendance = newAttendance;
        console.log('✅ Atendimento criado:', attendance.id);
      }

      // Salvar mensagem
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          attendance_id: attendance.id,
          content: messageText,
          sender_type: 'client',
          sender_id: null,
        });

      if (messageError) {
        console.error('❌ Erro ao salvar mensagem:', messageError);
        throw messageError;
      }

      console.log('✅ Mensagem salva com sucesso!');

      return new Response(
        JSON.stringify({ success: true, message: 'Mensagem processada' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Processar eventos de conexão
    if (event === 'connection.update') {
      console.log('🔌 Status de conexão:', data);
      
      // Atualizar status da conexão no banco
      if (data.state) {
        await supabase
          .from('whatsapp_connections')
          .update({
            status: data.state === 'open' ? 'connected' : 'disconnected',
            last_connection: new Date().toISOString(),
          })
          .eq('instance_name', instance);
      }
    }

    return new Response(
      JSON.stringify({ success: true, event }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('💥 Erro no webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
