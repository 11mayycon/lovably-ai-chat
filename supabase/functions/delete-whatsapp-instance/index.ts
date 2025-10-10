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

    console.log('Deletando instância:', instanceName)

    // Deletar da Evolution API
    const evolutionResponse = await fetch(`${EVO_BASE_URL}/instance/delete/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVO_API_KEY,
      },
    })

    if (!evolutionResponse.ok) {
      const errorData = await evolutionResponse.text()
      console.error('Erro da Evolution API:', errorData)
      throw new Error(`Erro ao deletar instância: ${errorData}`)
    }

    console.log('Instância deletada da Evolution API')

    // Deletar do banco de dados
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { error: deleteError } = await supabase
      .from('whatsapp_connections')
      .delete()
      .eq('instance_name', instanceName)

    if (deleteError) {
      console.error('Erro ao deletar do banco:', deleteError)
      throw deleteError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Instância deletada com sucesso' 
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
