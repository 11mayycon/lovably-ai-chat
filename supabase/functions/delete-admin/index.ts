
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

    // 1. Verify requester is a super admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requester } } = await supabaseAdmin.auth.getUser(token);
    
    if (!requester) {
      throw new Error("Invalid token");
    }

    const { data: rolesData, error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requester.id);

    if (rolesError) {
      throw rolesError;
    }

    const isSuperAdmin = Array.isArray(rolesData) && rolesData.some((r: any) => r.role === 'super_admin');
    if (!isSuperAdmin) {
      throw new Error("Unauthorized: Super admin access required");
    }

    // 2. Get the user ID to delete from the request body
    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID to delete is required");
    }

    // 3. Delete the user from the auth schema
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      // Handle cases like user not found, etc.
      throw new Error(`Failed to delete user: ${deleteError.message}`);
    }

    // Note: Deletions in `subscriptions` and `user_roles` should be handled automatically 
    // by `ON DELETE CASCADE` in the database schema.

    return new Response(
      JSON.stringify({ success: true, message: "Administrator deleted successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error deleting admin:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
