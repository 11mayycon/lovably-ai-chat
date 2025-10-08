// Support Login - Public Edge Function
// Validates matricula and returns linked rooms bypassing RLS safely

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
    console.log("[support-login] Starting login process");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      console.error("[support-login] Missing environment variables");
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    console.log("[support-login] Supabase client created");

    const { matricula } = await req.json().catch(() => ({ matricula: undefined }));
    console.log("[support-login] Received matricula:", matricula);

    // Basic validation
    const code = typeof matricula === "string" ? matricula.trim().toUpperCase() : "";
    if (!code || code.length > 50) {
      console.log("[support-login] Invalid matricula format");
      return new Response(
        JSON.stringify({ success: false, error: "Matrícula inválida" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    console.log("[support-login] Looking for support user with matricula:", code);
    
    // Find active support user by matricula
    const { data: supportUser, error: userError } = await supabase
      .from("support_users")
      .select("*")
      .eq("matricula", code)
      .eq("is_active", true)
      .maybeSingle();

    if (userError) {
      console.error("[support-login] Error fetching support user:", userError);
      throw userError;
    }

    if (!supportUser) {
      console.log("[support-login] Support user not found or inactive");
      return new Response(
        JSON.stringify({ success: false, error: "Matrícula não encontrada ou usuário inativo" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    console.log("[support-login] Support user found:", supportUser.id);

    // Fetch rooms linked to this user
    const { data: rooms, error: roomsError } = await supabase
      .from("support_rooms")
      .select("*")
      .eq("support_user_id", supportUser.id)
      .order("created_at", { ascending: false });

    if (roomsError) {
      console.error("[support-login] Error fetching rooms:", roomsError);
      throw roomsError;
    }

    console.log("[support-login] Rooms found:", rooms?.length || 0);

    return new Response(
      JSON.stringify({ success: true, supportUser, rooms: rooms ?? [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    console.error("[support-login] Error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});