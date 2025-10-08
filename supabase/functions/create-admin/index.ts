import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify requester is super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester } } = await supabaseAdmin.auth.getUser(token);
    
    if (!requester) {
      throw new Error("Invalid token");
    }

    // Check if requester is super admin (handles multiple roles)
    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id);

    if (rolesError) {
      throw rolesError;
    }

    const hasSuperAdmin = Array.isArray(rolesData) && rolesData.some((r: any) => r.role === "super_admin");
    if (!hasSuperAdmin) {
      throw new Error("Unauthorized - Super admin access required");
    }

    const { full_name, email, password, role, planName, days } = await req.json();

    // Create user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name },
    });

    if (authError) throw authError;

    // Add role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: authData.user.id,
        role: role,
      });

    // Optionally create a subscription for the new admin
    if (planName || days) {
      const duration = Number(days) || 0;
      const expiresAt = duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : null;

      const { error: subError } = await supabaseAdmin
        .from("subscriptions")
        .insert({
          user_id: authData.user.id,
          email,
          full_name: full_name, // Adicionado o nome completo
          status: duration > 0 ? "active" : "pending",
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          plan_name: planName || null,
          duration_days: duration || null,
        });

      if (subError) throw subError;
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});