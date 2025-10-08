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
    const { attendance_id, support_user_id } = await req.json();

    if (!attendance_id || !support_user_id) {
      return new Response(
        JSON.stringify({ error: "attendance_id e support_user_id são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify ownership
    const { data: att, error: attErr } = await supabase
      .from("attendances")
      .select("id, agent_id")
      .eq("id", attendance_id)
      .maybeSingle();
    if (attErr) throw attErr;
    if (!att || att.agent_id !== support_user_id) {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: msgs, error: msgsErr } = await supabase
      .from("messages")
      .select("*")
      .eq("attendance_id", attendance_id)
      .order("created_at", { ascending: true });

    if (msgsErr) throw msgsErr;

    return new Response(JSON.stringify({ success: true, messages: msgs || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error("[get-attendance-messages] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
