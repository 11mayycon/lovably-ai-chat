const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { instanceName } = await req.json()

    if (!instanceName) {
      throw new Error('instanceName é obrigatório')
    }

    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL')
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY')

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      throw new Error('Credenciais da Evolution API não configuradas')
    }

    console.log('Buscando QR code para:', instanceName)

    const evolutionResponse = await fetch(`${EVO_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVO_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error('Erro da Evolution API:', errorData)
      throw new Error(`Erro ao buscar QR code: ${errorData}`)
    }

    const evolutionData = await evolutionResponse.json()
    console.log('QR code obtido com sucesso')

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: evolutionData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
