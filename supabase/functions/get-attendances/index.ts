import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) throw new Error("Missing backend env");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { support_user_id } = await req.json();

    if (!support_user_id) {
      return new Response(
        JSON.stringify({ error: "support_user_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar salas do suporte
    const { data: rooms, error: roomsErr } = await supabase
      .from("support_rooms")
      .select("id")
      .eq("support_user_id", support_user_id);

    if (roomsErr) throw roomsErr;

    const roomIds = (rooms || []).map((r) => r.id);

    if (roomIds.length === 0) {
      return new Response(JSON.stringify({ success: true, attendances: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Buscar atendimentos das salas
    const { data: atts, error: attErr } = await supabase
      .from("attendances")
      .select("*, whatsapp_connections:whatsapp_connection_id(instance_name)")
      .in("room_id", roomIds)
      .in("status", ["active", "waiting"]) // relevantes para painel
      .order("updated_at", { ascending: false });

    if (attErr) throw attErr;

    return new Response(JSON.stringify({ success: true, attendances: atts || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[get-attendances] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});