import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

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

    console.log('Verificando status para:', instanceName)

    const evolutionResponse = await fetch(`${EVO_BASE_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVO_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error('Erro da Evolution API:', errorData)
      throw new Error(`Erro ao verificar status: ${errorData}`)
    }

    const evolutionData = await evolutionResponse.json()
    console.log('Status obtido:', evolutionData)

    // Mapear status da Evolution API para nosso banco
    let status = 'disconnected'
    if (evolutionData.state === 'open') {
      status = 'connected'
    } else if (evolutionData.state === 'connecting') {
      status = 'connecting'
    }

    // Atualizar status no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: updateError } = await supabase
      .from('whatsapp_connections')
      .update({ 
        status,
        last_connection: status === 'connected' ? new Date().toISOString() : null
      })
      .eq('instance_name', instanceName)

    if (updateError) {
      console.error('Erro ao atualizar banco:', updateError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          ...evolutionData,
          status 
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
