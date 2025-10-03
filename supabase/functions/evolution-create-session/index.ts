const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL') || 'https://evo.inovapro.cloud';
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY') || 'B6D711FCDE4D4FD5936544120E713976';
    const EVO_SESSION = Deno.env.get('EVO_SESSION') || 'isa25';

    const response = await fetch(
      `${EVO_BASE_URL}/api/instance/create`,
      {
        method: 'POST',
        headers: {
          'apikey': EVO_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: EVO_SESSION,
          qrcode: true,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Evolution API error: ${response.status}`);
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
