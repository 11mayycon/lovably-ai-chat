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
    const { attendance_id, support_user_id, content } = await req.json();

    if (!attendance_id || !support_user_id || typeof content !== "string" || !content.trim()) {
      return new Response(
        JSON.stringify({ error: "attendance_id, support_user_id e content são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify access: the attendance is owned by agent OR room belongs to the support user
    const { data: attendance, error: attErr } = await supabase
      .from("attendances")
      .select("id, agent_id, room_id, client_phone, whatsapp_connection_id")
      .eq("id", attendance_id)
      .maybeSingle();

    if (attErr) throw attErr;
    if (!attendance) {
      return new Response(
        JSON.stringify({ error: "Atendimento não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (attendance.agent_id !== support_user_id) {
      const { data: room, error: roomErr } = await supabase
        .from("support_rooms")
        .select("id")
        .eq("id", attendance.room_id)
        .eq("support_user_id", support_user_id)
        .maybeSingle();
      if (roomErr) throw roomErr;
      if (!room) {
        return new Response(
          JSON.stringify({ error: "Acesso negado ao atendimento" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const { error: insertError } = await supabase.from("messages").insert({
      attendance_id,
      sender_type: "agent",
      sender_id: support_user_id,
      content: content.trim().slice(0, 1000),
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[send-agent-message] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
