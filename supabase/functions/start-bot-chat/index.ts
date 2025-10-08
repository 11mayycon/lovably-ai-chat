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
    const { room_id, support_user_id, support_user_name } = await req.json();

    if (!room_id || !support_user_id) {
      return new Response(
        JSON.stringify({ error: "room_id e support_user_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1) Try find existing bot chat
    const { data: existing, error: findError } = await supabase
      .from("attendances")
      .select("*")
      .eq("room_id", room_id)
      .eq("agent_id", support_user_id)
      .eq("client_phone", "bot_chat")
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (findError) throw findError;

    if (existing) {
      return new Response(
        JSON.stringify({ success: true, attendance: existing }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // 2) Create new attendance for bot chat
    const insertPayload = {
      room_id,
      agent_id: support_user_id,
      client_name: support_user_name || "Assistente IA",
      client_phone: "bot_chat",
      status: "in_progress",
      assigned_to: "ai",
      started_at: new Date().toISOString(),
    } as const;

    const { data: created, error: insertError } = await supabase
      .from("attendances")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({ success: true, attendance: created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("[start-bot-chat] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
