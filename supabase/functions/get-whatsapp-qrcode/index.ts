const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    let body;
    try {
      const text = await req.text()
      body = text ? JSON.parse(text) : {}
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Body da requisição inválido' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { instanceName } = body

    if (!instanceName) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'instanceName é obrigatório' 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
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
    console.log('QR code obtido:', { hasBase64: !!evolutionData?.base64, hasCode: !!evolutionData?.code })

    // Garantir que o base64 tenha o prefixo correto
    let base64Image = evolutionData?.base64 || '';
    if (base64Image && !base64Image.startsWith('data:image/')) {
      base64Image = `data:image/png;base64,${base64Image}`;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          base64: base64Image,
          code: evolutionData?.code || ''
        }
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
