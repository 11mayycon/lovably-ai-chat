// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// A UUID constant for our AI assistant to ensure it's always the same 'user'
const AI_ASSISTANT_USER_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef";

declare const Deno: any;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Use the correct, non-prefixed environment variables
    const supabaseUrl = Deno.env.get("PROJECT_URL");
    const serviceKey = Deno.env.get("PROJECT_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(
        JSON.stringify({ error: "Variáveis de ambiente não configuradas" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Get all support rooms
    const { data: rooms, error: roomsError } = await supabase
      .from("support_rooms")
      .select("id, name");

    if (roomsError) {
      console.error("Erro ao buscar salas:", roomsError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar salas de suporte" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!rooms || rooms.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Nenhuma sala de suporte encontrada",
          processed: 0,
          added: 0,
          skipped: 0,
          errors: []
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each room
    for (const room of rooms) {
      try {
        // Check if AI assistant is already a member of this room
        const { data: existingMember, error: memberCheckError } = await supabase
          .from("room_members")
          .select("id")
          .eq("room_id", room.id)
          .eq("user_id", AI_ASSISTANT_USER_ID)
          .single();

        if (memberCheckError && memberCheckError.code !== "PGRST116") {
          console.error(`Erro ao verificar membro na sala ${room.name}:`, memberCheckError);
          errors.push(`Erro ao verificar membro na sala ${room.name}: ${memberCheckError.message}`);
          continue;
        }

        if (existingMember) {
          console.log(`INOVAPRO AI já é membro da sala ${room.name}`);
          skipped++;
          continue;
        }

        // Add AI assistant to the room (without foreign key constraint)
        const { error: insertError } = await supabase
          .from("room_members")
          .insert({
            room_id: room.id,
            user_id: AI_ASSISTANT_USER_ID,
            full_name: "INOVAPRO AI",
            is_bot: true,
            is_online: true,
            created_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error(`Erro ao adicionar AI na sala ${room.name}:`, insertError);
          errors.push(`Erro ao adicionar AI na sala ${room.name}: ${insertError.message}`);
        } else {
          console.log(`INOVAPRO AI adicionado com sucesso à sala ${room.name}`);
          added++;
        }
      } catch (error) {
        console.error(`Erro inesperado na sala ${room.name}:`, (error as Error).message);
        errors.push(`Erro inesperado na sala ${room.name}: ${(error as Error).message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Processamento concluído",
        processed: rooms.length,
        added,
        skipped,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Erro na função add-ai-to-existing-rooms:', (error as Error).message);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});