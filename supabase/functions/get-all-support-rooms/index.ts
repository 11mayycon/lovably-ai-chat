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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Usuário inválido ou não autenticado.");

    // 1. Buscar todas as salas com seus membros
    const { data: roomsData, error: roomsError } = await supabaseAdmin
      .from("support_rooms")
      .select(`
          *,
          room_members (*)
        `)
      .order("created_at", { ascending: false });

    if (roomsError) throw roomsError;

    // 2. Buscar todos os usuários de suporte
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from("support_users")
      .select("*");

    if (usersError) throw usersError;

    // 3. Combinar os dados em código (lógica mais segura)
    const usersMap = new Map(usersData.map(u => [u.id, u]));

    const roomsWithUsers = roomsData.map(room => ({
      ...room,
      support_users: usersMap.get(room.support_user_id) // Nome da propriedade que o frontend espera
    }));

    return new Response(JSON.stringify({ rooms: roomsWithUsers || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função get-all-support-rooms:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500, // Usar 500 para erro de servidor
    });
  }
});
