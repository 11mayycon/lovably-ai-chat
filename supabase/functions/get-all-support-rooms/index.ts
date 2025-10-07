import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("PROJECT_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("As variáveis de ambiente PROJECT_URL e PROJECT_SERVICE_ROLE_KEY são obrigatórias.");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Cabeçalho de autorização não encontrado.");
    }
    
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) {
      throw new Error("Usuário inválido ou não autenticado.");
    }

    // 1. Fetch all support rooms with their members
    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from("support_rooms")
      .select(`
          *,
          room_members (*)
        `)
      .order("created_at", { ascending: false });

    if (roomsError) {
      console.error('Error fetching support rooms:', roomsError.message);
      throw new Error(`Erro ao buscar salas: ${roomsError.message}`);
    }

    if (!roomsData || roomsData.length === 0) {
      return new Response(JSON.stringify({ rooms: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 2. Extract all unique support user IDs from the rooms
    const userIds = [...new Set(roomsData.map(room => room.support_user_id).filter(id => id))];

    // 3. Fetch the corresponding support users
    const usersMap = new Map();
    if (userIds.length > 0) {
        const { data: usersData, error: usersError } = await supabaseAdmin
            .from("support_users")
            .select("*")
            .in("id", userIds);

        if (usersError) {
            console.error('Error fetching support users:', usersError.message);
            throw new Error(`Erro ao buscar usuários de suporte: ${usersError.message}`);
        }
        
        if (usersData) {
            usersData.forEach(user => usersMap.set(user.id, user));
        }
    }

    // 4. Join the data in the application code
    const combinedData = roomsData.map(room => ({
        ...room,
        support_users: usersMap.get(room.support_user_id) || null
    }));

    return new Response(JSON.stringify({ rooms: combinedData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função get-all-support-rooms:', error.message);
    return new Response(JSON.stringify({ error: `Falha na função: ${error.message}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
