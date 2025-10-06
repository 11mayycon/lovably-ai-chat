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
      { auth: { persistSession: false } } // Adicionado para evitar warnings
    );

    const authHeader = req.headers.get("Authorization")!;
    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
    if (!user) throw new Error("Usuário inválido ou não autenticado para esta operação");

    const { name, support_user_id, description, max_members } = await req.json();

    // Validação dos dados recebidos
    if (!name || !support_user_id) {
      throw new Error("O nome da sala e o ID do usuário de suporte são obrigatórios.");
    }

    const { data: newRoom, error } = await supabaseAdmin
      .from("support_rooms")
      .insert({
        name,
        support_user_id,
        description,
        max_members: max_members || 10, // Valor padrão
      })
      .select()
      .single();

    if (error) {
      console.error('Erro na função create-support-room:', error);
      throw error;
    }

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
