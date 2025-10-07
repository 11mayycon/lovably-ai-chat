import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A UUID constant for our AI assistant to ensure it's always the same 'user'
const AI_ASSISTANT_USER_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use the correct, non-prefixed environment variables
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("PROJECT_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("As variáveis de ambiente PROJECT_URL e PROJECT_SERVICE_ROLE_KEY são obrigatórias.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Authenticate the user creating the room
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Cabeçalho de autorização não encontrado.");
    }
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Usuário inválido ou não autenticado para esta operação");

    const { name, support_user_id, description, max_members } = await req.json();

    if (!name || !support_user_id) {
      throw new Error("O nome da sala e o ID do usuário de suporte são obrigatórios.");
    }

    // Step 1: Create the new support room
    const { data: newRoom, error: roomError } = await supabaseAdmin
      .from("support_rooms")
      .insert({
        name,
        support_user_id,
        description,
        max_members: max_members || 10,
      })
      .select()
      .single();

    if (roomError) {
      console.error('Erro ao criar a sala:', roomError.message);
      throw new Error(`Falha ao criar a sala: ${roomError.message}`);
    }

    // Step 2: Automatically add the 'INOVAPRO AI' bot as a member
    const { error: memberError } = await supabaseAdmin
      .from("room_members")
      .insert({
        room_id: newRoom.id, 
        user_id: AI_ASSISTANT_USER_ID, // Fixed ID for the bot
        full_name: "INOVAPRO AI",
        is_bot: true, // Custom flag to identify the bot
        is_online: true, // The bot is always 'online'
      });

    if (memberError) {
      console.error('Alerta: A sala foi criada, mas falhou ao adicionar o bot AI:', memberError.message);
      // We don't throw an error here, as the room creation itself was successful.
      // The primary operation succeeded. We just log the warning.
    }

    // Return the created room data
    return new Response(JSON.stringify({ data: newRoom }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
