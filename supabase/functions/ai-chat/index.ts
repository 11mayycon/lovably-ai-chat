import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = "AIzaSyCBSM4nLXIeoY6ukTW7LvkFWMonQcqZuqw";
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const transformHistory = (history: { sender: string, text: string }[]) => {
  const wellFormedHistory: { role: string, parts: { text: string }[] }[] = [];
  let lastRole = 'model';

  for (const message of history) {
    const currentRole = message.sender === 'user' ? 'user' : 'model';
    if (currentRole !== lastRole) {
      wellFormedHistory.push({
        role: currentRole,
        parts: [{ text: message.text }],
      });
      lastRole = currentRole;
    }
  }
  return wellFormedHistory;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query, history } = await req.json();

    if (!query) {
      throw new Error("A 'query' é obrigatória no corpo da requisição.");
    }

    const contents = transformHistory(history || []);
    contents.push({ role: 'user', parts: [{ text: query }] });

    const geminiPayload = {
      contents: contents,
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
        stopSequences: [],
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const response = await fetch(GEMINI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Erro na API do Gemini: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    let aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Não foi possível obter uma resposta da IA.";

    // Final Fix: Remove any unwanted prefixes learned from the poisoned history.
    if (aiResponse.startsWith("Gemini: ")) {
      aiResponse = aiResponse.substring(8);
    }
    if (aiResponse.startsWith("Eco: ")) {
      aiResponse = aiResponse.substring(5);
    }

    return new Response(
      JSON.stringify({ response: aiResponse.trim() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error) {
    console.error("Error in ai-chat function:", error.message);
    return new Response(
      JSON.stringify({ error: `Erro interno do servidor: ${error.message}` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
