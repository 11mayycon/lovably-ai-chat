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
    const { instanceName } = await req.json()

    if (!instanceName) {
      throw new Error('instanceName é obrigatório')
    }

    const EVO_BASE_URL = Deno.env.get('EVO_BASE_URL')
    const EVO_API_KEY = Deno.env.get('EVO_API_KEY')

    if (!EVO_BASE_URL || !EVO_API_KEY) {
      throw new Error('Credenciais da Evolution API não configuradas')
    }

    console.log('Criando instância:', instanceName)

    // Criar instância na Evolution API
    const evolutionResponse = await fetch(`${EVO_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVO_API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        token: EVO_API_KEY,
      }),
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error('Erro da Evolution API:', errorData)
      throw new Error(`Erro ao criar instância: ${errorData}`)
    }

    const evolutionData = await evolutionResponse.json()
    console.log('Instância criada com sucesso:', evolutionData)

    // Salvar no banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Não autorizado')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      throw new Error('Não autorizado')
    }

    const { error: insertError } = await supabase
      .from('whatsapp_connections')
      .insert({
        instance_name: instanceName,
        status: 'connecting',
        admin_user_id: user.id,
      })

    if (insertError) {
      console.error('Erro ao salvar no banco:', insertError)
      throw insertError
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: evolutionData,
        instanceName 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Erro:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
